#!/usr/bin/env python3
"""
Keyword research for DogYenta paid search and SEO, using only free sources:

  * Google and Bing autocomplete  -> real query expansions + relevance ordering
  * Google Trends (pytrends)      -> relative demand, seasonality, interest by state
  * Wikimedia pageviews           -> breed-level demand proxy (12 months of article views)
  * RescueGroups (optional)       -> listing supply per breed / city when RESCUEGROUPS_API_KEY is set

Outputs (docs/ads/research/):
  keywords-scored.csv        every discovered keyword with intent, signals, score, recommendation
  negatives-discovered.csv   queries to exclude (sale, breeder, competitor brands, off-topic)
  content-ideas.csv          informational queries worth answering on breed/city pages
  breed-priority.csv         breeds ranked by demand (and supply when available)
  city-priority.csv          catalog cities ranked by state-level adoption interest
  seasonality.csv            monthly interest index for head terms
  REPORT.md                  human summary

With --write-import-files it also regenerates docs/ads/keywords.csv and
docs/ads/negative-keywords.csv (Google Ads Editor format) from the scored data.

Run:  python3 scripts/keyword-research/research.py [--quick] [--write-import-files]
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import time
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
FRONTEND = ROOT / "frontend"
OUT = ROOT / "docs" / "ads" / "research"
ADS = ROOT / "docs" / "ads"
CACHE = Path(os.environ.get("KEYWORD_RESEARCH_CACHE", ROOT / ".cache" / "keyword-research"))
SITE = "https://dogyenta.com"
UA = "DogYentaKeywordResearch/1.0 (https://dogyenta.com)"
ANCHOR = "adopt a dog"  # every Trends batch includes this so indices are comparable

# --------------------------------------------------------------------------- catalogs


def load_breeds() -> list[dict]:
    text = (FRONTEND / "lib" / "seo" / "breeds.ts").read_text()
    out = []
    for m in re.finditer(
        r"\{\s*slug: '([^']+)',\s*name: '([^']+)',\s*plural: '([^']+)',(.*?)popular: (true|false),",
        text,
        re.S,
    ):
        out.append(
            {"slug": m.group(1), "name": m.group(2), "plural": m.group(3), "popular": m.group(5) == "true"}
        )
    return out


def load_cities() -> list[dict]:
    text = (FRONTEND / "lib" / "seo" / "cities.ts").read_text()
    out = []
    for m in re.finditer(
        r"slug: '([^']+)', city: '([^']+)', state: '([A-Z]{2})', stateName: '([^']+)', zip: '(\d{5})', major: (true|false)",
        text,
    ):
        out.append(
            {
                "slug": m.group(1),
                "city": m.group(2),
                "state": m.group(3),
                "stateName": m.group(4),
                "zip": m.group(5),
                "major": m.group(6) == "true",
            }
        )
    return out


# Wikipedia article titles where they differ from the catalog name.
WIKI_TITLES = {
    "Pit Bull Terrier": "American_Pit_Bull_Terrier",
    "Siberian Husky": "Siberian_Husky",
    "Mixed Breed": "Mongrel",
    "Shepherd Mix": None,
    "Hound": "Hound",
    "Terrier Mix": "Terrier",
    "English Bulldog": "Bulldog",
    "Corgi": "Pembroke_Welsh_Corgi",
    "Schnauzer": "Miniature_Schnauzer",
    "Collie": "Rough_Collie",
    "Doberman Pinscher": "Dobermann",
    "Mastiff": "English_Mastiff",
    "Saint Bernard": "St._Bernard_(dog)",
    "Belgian Malinois": "Malinois_dog",
    "Maltese": "Maltese_dog",
    "Pomeranian": "Pomeranian_dog",
    "Akita": "Akita_(dog)",
    "Dalmatian": "Dalmatian_dog",
    "Havanese": "Havanese_dog",
    "Boxer": "Boxer_(dog)",
    "Chihuahua": "Chihuahua_(dog)",
    "Shar-Pei": "Shar_Pei",
    "German Shepherd": "German_Shepherd",
}

# --------------------------------------------------------------------------- helpers


def cache_get(key: str):
    p = CACHE / (re.sub(r"[^a-z0-9]+", "-", key.lower()) + ".json")
    if p.exists() and time.time() - p.stat().st_mtime < 7 * 86400:
        return json.loads(p.read_text())
    return None


def cache_put(key: str, value) -> None:
    CACHE.mkdir(parents=True, exist_ok=True)
    p = CACHE / (re.sub(r"[^a-z0-9]+", "-", key.lower()) + ".json")
    p.write_text(json.dumps(value))


def http_json(url: str, params: dict, sleep: float = 0.35):
    for attempt in range(3):
        try:
            r = requests.get(url, params=params, headers={"User-Agent": UA}, timeout=20)
            if r.status_code == 429:
                time.sleep(10 * (attempt + 1))
                continue
            r.raise_for_status()
            time.sleep(sleep)
            return r.json()
        except (requests.RequestException, ValueError):
            time.sleep(2 * (attempt + 1))
    return None


# --------------------------------------------------------------------------- autocomplete


def google_suggest(q: str) -> list[tuple[str, int]]:
    key = f"g:{q}"
    cached = cache_get(key)
    if cached is not None:
        return [tuple(x) for x in cached]
    data = http_json(
        "https://suggestqueries.google.com/complete/search",
        {"client": "chrome", "hl": "en", "gl": "us", "q": q},
    )
    out: list[tuple[str, int]] = []
    if data and len(data) > 1:
        rel = (data[4] or {}).get("google:suggestrelevance", []) if len(data) > 4 else []
        for i, s in enumerate(data[1]):
            out.append((s.lower().strip(), int(rel[i]) if i < len(rel) else 0))
    cache_put(key, out)
    return out


def bing_suggest(q: str) -> list[str]:
    key = f"b:{q}"
    cached = cache_get(key)
    if cached is not None:
        return cached
    data = http_json("https://api.bing.com/osjson.aspx", {"query": q, "market": "en-US"})
    out = [s.lower().strip() for s in (data[1] if data and len(data) > 1 else [])]
    cache_put(key, out)
    return out


# --------------------------------------------------------------------------- intent

NEGATIVE_RE = re.compile(
    r"\b(for sale|sale|breeder|breeders|price|prices|pricing|cost|costs|buy|purchase|akc|stud|kennel|kennels|"
    r"craigslist|marketplace|free puppies|free dogs|cheap|\$|near me cheap|uk|canada|australia|ireland|"
    r"india|philippines|singapore|dubai|london|ontario|toronto|vancouver|sydney|melbourne)\b"
)
COMPETITOR_RE = re.compile(
    r"\b(petfinder|adoptapet|adopt a pet|aspca|humane society|spca|rescue me|petsmart|petco|"
    r"best friends|north shore animal league|dogs trust|rspca|battersea)\b"
)
INFO_RE = re.compile(
    r"^(how|what|why|is|are|can|do|does|should|best|vs|versus|when)\b|"
    r"\b(temperament|lifespan|life span|life expectancy|size|weight|shed|shedding|hypoallergenic|good with|"
    r"pros and cons|names|meaning|facts|personality|characteristics|requirements|checklist|tips|guide|"
    r"what to expect|first time)\b"
)
ADOPT_RE = re.compile(r"\b(adopt|adoption|adoptable|rescue|rescues|shelter|shelters|foster|fostering|rehome|rehoming)\b")

US_STATES = {
    "alabama": "AL", "alaska": "AK", "arizona": "AZ", "arkansas": "AR", "california": "CA", "colorado": "CO",
    "connecticut": "CT", "delaware": "DE", "florida": "FL", "georgia": "GA", "hawaii": "HI", "idaho": "ID",
    "illinois": "IL", "indiana": "IN", "iowa": "IA", "kansas": "KS", "kentucky": "KY", "louisiana": "LA",
    "maine": "ME", "maryland": "MD", "massachusetts": "MA", "michigan": "MI", "minnesota": "MN",
    "mississippi": "MS", "missouri": "MO", "montana": "MT", "nebraska": "NE", "nevada": "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY", "north carolina": "NC",
    "north dakota": "ND", "ohio": "OH", "oklahoma": "OK", "oregon": "OR", "pennsylvania": "PA",
    "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", "tennessee": "TN", "texas": "TX",
    "utah": "UT", "vermont": "VT", "virginia": "VA", "washington": "WA", "west virginia": "WV",
    "wisconsin": "WI", "wyoming": "WY", "district of columbia": "DC",
}


def classify(kw: str, city_names: set[str]) -> tuple[str, str]:
    """Return (intent, geo). intent in adopt | informational | negative | competitor | other."""
    geo = ""
    for c in sorted(city_names, key=len, reverse=True):
        if re.search(rf"\b{re.escape(c)}\b", kw):
            geo = c
            break
    if not geo:
        for name, abbr in US_STATES.items():
            if re.search(rf"\b{name}\b", kw):
                geo = abbr
                break
    if COMPETITOR_RE.search(kw):
        return "competitor", geo
    if NEGATIVE_RE.search(kw):
        return "negative", geo
    if INFO_RE.search(kw) and not re.search(r"\b(near me|in [a-z]+)\b", kw):
        return "informational", geo
    if ADOPT_RE.search(kw):
        return "adopt", geo
    return "other", geo


# --------------------------------------------------------------------------- trends


def trends_batches(terms: list[str], quick: bool) -> tuple[dict[str, float], dict[str, list[float]], dict[str, float], str]:
    """Returns (index_by_term, monthly_by_term, state_interest_for_anchor, note)."""
    index: dict[str, float] = {}
    monthly: dict[str, list[float]] = {}
    by_state: dict[str, float] = {}
    note = ""
    try:
        from pytrends.request import TrendReq
    except Exception as e:  # pragma: no cover
        return index, monthly, by_state, f"pytrends unavailable: {e}"

    pt = TrendReq(hl="en-US", tz=300)
    cached_states = cache_get("trends:states")
    if cached_states:
        by_state = cached_states
    else:
        try:
            pt.build_payload([ANCHOR, "dog adoption near me"], timeframe="today 12-m", geo="US")
            reg = pt.interest_by_region(resolution="REGION")
            by_state = {US_STATES.get(k.lower(), k): float(v) for k, v in reg[ANCHOR].items()}
            cache_put("trends:states", by_state)
            time.sleep(3)
        except Exception as e:
            note += f"state interest failed: {type(e).__name__}; "

    todo = [t for t in terms if t != ANCHOR]
    if quick:
        todo = todo[:8]
    batches = [todo[i : i + 4] for i in range(0, len(todo), 4)]
    failures = 0
    for batch in batches:
        key = "trends:" + "|".join(batch)
        cached = cache_get(key)
        if cached:
            index.update(cached["index"])
            monthly.update(cached["monthly"])
            continue
        try:
            pt.build_payload([ANCHOR] + batch, timeframe="today 12-m", geo="US")
            df = pt.interest_over_time()
            if df.empty:
                continue
            anchor_mean = float(df[ANCHOR].mean()) or 1.0
            got_index, got_monthly = {}, {}
            for t in batch:
                got_index[t] = round(100.0 * float(df[t].mean()) / anchor_mean, 1)
                got_monthly[t] = [float(x) for x in df[t].resample("ME").mean().round(1).tolist()]
            if ANCHOR not in monthly:
                resampled = df[ANCHOR].resample("ME").mean().round(1)
                monthly[ANCHOR] = [float(x) for x in resampled.tolist()]
                monthly["__labels__"] = [d.strftime("%b %Y") for d in resampled.index]  # type: ignore[assignment]
                index[ANCHOR] = 100.0
            index.update(got_index)
            monthly.update(got_monthly)
            if "__labels__" in monthly:
                got_monthly["__labels__"] = monthly["__labels__"]
            cache_put(key, {"index": got_index, "monthly": got_monthly})
            time.sleep(4)
        except Exception as e:
            failures += 1
            note += f"batch {batch[0]}...: {type(e).__name__}; "
            if failures >= 3:
                note += "stopped Trends after repeated failures (rate limit); re-run later to fill in. "
                break
            time.sleep(30)
    return index, monthly, by_state, note


# --------------------------------------------------------------------------- wikimedia


def wiki_views(breed_name: str) -> int | None:
    title = WIKI_TITLES.get(breed_name, breed_name.replace(" ", "_"))
    if title is None:
        return None
    key = f"wiki:{title}"
    cached = cache_get(key)
    if cached is not None:
        return cached
    end = datetime.now(timezone.utc).replace(day=1) - timedelta(days=1)
    start = (end.replace(day=1) - timedelta(days=360)).replace(day=1)
    url = (
        "https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/user/"
        f"{title}/monthly/{start:%Y%m%d}00/{end:%Y%m%d}00"
    )
    data = http_json(url, {}, sleep=1.0)  # Wikimedia throttles bursts; stay polite
    total = sum(i["views"] for i in data["items"]) if data and "items" in data else None
    cache_put(key, total)
    return total


# --------------------------------------------------------------------------- rescuegroups supply


def rescuegroups_total(breed_keyword: str | None, zip_code: str | None) -> int | None:
    api_key = os.environ.get("RESCUEGROUPS_API_KEY")
    if not api_key:
        return None
    key = f"rg:{breed_keyword}:{zip_code}"
    cached = cache_get(key)
    if cached is not None:
        return cached
    body: dict = {"data": {"page": {"limit": 1, "current": 1}}}
    if breed_keyword:
        body["data"]["filters"] = [
            {"fieldName": "animals.breedPrimary", "operation": "contains", "criteria": breed_keyword}
        ]
    if zip_code:
        body["data"]["filterRadius"] = {"miles": 50, "postalcode": zip_code}
    try:
        r = requests.post(
            (os.environ.get("RESCUEGROUPS_BASE_URL") or "https://api.rescuegroups.org/v5")
            + "/public/animals/search/available/dogs",
            headers={"Content-Type": "application/vnd.api+json", "Authorization": api_key, "User-Agent": UA},
            json=body,
            timeout=30,
        )
        total = r.json().get("meta", {}).get("pagination", {}).get("total") if r.ok else None
    except Exception:
        total = None
    cache_put(key, total)
    time.sleep(0.5)
    return total


# --------------------------------------------------------------------------- main


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--quick", action="store_true", help="small run for smoke testing")
    ap.add_argument("--write-import-files", action="store_true", help="regenerate docs/ads/keywords.csv and negatives")
    args = ap.parse_args()

    breeds = load_breeds()
    cities = load_cities()
    popular = [b for b in breeds if b["popular"]]
    major = [c for c in cities if c["major"]]
    if args.quick:
        popular, major = popular[:3], major[:3]
    city_names = {c["city"].lower() for c in cities}
    breed_kw = {}
    text = (FRONTEND / "lib" / "seo" / "breeds.ts").read_text()
    for m in re.finditer(r"slug: '([^']+)',.*?keyword: '([^']+)'", text, re.S):
        breed_kw[m.group(1)] = m.group(2)

    print(f"[research] {len(popular)} breeds, {len(major)} cities", file=sys.stderr)

    # ---- 1. expand seeds via autocomplete
    seeds: list[tuple[str, str, str, str]] = []  # (seed, campaign, ad_group, landing)
    generic = [
        "adopt a dog", "dog adoption", "rescue dogs near me", "dogs for adoption near me", "adopt a dog near me",
        "dog rescue near me", "adoptable dogs", "dog shelters near me", "find a rescue dog", "rescue dog finder",
    ]
    for g in generic:
        seeds.append((g, "generic", "Rescue Near Me", f"{SITE}/find"))
    for b in popular:
        n, p = b["name"].lower(), b["plural"].lower()
        for s in (f"adopt {n}", f"{n} rescue", f"{n} adoption", f"{p} for adoption", f"adopt a {n}", f"{n} rescue near me"):
            seeds.append((s, "breed", b["name"], f"{SITE}/adopt/{b['slug']}"))
    for c in major:
        cn = c["city"].lower()
        for s in (f"dogs for adoption {cn}", f"adopt a dog {cn}", f"dog adoption {cn}", f"rescue dogs {cn}", f"dog rescue {cn}", f"dog shelters {cn}"):
            seeds.append((s, "city", f"{c['city']} {c['state']}", f"{SITE}/adopt/near/{c['slug']}"))

    found: dict[str, dict] = {}

    def add(kw: str, seed: tuple, engine: str, rel: int):
        kw = re.sub(r"\s+", " ", kw).strip()
        if len(kw) < 4 or len(kw) > 80:
            return
        rec = found.setdefault(
            kw,
            {"keyword": kw, "seed": seed[0], "campaign": seed[1], "ad_group": seed[2], "landing": seed[3],
             "engines": set(), "google_relevance": 0, "is_seed": False},
        )
        rec["engines"].add(engine)
        rec["google_relevance"] = max(rec["google_relevance"], rel)

    for i, seed in enumerate(seeds):
        add(seed[0], seed, "seed", 0)
        found[seed[0]]["is_seed"] = True
        for kw, rel in google_suggest(seed[0]):
            add(kw, seed, "google", rel)
        for kw in bing_suggest(seed[0]):
            add(kw, seed, "bing", 0)
        if (i + 1) % 25 == 0:
            print(f"[research] autocomplete {i + 1}/{len(seeds)} ({len(found)} keywords)", file=sys.stderr)
    # alphabet-soup expansion on a handful of head terms
    heads = generic[:4] + [f"adopt {b['name'].lower()}" for b in popular[:6]]
    for h in heads:
        for letter in "abcdefghijklmnopqrstuvwxyz":
            for kw, rel in google_suggest(f"{h} {letter}"):
                seed = next(s for s in seeds if s[0] == h)
                add(kw, seed, "google", rel)
    print(f"[research] {len(found)} keywords after expansion", file=sys.stderr)

    # ---- 2. classify, then route city-specific queries to the matching page
    city_by_name: dict[str, dict] = {}
    for c in sorted(cities, key=lambda c: (not c["major"], c["slug"])):
        city_by_name.setdefault(c["city"].lower(), c)
    breed_by_name = {b["name"]: b for b in breeds}
    abbrs = set(US_STATES.values())
    for rec in found.values():
        rec["intent"], rec["geo"] = classify(rec["keyword"], city_names)
        city = city_by_name.get(rec["geo"])
        if city:
            # "jacksonville nc" names a different Jacksonville than the catalog's Jacksonville, FL.
            m = re.search(rf"\b{re.escape(rec['geo'])} ([a-z]{{2}})\b", rec["keyword"])
            if m and m.group(1).upper() in abbrs and m.group(1).upper() != city["state"]:
                rec["geo"] = m.group(1).upper()
                city = None
        if city and rec["intent"] == "adopt":
            if rec["campaign"] == "breed" and rec["ad_group"] in breed_by_name:
                b = breed_by_name[rec["ad_group"]]
                rec["campaign"], rec["ad_group"] = "city", f"{city['city']} {city['state']}"
                rec["landing"] = f"{SITE}/adopt/{b['slug']}/{city['slug']}"
            else:
                rec["campaign"], rec["ad_group"] = "city", f"{city['city']} {city['state']}"
                rec["landing"] = f"{SITE}/adopt/near/{city['slug']}"

    # ---- 3. trends on head terms
    head_terms = [ANCHOR] + generic[1:6] + [f"adopt {b['name'].lower()}" for b in popular] + [f"{b['name'].lower()} rescue" for b in popular]
    index, monthly, by_state, trends_note = trends_batches(head_terms, args.quick)
    print(f"[research] trends: {len(index)} terms indexed. {trends_note}", file=sys.stderr)

    # ---- 4. wikimedia + supply per breed
    breed_rows = []
    for b in (popular if args.quick else breeds):
        views = wiki_views(b["name"])
        supply = rescuegroups_total(breed_kw.get(b["slug"]), None)
        t_adopt = index.get(f"adopt {b['name'].lower()}")
        t_rescue = index.get(f"{b['name'].lower()} rescue")
        breed_rows.append(
            {"breed": b["name"], "slug": b["slug"], "popular": b["popular"], "wiki_views_12m": views,
             "trends_adopt_index": t_adopt, "trends_rescue_index": t_rescue, "listings_us": supply}
        )
    max_views = max((r["wiki_views_12m"] or 0) for r in breed_rows) or 1
    max_trend = max((r["trends_rescue_index"] or 0) for r in breed_rows) or 1
    for r in breed_rows:
        wiki = 100.0 * (r["wiki_views_12m"] or 0) / max_views
        t = r["trends_rescue_index"]
        if t is not None:
            # Adoption-specific search demand outweighs general breed curiosity (memes, shows).
            r["demand_score"] = round(0.3 * wiki + 0.7 * 100.0 * t / max_trend, 1)
            r["demand_basis"] = "trends+wiki"
        elif r["wiki_views_12m"]:
            r["demand_score"] = round(0.5 * wiki, 1)
            r["demand_basis"] = "wiki only (discounted)"
        else:
            r["demand_score"] = None
            r["demand_basis"] = "none"
    breed_rows.sort(key=lambda r: -(r["demand_score"] or 0))
    for i, r in enumerate(breed_rows):
        r["rank"] = i + 1

    # ---- 5. city priority from state interest + supply
    city_signal: dict[str, list[int]] = defaultdict(list)
    for rec in found.values():
        if rec["intent"] == "adopt" and rec["geo"] in city_by_name:
            city_signal[city_by_name[rec["geo"]]["slug"]].append(rec["google_relevance"])
    city_rows = []
    for c in (major if args.quick else cities):
        supply = rescuegroups_total(None, c["zip"])
        sig = city_signal.get(c["slug"], [])
        city_rows.append(
            {"city": c["city"], "state": c["state"], "slug": c["slug"], "major": c["major"],
             "adopt_queries_found": len(sig), "top_google_relevance": max(sig) if sig else 0,
             "state_adoption_interest": by_state.get(c["state"]), "listings_50mi": supply}
        )
    city_rows.sort(key=lambda r: (-r["adopt_queries_found"], -r["top_google_relevance"], -(r["state_adoption_interest"] or 0)))
    for i, r in enumerate(city_rows):
        r["rank"] = i + 1

    # ---- 6. score keywords
    INTENT_W = {"adopt": 1.0, "other": 0.5, "informational": 0.25, "competitor": 0.0, "negative": 0.0}
    for rec in found.values():
        engines = rec["engines"] - {"seed"}
        signal = 1.0 + 0.6 * len(engines) + min(rec["google_relevance"], 1500) / 1500.0
        geo_bonus = 1.15 if rec["geo"] else 1.0
        trend = None
        for t, v in index.items():
            if rec["keyword"] == t or rec["seed"] == t:
                trend = v
        demand = 1.0 + (trend or 0) / 100.0
        rec["trends_index"] = trend
        rec["score"] = round(INTENT_W[rec["intent"]] * signal * geo_bonus * demand * 10, 2)
        if rec["intent"] == "adopt" and rec["score"] >= 12:
            rec["recommendation"] = "keep"
        elif rec["intent"] == "adopt":
            rec["recommendation"] = "watch"
        elif rec["intent"] == "negative":
            rec["recommendation"] = "negative"
        elif rec["intent"] == "competitor":
            rec["recommendation"] = "competitor (exclude unless bidding on brands)"
        elif rec["intent"] == "informational":
            rec["recommendation"] = "content idea"
        else:
            rec["recommendation"] = "review"

    rows = sorted(found.values(), key=lambda r: -r["score"])
    # Cap `keep` at the strongest 20 per ad group so campaigns stay tight; the rest become `watch`.
    per_group: dict[str, int] = defaultdict(int)
    for r in rows:
        if r["recommendation"] == "keep":
            per_group[r["ad_group"]] += 1
            if per_group[r["ad_group"]] > 20 and not r["is_seed"]:
                r["recommendation"] = "watch"

    # ---- 7. write outputs
    OUT.mkdir(parents=True, exist_ok=True)
    fields = ["keyword", "intent", "geo", "score", "recommendation", "campaign", "ad_group", "seed", "engines",
              "google_relevance", "trends_index", "landing"]
    with open(OUT / "keywords-scored.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: ("|".join(sorted(r["engines"])) if k == "engines" else r.get(k, "")) for k in fields})
    with open(OUT / "negatives-discovered.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["keyword", "reason", "seed"])
        for r in rows:
            if r["intent"] in ("negative", "competitor"):
                w.writerow([r["keyword"], r["intent"], r["seed"]])
    with open(OUT / "content-ideas.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["query", "seed", "suggested_page"])
        for r in rows:
            if r["intent"] == "informational":
                w.writerow([r["keyword"], r["seed"], r["landing"]])
    with open(OUT / "breed-priority.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["rank", "breed", "slug", "popular", "demand_score", "demand_basis", "wiki_views_12m",
                                          "trends_adopt_index", "trends_rescue_index", "listings_us"])
        w.writeheader()
        w.writerows(breed_rows)
    with open(OUT / "city-priority.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["rank", "city", "state", "slug", "major", "adopt_queries_found", "top_google_relevance",
                                          "state_adoption_interest", "listings_50mi"])
        w.writeheader()
        w.writerows(city_rows)
    labels = [str(x) for x in monthly.pop("__labels__", [])]
    if monthly:
        months = 12
        with open(OUT / "seasonality.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["term"] + (labels[-months:] if labels else [f"m-{months - i}" for i in range(months)]))
            for t, series in monthly.items():
                w.writerow([t] + series[-months:])

    # ---- 8. import files
    if args.write_import_files:
        keep = [r for r in rows if r["recommendation"].startswith("keep") or r["is_seed"] and r["intent"] == "adopt"]
        with open(ADS / "keywords.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["Campaign", "Ad Group", "Keyword", "Match Type", "Final URL"])
            camp = {"breed": "DogYenta - Breed Intent (US)", "city": "DogYenta - City Intent", "generic": "DogYenta - Generic Intent (US)"}
            for r in keep:
                match = "Exact" if "near me" in r["keyword"] or r["is_seed"] else "Phrase"
                utm = f"utm_source=google&utm_medium=cpc&utm_campaign={r['campaign']}_intent&utm_content={re.sub(r'[^a-z0-9]+', '-', r['ad_group'].lower())}"
                w.writerow([camp[r["campaign"]], r["ad_group"], r["keyword"], match, f"{r['landing']}?{utm}"])
        base_negs = [l.strip() for l in (Path(__file__).parent / "base-negatives.txt").read_text().splitlines() if l.strip()]
        discovered = sorted({r["keyword"] for r in rows if r["intent"] in ("negative", "competitor")})
        with open(ADS / "negative-keywords.csv", "w", newline="") as f:
            w = csv.writer(f)
            w.writerow(["Campaign", "Keyword", "Match Type"])
            for c in camp.values():
                for n in base_negs:
                    w.writerow([c, n, "Phrase"])
                for n in discovered:
                    w.writerow([c, n, "Exact"])

    # ---- 9. report
    adopt = [r for r in rows if r["intent"] == "adopt"]
    negs = [r for r in rows if r["intent"] in ("negative", "competitor")]
    info = [r for r in rows if r["intent"] == "informational"]
    top = adopt[:30]
    lines = [
        "# Keyword Research Report",
        "",
        f"Generated {datetime.now(timezone.utc):%Y-%m-%d} by `scripts/keyword-research/research.py`. Sources: Google and Bing autocomplete, Google Trends, Wikimedia pageviews"
        + (", RescueGroups listing counts." if os.environ.get("RESCUEGROUPS_API_KEY") else ". (Set RESCUEGROUPS_API_KEY to add listing supply.)"),
        "",
        "## Totals",
        "",
        f"| Discovered | Adopt intent | Negatives found | Content ideas |",
        f"| --- | --- | --- | --- |",
        f"| {len(rows)} | {len(adopt)} | {len(negs)} | {len(info)} |",
        "",
    ]
    for camp_key, camp_label in (("breed", "Breed intent"), ("city", "City intent"), ("generic", "Generic intent")):
        lines += ["", f"## Top adopt-intent keywords: {camp_label}", "", "| # | Keyword | Geo | Score | Trends idx (seed) | Ad group |", "| --- | --- | --- | --- | --- | --- |"]
        seen_groups: dict[str, int] = defaultdict(int)
        shown = 0
        for r in adopt:
            if r["campaign"] != camp_key or seen_groups[r["ad_group"]] >= 3:
                continue
            seen_groups[r["ad_group"]] += 1
            shown += 1
            lines.append(f"| {shown} | {r['keyword']} | {r['geo'] or ''} | {r['score']} | {r['trends_index'] if r['trends_index'] is not None else ''} | {r['ad_group']} |")
            if shown >= 20:
                break
    lines += ["", "## Breed demand ranking", "", "Demand = 70% adoption search interest (Trends, \"[breed] rescue\" vs the strongest breed) + 30% Wikipedia views. Breeds without Trends data are wiki-only and discounted by half.", "",
              "| Rank | Breed | Demand | Basis | Wiki views 12m | Trends adopt | Trends rescue | US listings |", "| --- | --- | --- | --- | --- | --- | --- | --- |"]
    for r in breed_rows[:30]:
        lines.append(f"| {r['rank']} | {r['breed']} | {r['demand_score'] if r['demand_score'] is not None else ''} | {r['demand_basis']} | {r['wiki_views_12m'] or ''} | {r['trends_adopt_index'] if r['trends_adopt_index'] is not None else ''} | {r['trends_rescue_index'] if r['trends_rescue_index'] is not None else ''} | {r['listings_us'] or ''} |")
    lines += ["", "## City priority", "", "Ranked by the number of distinct adopt-intent queries autocomplete returned for the city (a proxy for absolute search volume), then Google's top relevance score. State interest is Google Trends' per-capita index and favors small states, so it is context only.", "",
              "| Rank | City | Adopt queries found | Top relevance | State interest | Listings within 50mi |", "| --- | --- | --- | --- | --- | --- |"]
    for r in city_rows[:30]:
        lines.append(f"| {r['rank']} | {r['city']}, {r['state']} | {r['adopt_queries_found']} | {r['top_google_relevance']} | {r['state_adoption_interest'] if r['state_adoption_interest'] is not None else ''} | {r['listings_50mi'] or ''} |")
    if monthly.get(ANCHOR):
        series = monthly[ANCHOR][-12:]
        peak = series.index(max(series))
        trough = series.index(min(series))
        lab = labels[-12:] if len(labels) >= 12 else [f"month {i + 1}" for i in range(12)]
        lines += ["", "## Seasonality", "", f"\"{ANCHOR}\" US interest by month: " + ", ".join(f"{lab[i]} {int(series[i])}" for i in range(len(series))) + ".",
                  f"Peak: {lab[peak]}. Trough: {lab[trough]} (~{int(100 - 100 * min(series) / max(series))}% below peak). Front-load budget into the peak window."]
    if trends_note:
        lines += ["", f"Trends note: {trends_note}"]
    lines += ["", "## Negatives discovered (sample)", ""]
    lines += [f"- {r['keyword']} ({r['intent']})" for r in negs[:25]]
    lines += ["", "## Content ideas (sample)", ""]
    lines += [f"- {r['keyword']}" for r in info[:25]]
    lines += ["", "## How to read this", "",
              "- Score = intent weight x autocomplete signal (engines + Google relevance) x geo bonus x (1 + Trends index/100).",
              "- Trends index is relative to \"adopt a dog\" = 100 over the last 12 months in the US.",
              "- `keep` keywords go into docs/ads/keywords.csv when run with --write-import-files; `watch` are adopt-intent but weak signal.",
              "- Real volumes and CPCs come from Google Keyword Planner once an Ads account exists; this report ranks, it does not count."]
    (OUT / "REPORT.md").write_text("\n".join(lines) + "\n")
    print(f"[research] wrote {OUT}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
