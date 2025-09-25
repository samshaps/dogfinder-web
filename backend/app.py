import os
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

# CORS middleware - secure configuration for production
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000", 
    "https://dogfinder-web.vercel.app",
    "https://www.dogfinder-web.vercel.app",
]

# Add any custom domain you'll use
custom_domain = os.getenv("CUSTOM_DOMAIN")
if custom_domain:
    origins.extend([
        f"https://{custom_domain}",
        f"https://www.{custom_domain}",
    ])

# Temporarily disable CORS middleware to test explicit headers
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_origin_regex=r"https://.*\.vercel\.app",
#     allow_credentials=True,
#     allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
#     allow_headers=["*"],
# )


@app.get("/healthz")
def healthcheck() -> PlainTextResponse:
    return PlainTextResponse("ok")


@app.options("/api/dogs")
def api_dogs_options(response: Response) -> Response:
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    return response


@app.get("/api/dogs")
def api_dogs(
    zip: str | None = Query(None, description="base zip code"),
    radius: int = Query(100, ge=1, le=250),
    age: str = Query("baby,young"),
    includeBreeds: str | None = Query(None),
    excludeBreeds: str | None = Query(None),
    size: str | None = Query(None, description="csv of sizes Small,Medium,Large,XL"),
    sort: str = Query("freshness", regex="^(freshness|distance)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    response: Response = None,
) -> JSONResponse:
    # Prepare inputs
    zips = [z.strip() for z in (zip or os.getenv("ZIP_CODES", "").strip()).split(",") if z.strip()]
    if not zips:
        zips = DEFAULT_ZIPS

    include_list = [b.strip() for b in (includeBreeds or "").split(",") if b.strip()]
    exclude_list = [b.strip() for b in (excludeBreeds or "").split(",") if b.strip()]
    sizes = [s.strip() for s in (size or "").split(",") if s.strip()]

    cache_key = f"dogs:{','.join(zips)}:{radius}:{age}:{','.join(include_list)}:{','.join(exclude_list)}:{','.join(sizes)}:{sort}:{page}:{limit}"
    cached = cache_get(cache_key)
    if cached is not None:
        response = JSONResponse(cached)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    try:
        result = search_animals(
            zips=zips,
            distance_miles=radius,
            ages_csv=age,
            include_breeds=include_list,
            exclude_breeds=exclude_list,
            sizes=sizes,
            page=page,
            page_size=limit,
            sort=sort,
        )
        cache_set(cache_key, result, ttl_seconds=120)
        
        # Create response with explicit CORS headers
        response = JSONResponse(result)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        return response
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
