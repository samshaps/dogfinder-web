import os
import sys
import time
import html
import smtplib
from email.message import EmailMessage
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import requests
from typing import List, Dict, Any, Optional, Tuple
import time as _time

# --------------------
# Config & constants
# --------------------
load_dotenv()

PETFINDER_CLIENT_ID = os.getenv("PETFINDER_CLIENT_ID", "").strip()
PETFINDER_CLIENT_SECRET = os.getenv("PETFINDER_CLIENT_SECRET", "").strip()

SMTP_HOST = os.getenv("SMTP_HOST", "").strip()
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "").strip()
SMTP_PASS = os.getenv("SMTP_PASS", "").strip()
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_USER).strip()
SENDER_NAME = os.getenv("SENDER_NAME", "Dog Digest").strip()
RECIPIENTS = [r.strip() for r in os.getenv("RECIPIENTS", "adriennedanaross@gmail.com,hi@samshap.com").split(",") if r.strip()]

DEFAULT_ZIPS = ["08401", "11211", "19003"]
ZIP_CODES = [z.strip() for z in os.getenv("ZIP_CODES", "").split(",") if z.strip()] or DEFAULT_ZIPS
DISTANCE_MILES = int(os.getenv("DISTANCE_MILES", "100"))

# Breed exclusions (case-insensitive substring match)
EXCLUDED_BREEDS = {
    "Husky",
    "Coonhound",
    "Pit Bull",
    "Jack Russell Terrier",
    "German Shepherd",
    "Carolina Dog Mix",
    "Bull Terrier",
    "Chihuahua",
    "Rhodesian Ridgeback",
    "Rottweiler",
    "English Bulldog",
    "American Staffordshire Terrier",
}

PETFINDER_TOKEN_URL = "https://api.petfinder.com/v2/oauth2/token"
PETFINDER_ANIMALS_URL = "https://api.petfinder.com/v2/animals"
PETFINDER_ANIMAL_DETAIL_URL = "https://api.petfinder.com/v2/animals/{id}"
PETFINDER_ORGANIZATION_URL = "https://api.petfinder.com/v2/organizations/{id}"

# Only consider last 24h
NOW_UTC = datetime.now(timezone.utc)
CUTOFF_UTC = NOW_UTC - timedelta(hours=24)

# --------------------
# Utilities
# --------------------
def get_token() -> str:
    resp = requests.post(
        PETFINDER_TOKEN_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": PETFINDER_CLIENT_ID,
            "client_secret": PETFINDER_CLIENT_SECRET,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]

def safe_lower(s):
    return s.lower() if isinstance(s, str) else ""

def breed_excluded(breeds_obj: dict) -> bool:
    # Check primary, secondary, mixed/unknown strings for excluded substrings
    names = []
    if isinstance(breeds_obj, dict):
        for key in ("primary", "secondary"):
            val = breeds_obj.get(key)
            if isinstance(val, str) and val.strip():
                names.append(val.strip())
        # Some entries may have "mixed" flags without explicit names; nothing to check there.
    text = " ".join(names)
    low = text.lower()
    for banned in EXCLUDED_BREEDS:
        if banned.lower() in low:
            return True
    return False

def parse_dt(dt_str: str):
    # Petfinder returns ISO8601 with timezone, e.g. "2025-09-18T04:25:04+00:00"
    try:
        return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
    except Exception:
        return None

def within_24_hours(published_at_str: str) -> bool:
    dt = parse_dt(published_at_str)
    return bool(dt and dt >= CUTOFF_UTC)

