import os
import re
from fastapi import FastAPI, Response, Query, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Reuse existing logic from main.py
from main import (
    fetch_all_animals,
    build_html_table,
    search_animals,
    get_animal_by_id,
    cache_get,
    cache_set,
    DEFAULT_ZIPS,
)

load_dotenv()

app = FastAPI(title="Dogfinder Web")

# CORS configuration — allow specific origins and credentials
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://dogfinder-web.vercel.app",
    "https://www.dogfinder-web.vercel.app",
    "https://dogyenta.com",  # Your custom domain
    "https://www.dogyenta.com",  # www version
    "https://staging.dogyenta.com",  # Staging environment
]

# Add any custom domain you'll use
custom_domain = os.getenv("CUSTOM_DOMAIN")
if custom_domain:
    origins.extend([
        f"https://{custom_domain}",
        f"https://www.{custom_domain}",
    ])

# Use FastAPI CORSMiddleware to handle simple and preflight CORS properly
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"]
)


def parse_guidance_for_size_filtering(guidance: str | None) -> dict[str, any]:
    """
    Parse guidance text to extract size preferences.
    Returns a dict with size filtering parameters.
    """
    if not guidance:
        return {"filter_sizes": None, "exclude_sizes": None}
    
    guidance_lower = guidance.lower()
    
    # Look for large dog preferences
    large_patterns = [
        r'\b(?:largest|larger|large|big|bigger|biggest|xl|xlarge|x-large)\b',
        r'\b(?:giant|massive|huge)\b',
        r'\bnothing\s+small\b',
        r'\bno\s+small\b',
        r'\bexclude\s+small\b'
    ]
    
    # Look for small dog preferences  
    small_patterns = [
        r'\b(?:smallest|smaller|small|tiny|little|miniature|mini)\b',
        r'\bnothing\s+large\b',
        r'\bno\s+large\b', 
        r'\bexclude\s+large\b'
    ]
    
    # Check for large preferences
    wants_large = any(re.search(pattern, guidance_lower) for pattern in large_patterns)
    wants_small = any(re.search(pattern, guidance_lower) for pattern in small_patterns)
    
    # If clear bias toward large dogs, filter for large sizes
    if wants_large and not wants_small:
        return {"filter_sizes": ["Large", "Extra Large", "XL"], "exclude_sizes": ["Small"]}
    
    # If clear bias toward small dogs, filter for small sizes  
    elif wants_small and not wants_large:
        return {"filter_sizes": ["Small"], "exclude_sizes": ["Large", "Extra Large", "XL"]}
    
    # No clear size preference found
    return {"filter_sizes": None, "exclude_sizes": None}


def apply_guidance_filtering(dogs: list[dict], guidance_filter: dict) -> list[dict]:
    """
    Apply size filtering based on guidance parsing results.
    """
    if not guidance_filter["filter_sizes"] and not guidance_filter["exclude_sizes"]:
        return dogs
    
    filtered_dogs = []
    for dog in dogs:
        dog_size = (dog.get("size") or "").strip()
        if not dog_size:
            continue
            
        # If we want specific sizes, check if dog matches
        if guidance_filter["filter_sizes"]:
            if not any(size.lower() in dog_size.lower() for size in guidance_filter["filter_sizes"]):
                continue
        
        # If we want to exclude sizes, check if dog should be excluded  
        if guidance_filter["exclude_sizes"]:
            if any(size.lower() in dog_size.lower() for size in guidance_filter["exclude_sizes"]):
                continue
                
        filtered_dogs.append(dog)
    
    return filtered_dogs


@app.get("/healthz")
def healthcheck() -> PlainTextResponse:
    return PlainTextResponse("ok")


# Preflight requests will be handled by CORSMiddleware; no manual OPTIONS route needed


