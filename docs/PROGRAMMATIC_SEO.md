# Programmatic SEO: /adopt pages

Landing pages generated from the breed and city catalogs so DogYenta ranks for
"adopt a [breed]" and "dogs for adoption in [city]" searches. Everything lives
under `frontend/` and needs no extra services beyond the existing RescueGroups key.

## Routes

| Route | Content | Count |
| --- | --- | --- |
| `/adopt` | Hub linking every breed and city page | 1 |
| `/adopt/[breed]` | Breed guide + nationwide listings | one per entry in `lib/seo/breeds.ts` |
| `/adopt/[breed]/[city]` | Breed listings within 50 miles of the city | any breed x any city (on demand) |
| `/adopt/near` | City index grouped by state | 1 |
| `/adopt/near/[city]` | Newest dogs within 50 miles of the city | one per entry in `lib/seo/cities.ts` |
| `/sitemap.xml` | Core pages, all breeds, all cities, popular breeds x major cities | ~630 URLs |
| `/robots.txt` | Allows crawl, blocks API, auth, profile, results, test pages | 1 |

Each page also serves an `opengraph-image` so shares on social and in group chats get a branded card.

## How listings are fetched

- `lib/seo/listings.ts` calls the active dog provider with a server-side breed filter
  (`animals.breedPrimary contains <keyword>`) and the city's central ZIP as a radius search.
- Results are cached with `unstable_cache` for one hour (`ADOPT_PAGE_REVALIDATE_SECONDS`), and the
  page itself is ISR with `revalidate = 3600`. One upstream call per page per hour, shared between
  `generateMetadata` and the page body.
- Upstream failures are not cached. The page renders its evergreen content with a "listings are
  refreshing" notice and the next request retries.
- Pages with zero dogs set `robots: noindex, follow` so thin pages never enter the index. They still
  link to the breed page, the city page, and the alerts CTA.

## Adding a breed or city

1. Add an entry to `BREEDS` in `frontend/lib/seo/breeds.ts` (slug, copy, `keyword` for the provider
   filter, and optional `aliases` / `exclude` for label matching) or to `CITIES` in
   `frontend/lib/seo/cities.ts` (slug ending in the state code, central ZIP).
2. Mark `popular: true` / `major: true` only if the breed x city combination deserves a sitemap entry.
3. Run `npm test -- seo-adopt` to validate slugs, ZIPs, and sitemap integrity.

## After deploying

1. Submit `https://dogyenta.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
2. Spot-check a few pages with Google's Rich Results Test (BreadcrumbList, FAQPage, ItemList).
3. Watch Search Console "Pages" for the `/adopt/` prefix; expect indexing to ramp over 2-6 weeks.
4. Review `[adopt] listings unavailable` log lines in Vercel if pages show the refreshing notice.