def collect_animals_for_zip(session, token: str, zip_code: str):
    results = []
    page = 1
    headers = {"Authorization": f"Bearer {token}"}
    # We’ll paginate until no results or oldest page is beyond cutoff
    while True:
        params = {
            "type": "dog",
            "status": "adoptable",
            "location": zip_code,
            "distance": DISTANCE_MILES,
            "age": "baby,young",
            "sort": "recent",       # most recent published first
            "limit": "100",
            "page": str(page),
        }
        r = session.get(PETFINDER_ANIMALS_URL, headers=headers, params=params, timeout=30)
        r.raise_for_status()
        payload = r.json()
        animals = payload.get("animals", []) or []
        if not animals:
            break

        # If the last animal on the page is older than cutoff, we still need to scan current page fully,
        # but can break after this page.
        last_published = parse_dt(animals[-1].get("published_at", "")) if animals else None
        results.extend(animals)

        pagination = payload.get("pagination") or {}
        total_pages = pagination.get("total_pages") or page
        if page >= total_pages:
            break
        if last_published and last_published < CUTOFF_UTC:
            # Older than 24h; next pages will be even older
            break

        page += 1
        time.sleep(0.3)  # be polite to API
    return results

# -------- New, more flexible collectors for API endpoints --------
def collect_animals_for_zip_filtered(session, token: str, zip_code: str, distance_miles: int, ages_csv: str):
    results = []
    page = 1
    headers = {"Authorization": f"Bearer {token}"}
    while True:
        params = {
            "type": "dog",
            "status": "adoptable",
            "location": zip_code,
            "distance": distance_miles,
            "age": ages_csv or "baby,young",
            "sort": "recent",
            "limit": "100",
            "page": str(page),
        }
        r = session.get(PETFINDER_ANIMALS_URL, headers=headers, params=params, timeout=30)
        r.raise_for_status()
        payload = r.json()
        animals = payload.get("animals", []) or []
        if not animals:
            break
        last_published = parse_dt(animals[-1].get("published_at", "")) if animals else None
        results.extend(animals)
        pagination = payload.get("pagination") or {}
        total_pages = pagination.get("total_pages") or page
        if page >= total_pages:
            break
        if last_published and last_published < CUTOFF_UTC:
            break
        page += 1
        time.sleep(0.3)
    return results

def create_dog_fingerprint(dog: Dict[str, Any]) -> str:
    """Create a unique fingerprint for a dog to identify duplicates."""
    # Use multiple fields to create a unique identifier
    name = (dog.get("name") or "").strip().lower()
    primary_breed = (dog.get("breeds", {}).get("primary") or "").strip().lower()
    secondary_breed = (dog.get("breeds", {}).get("secondary") or "").strip().lower()
    age = (dog.get("age") or "").strip().lower()
    size = (dog.get("size") or "").strip().lower()
    gender = (dog.get("gender") or "").strip().lower()
    
    # Create a fingerprint from key identifying characteristics
    fingerprint_parts = [
        name,
        primary_breed,
        secondary_breed,
        age,
        size,
        gender
    ]
    
    # Join with a separator that's unlikely to appear in the data
    return "|||".join(fingerprint_parts)

def get_organization_by_id(organization_id: str, token: str) -> Optional[Dict[str, Any]]:
    """Fetch organization details from Petfinder API with caching."""
    # Check cache first
    cache_key = f"org:{organization_id}"
    now = _time.time()
    entry = _ORG_CACHE.get(cache_key)
    if entry:
        exp, val = entry
        if exp > now:
            return val
        else:
            _ORG_CACHE.pop(cache_key, None)
    
    # Fetch from API
    headers = {"Authorization": f"Bearer {token}"}
    url = PETFINDER_ORGANIZATION_URL.format(id=organization_id)
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 404:
            return None
        r.raise_for_status()
        data = r.json() or {}
        org_data = data.get("organization")
        
        # Cache the result for 1 hour
        if org_data:
            _ORG_CACHE[cache_key] = (now + 3600, org_data)
        
        return org_data
    except Exception as e:
        print(f"Error fetching organization {organization_id}: {e}")
        return None