@app.get("/api/dogs")
def api_dogs(
    zip: str | None = Query(None, description="base zip code"),
    radius: int = Query(100, ge=1, le=250),
    age: str = Query("baby,young"),
    includeBreeds: str | None = Query(None),
    excludeBreeds: str | None = Query(None),
    size: str | None = Query(None, description="csv of sizes Small,Medium,Large,XL"),
    guidance: str | None = Query(None, description="natural language guidance for filtering"),
    sort: str = Query("freshness", regex="^(freshness|distance)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    response: Response = None,
) -> JSONResponse:
    # Add explicit CORS headers as backup
    if response:
        response.headers["Access-Control-Allow-Origin"] = "https://dogfinder-web.vercel.app"
        response.headers["Access-Control-Allow-Credentials"] = "true"
    # Prepare inputs
    zips = [z.strip() for z in (zip or os.getenv("ZIP_CODES", "").strip()).split(",") if z.strip()]
    if not zips:
        zips = DEFAULT_ZIPS

    include_list = [b.strip() for b in (includeBreeds or "").split(",") if b.strip()]
    exclude_list = [b.strip() for b in (excludeBreeds or "").split(",") if b.strip()]
    sizes = [s.strip() for s in (size or "").split(",") if s.strip()]

    # Parse guidance for additional filtering
    guidance_filter = parse_guidance_for_size_filtering(guidance)
    print(f"🔍 BACKEND DEBUG: Guidance received: '{guidance}'")
    print(f"🔍 BACKEND DEBUG: Guidance filter result: {guidance_filter}")
    
    # Combine guidance filtering with explicit size filtering
    final_sizes = sizes[:] if sizes else []
    
    # If guidance suggests large dogs and no explicit size filter
    if guidance_filter["filter_sizes"] and not sizes:
        final_sizes = guidance_filter["filter_sizes"]
    elif guidance_filter["filter_sizes"] and sizes:
        # Merge guidance with existing size preference
        for size in guidance_filter["filter_sizes"]:
            if size not in final_sizes:
                final_sizes.append(size)
    
    cache_key = f"dogs:{','.join(zips)}:{radius}:{age}:{','.join(include_list)}:{','.join(exclude_list)}:{','.join(final_sizes)}:{guidance}:{sort}:{page}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        # Apply post-search filtering based on guidance if needed
        result = cached.copy()
        if guidance_filter and (guidance_filter["filter_sizes"] or guidance_filter["exclude_sizes"]):
            result["items"] = apply_guidance_filtering(result.get("items", []), guidance_filter)
        return JSONResponse(result)

    try:
        result = search_animals(
            zips=zips,
            distance_miles=radius,
            ages_csv=age,
            include_breeds=include_list,
            exclude_breeds=exclude_list,
            sizes=final_sizes,  # Use combined size filtering
            page=page,
            page_size=limit,
            sort=sort,
        )
        
        # Apply additional guidance filtering if needed
        if guidance_filter and (guidance_filter["filter_sizes"] or guidance_filter["exclude_sizes"]):
            items = result.get("items", [])
            result["items"] = apply_guidance_filtering(items, guidance_filter)
        
        cache_set(cache_key, result, ttl_seconds=120)
        
        return JSONResponse(result)
    except Exception as e:
        # return error payload instead of 500, helps debugging
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/dogs/{dog_id}")
def api_dog_detail(dog_id: str) -> JSONResponse:
    cache_key = f"dog:{dog_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return JSONResponse(cached)
    animal = get_animal_by_id(dog_id)
    if not animal:
        raise HTTPException(status_code=404, detail="Dog not found")
    cache_set(cache_key, animal, ttl_seconds=300)
    return JSONResponse(animal)


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    animals = fetch_all_animals()
    table_html = build_html_table(animals)
    html = f"""
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Dogfinder</title>
        <style>
          body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 24px; }}
          h1 {{ margin-bottom: 12px; }}
          .meta {{ color: #666; font-size: 14px; margin-bottom: 16px; }}
          table {{ background: #fff; }}
          th, td {{ vertical-align: top; }}
          a {{ color: #0b5; }}
        </style>
      </head>
      <body>
        <h1>Recently listed dogs (last 24 hours)</h1>
        <div class="meta">Data from Petfinder API. Filtered by configured ZIP codes and distance.</div>
        {table_html}
      </body>
    </html>
    """
    return HTMLResponse(content=html)


# Local dev entrypoint: `uvicorn app:app --reload`
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host=os.getenv("HOST", "0.0.0.0"), port=int(os.getenv("PORT", "8000")), reload=True)