def extract_organization_info(animal: Dict[str, Any], token: str) -> Dict[str, Any]:
    """Extract organization information from animal data for frontend compatibility."""
    contact = animal.get("contact", {}) or {}
    organization_id = animal.get("organization_id")
    
    # Try to get actual organization data from API
    if organization_id:
        org_data = get_organization_by_id(organization_id, token)
        if org_data:
            return {
                "name": org_data.get("name", "Unknown Shelter"),
                "email": org_data.get("email", contact.get("email", "")),
                "phone": org_data.get("phone", contact.get("phone", ""))
            }
    
    # Fallback to contact-based extraction if API call fails
    address = contact.get("address", {}) or {}
    city = address.get("city", "")
    state = address.get("state", "")
    email = contact.get("email", "")
    
    # Create organization name from location and email domain
    org_name = "Unknown Shelter"
    if city and state:
        # Try to extract organization name from email domain
        if email and "@" in email:
            domain = email.split("@")[1]
            # Remove common domain suffixes and use as organization name
            org_name = domain.replace(".org", "").replace(".com", "").replace(".net", "")
            # Capitalize and clean up
            org_name = " ".join(word.capitalize() for word in org_name.replace(".", " ").replace("-", " ").split())
            if not org_name:
                org_name = f"Shelter in {city}, {state}"
        else:
            org_name = f"Shelter in {city}, {state}"
    elif email and "@" in email:
        domain = email.split("@")[1]
        org_name = domain.replace(".org", "").replace(".com", "").replace(".net", "")
        org_name = " ".join(word.capitalize() for word in org_name.replace(".", " ").replace("-", " ").split())
    
    return {
        "name": org_name,
        "email": email,
        "phone": contact.get("phone", "")
    }

def search_animals(
    zips: List[str],
    distance_miles: int,
    ages_csv: str,
    include_breeds: List[str],
    exclude_breeds: List[str],
    sizes: List[str],
    page: int,
    page_size: int,
    sort: str,
) -> Dict[str, Any]:
    # Check rate limit before making API calls
    if not check_rate_limit("search", max_requests=5, window_seconds=60):
        raise Exception("Rate limit exceeded. Please try again in a minute.")
    
    token = get_token()
    all_animals: Dict[Any, Dict[str, Any]] = {}
    seen_fingerprints: set = set()
    
    with requests.Session() as session:
        for z in zips:
            animals = collect_animals_for_zip_filtered(session, token, z, distance_miles, ages_csv)
            for a in animals:
                if not within_24_hours(a.get("published_at", "")):
                    continue
                # Apply breed exclusion rules (global) first
                if breed_excluded(a.get("breeds", {}) or {}):
                    continue
                
                # Create fingerprint for de-duplication
                fingerprint = create_dog_fingerprint(a)
                if fingerprint in seen_fingerprints:
                    continue
                
                # Also check by ID as backup
                aid = a.get("id")
                if aid is None or aid in all_animals:
                    continue
                
                # Add organization information for frontend compatibility
                a["organization"] = extract_organization_info(a, token)
                
                # Add to both tracking systems
                all_animals[aid] = a
                seen_fingerprints.add(fingerprint)

    def matches_filters(a: Dict[str, Any]) -> bool:
        # size filter
        if sizes:
            if (a.get("size") or "").lower() not in {s.lower() for s in sizes}:
                return False
        # Include breeds
        if include_breeds:
            names = []
            b = a.get("breeds") or {}
            for k in ("primary", "secondary"):
                v = b.get(k)
                if isinstance(v, str) and v.strip():
                    names.append(v.strip().lower())
            if not any(inc.lower() in " ".join(names) for inc in include_breeds):
                return False
        # Exclude breeds
        if exclude_breeds:
            names_text = " ".join([
                (a.get("breeds") or {}).get("primary") or "",
                (a.get("breeds") or {}).get("secondary") or "",
            ]).lower()
            for ex in exclude_breeds:
                if ex.lower() in names_text:
                    return False
        return True

    filtered = [a for a in all_animals.values() if matches_filters(a)]

    # Sorting
    if sort == "distance":
        filtered.sort(key=lambda x: (x.get("distance") or 0))
    else:
        # default freshness (published_at desc)
        filtered.sort(
            key=lambda x: parse_dt(x.get("published_at", "")) or datetime.fromtimestamp(0, tz=timezone.utc),
            reverse=True,
        )

    total = len(filtered)
    start = max((page - 1) * page_size, 0)
    end = start + page_size
    items = filtered[start:end]
    return {"items": items, "page": page, "pageSize": page_size, "total": total}

def get_animal_by_id(animal_id: str) -> Optional[Dict[str, Any]]:
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    url = PETFINDER_ANIMAL_DETAIL_URL.format(id=animal_id)
    r = requests.get(url, headers=headers, timeout=30)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    data = r.json() or {}
    return data.get("animal")

# -------- Simple in-memory TTL cache --------
_CACHE: Dict[str, Tuple[float, Any]] = {}
_ORG_CACHE: Dict[str, Tuple[float, Any]] = {}  # Cache for organization data
_RATE_LIMIT: Dict[str, float] = {}  # Simple rate limiting

def cache_get(key: str):
    now = _time.time()
    entry = _CACHE.get(key)
    if not entry:
        return None
    exp, val = entry
    if exp < now:
        _CACHE.pop(key, None)
        return None
    return val

def cache_set(key: str, val: Any, ttl_seconds: int = 600):  # Increased to 10 minutes
    _CACHE[key] = (_time.time() + ttl_seconds, val)

def check_rate_limit(identifier: str = "global", max_requests: int = 10, window_seconds: int = 60) -> bool:
    """Simple rate limiter - returns True if request is allowed, False if rate limited"""
    global _RATE_LIMIT
    now = _time.time()
    key = f"rate:{identifier}"
    
    # Clean old entries
    cutoff = now - window_seconds
    _RATE_LIMIT = {k: v for k, v in _RATE_LIMIT.items() if v > cutoff}
    
    # Count requests in window
    recent_requests = [v for v in _RATE_LIMIT.values() if v > cutoff]
    
    if len(recent_requests) >= max_requests:
        return False
    
    # Record this request
    _RATE_LIMIT[f"{key}:{now}"] = now
    return True

def fetch_all_animals():
    token = get_token()
    all_animals = {}
    seen_fingerprints: set = set()
    
    with requests.Session() as session:
        for z in ZIP_CODES:
            animals = collect_animals_for_zip(session, token, z)
            for a in animals:
                # Filter by published within 24h immediately
                if not within_24_hours(a.get("published_at", "")):
                    continue
                # Exclude breeds per rules
                if breed_excluded(a.get("breeds", {}) or {}):
                    continue
                
                # Create fingerprint for de-duplication
                fingerprint = create_dog_fingerprint(a)
                if fingerprint in seen_fingerprints:
                    continue
                
                # Also check by ID as backup
                aid = a.get("id")
                if aid is not None and aid not in all_animals:
                    # Add organization information for frontend compatibility
                    a["organization"] = extract_organization_info(a, token)
                    all_animals[aid] = a
                    seen_fingerprints.add(fingerprint)
    # Sort by published_at desc
    sorted_animals = sorted(
        all_animals.values(),
        key=lambda x: parse_dt(x.get("published_at", "")) or datetime.fromtimestamp(0, tz=timezone.utc),
        reverse=True,
    )
    return sorted_animals

def build_html_table(animals):
    # Headers required by spec
    headers = [
        "Name",
        "Size",
        "Breeds",
        "Age",
        "Gender",
        "Description",
        "Videos",
        "Contact Email",
        "Contact Phone",
        "Published At",
        "URL",
    ]

    def join_breeds(b):
        parts = []
        if isinstance(b, dict):
            for k in ("primary", "secondary"):
                v = b.get(k)
                if isinstance(v, str) and v.strip():
                    parts.append(v.strip())
            # Mixed breeds might be indicated by boolean flags; names already captured above.
        return ", ".join(parts) if parts else ""

    rows_html = []
    for a in animals:
        name = a.get("name", "")
        size = a.get("size", "")
        breeds = join_breeds(a.get("breeds", {}) or {})
        age = a.get("age", "")
        gender = a.get("gender", "")
        desc = a.get("description", "") or ""
        # Tidy description to a reasonable size; HTML-escape
        desc = html.escape(" ".join(desc.split()))[:600]

        # Videos: Petfinder uses array; elements may have "embed" or "url"
        vids = a.get("videos", []) or []
        video_links = []
        for v in vids:
            url = None
            if isinstance(v, dict):
                url = v.get("url") or v.get("embed")
            elif isinstance(v, str):
                url = v
            if url:
                esc = html.escape(url)
                video_links.append(f'<a href="{esc}">video</a>')
        videos_cell = ", ".join(video_links)

        contact = a.get("contact", {}) or {}
        contact_email = contact.get("email", "") or ""
        contact_phone = contact.get("phone", "") or ""

        pub = parse_dt(a.get("published_at", "")) or None
        # Display in US Eastern (New York); keep explicit timezone in string
        try:
            # Python 3.9+ zoneinfo alternative without external deps:
            # GitHub runners default to UTC; just show ISO string w/ offset from API (already TZ-aware).
            published_at_str = pub.astimezone(timezone.utc).isoformat() if pub else ""
        except Exception:
            published_at_str = a.get("published_at", "")

        url = a.get("url", "") or ""

        cells = [
            html.escape(name),
            html.escape(size or ""),
            html.escape(breeds or ""),
            html.escape(age or ""),
            html.escape(gender or ""),
            desc,
            videos_cell,
            html.escape(contact_email),
            html.escape(contact_phone),
            html.escape(published_at_str),
            f'<a href="{html.escape(url)}">Link</a>' if url else "",
        ]
        row = "<tr>" + "".join(f"<td>{c}</td>" for c in cells) + "</tr>"
        rows_html.append(row)

    table = f"""
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.3; width:100%;">
      <thead style="background:#f5f5f5;">
        <tr>{"".join(f"<th style='text-align:left;'>{h}</th>" for h in headers)}</tr>
      </thead>
      <tbody>
        {''.join(rows_html) if rows_html else '<tr><td colspan="11">No matching dogs in the last 24 hours.</td></tr>'}
      </tbody>
    </table>
    """
    return table

def send_email(subject: str, html_body: str):
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
    msg["To"] = ", ".join(RECIPIENTS)

    # Plain text fallback
    msg.set_content("Your email client does not support HTML. Please open in an HTML-capable email client.")
    msg.add_alternative(html_body, subtype="html")

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)

def main():
    # Basic validations
    missing = []
    for k, v in [
        ("PETFINDER_CLIENT_ID", PETFINDER_CLIENT_ID),
        ("PETFINDER_CLIENT_SECRET", PETFINDER_CLIENT_SECRET),
        ("SMTP_HOST", SMTP_HOST),
        ("SMTP_PORT", SMTP_PORT),
        ("SMTP_USER", SMTP_USER),
        ("SMTP_PASS", SMTP_PASS),
        ("SENDER_EMAIL", SENDER_EMAIL),
    ]:
        if not v:
            missing.append(k)
    if missing:
        print(f"Missing required configuration: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)

    animals = fetch_all_animals()
    html_table = build_html_table(animals)
    subject = f"Dog Digest: {len(animals)} matches in last 24h (run @ {NOW_UTC.isoformat()})"
    send_email(subject, f"<div>{html_table}</div>")
    print(f"Sent digest with {len(animals)} dogs to: {', '.join(RECIPIENTS)}")

if __name__ == "__main__":
    main()
