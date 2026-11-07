# SEO Test Plan and Paid Campaign Prep

Branch: `claude/affectionate-cannon-xdt2bk` (commit `0718c32` adds the `/adopt` pages).
Companion doc: `docs/PROGRAMMATIC_SEO.md` explains how the pages work.

---

## Part A: Test the SEO changes

### A1. Get a preview deployment (10 min)

1. Open the branch in Vercel. If Git integration is on, a preview deployment already exists for the
   latest push. If not, open a PR from the branch into `staging` to trigger one.
2. Confirm the preview environment has these variables (Settings, Environment Variables, Preview):
   `RESCUEGROUPS_API_KEY`, `RESCUEGROUPS_BASE_URL` (optional), `NEXT_PUBLIC_BASE_URL`.
   `NEXT_PUBLIC_BASE_URL` drives canonical URLs and the sitemap, so on preview it is fine for it to
   point at production; just don't submit the preview sitemap anywhere.

### A2. Smoke test (15 min)

Open each URL on the preview host and check the "Expect" column.

| URL | Expect |
| --- | --- |
| `/adopt` | Hub with ~59 breeds and ~85 cities, all links work |
| `/adopt/golden-retriever` | Only Golden Retrievers and Golden mixes in the grid; "Showing N of M listed" line |
| `/adopt/pit-bull-terrier` | Includes Staffordshire and Pit Bull labels (alias matching) |
| `/adopt/near/philadelphia-pa` | Newest dogs near Philly; shelter name and city on each card |
| `/adopt/golden-retriever/philadelphia-pa` | Goldens within ~50 miles of 19107 |
| `/adopt/chihuahua/anchorage-ak` | Likely empty state with alerts CTA; view source shows `noindex, follow` |
| `/adopt/not-a-breed` | 404 |
| `/sitemap.xml` | ~630 URLs, all starting with `https://dogyenta.com` |
| `/robots.txt` | Disallows `/api/`, `/profile`, `/results`, points to sitemap |
| `/adopt/golden-retriever/opengraph-image` | PNG card "Adopt a Golden Retriever" |

First load of any page can take 5-15 seconds while the RescueGroups call and link validation run.
Reload: it should be instant for the next hour. That is the cache working.

### A3. If you see "Live listings are refreshing right now"

That is the fallback for an upstream error. Check Vercel runtime logs for `[adopt] listings unavailable`.

- If the message mentions `breedPrimary` or `contains`, RescueGroups rejected the server-side breed
  filter. Fix: in `frontend/lib/dogProviders.ts`, change the breed filter `operation` from `contains`
  to `equals`, or delete that filter block entirely. The pages already post-filter by breed label, so
  deleting it just shows fewer matches per page. Add `limit: 50` in `lib/seo/listings.ts` to compensate.
- If it mentions a timeout or 401, the key is missing or wrong on the preview environment.
- If pages time out entirely (Vercel 504), the plan is on Hobby with a 10 second function limit.
  Either upgrade to Pro or set `export const maxDuration = 30` in the three `page.tsx` files.

### A4. Validate markup (15 min)

1. Google Rich Results Test on one breed page and one city page. Expect BreadcrumbList and FAQ
   detected; ItemList shows as valid but has no rich result type, which is fine.
2. Share one page URL into iMessage, Slack, or LinkedIn's Post Inspector. Expect the branded card.
3. Run Lighthouse (Chrome DevTools, mobile) on a breed page. SEO score should be 95+. Performance will
   be lower on the first uncached load; re-run after.
4. Check mobile layout: cards stack to one column, chips wrap, FAQ accordions open.

### A5. Ship it

1. Merge the branch into `staging`, confirm the same checks on staging.dogyenta.com, then merge to
   production via your normal path.
2. In Google Search Console (add the `dogyenta.com` domain property if it isn't there):
   submit `https://dogyenta.com/sitemap.xml`, then use URL Inspection → Request Indexing for
   `/adopt` and your five most important breed pages.
3. In Bing Webmaster Tools, import the site from Search Console (one click) and submit the sitemap.
4. Add `/adopt` to the home page hero or footer so Google sees it as a primary section, not an orphan.

### A6. What to watch, and when

| When | Where | What |
| --- | --- | --- |
| Day 1-3 | Vercel logs | No `[adopt] listings unavailable` lines; function duration under 10s |
| Week 1-2 | Search Console → Pages | `/adopt/` URLs moving from Discovered to Indexed |
| Week 2-6 | Search Console → Performance, filter page contains `/adopt/` | Impressions first, then clicks |
| Week 4+ | Umami | Sessions landing on `/adopt/` and continuing to `/find` or `/pricing` |

If after 6 weeks most breed x city pages are "Crawled, currently not indexed", that is normal for
thin pages. Response: add a 150-word city-specific paragraph to the top 10 cities, not more pages.

---

## Part B: Paid campaign prep (Google Search)

Google Search is the first channel because the intent matches the new pages exactly: someone typing
"adopt golden retriever philadelphia" lands on a page listing adoptable Goldens in Philadelphia.
Meta and TikTok come later, once we know what a signup is worth.

### B1. Decisions only you can make

Write these down before building anything.

1. **Daily cap.** Recommended test: $25/day for 30 days (~$750). Enough for ~500-1,000 clicks.
2. **Geography.** All US, or the 22 major cities in the catalog. Recommendation: start with all US
   for the breed campaign and the 22 cities for the city campaign.
3. **Primary conversion.** Recommendation: free signup (frequent, fast feedback). Secondary: Pro
   checkout ($9.99/month). You cannot optimize bids on Pro checkout until you have ~30 per month.
4. **Target cost.** With Pro at $9.99/month and say 6 months average retention, a Pro signup is worth
   about $60. If 1 in 10 free signups go Pro, a free signup is worth ~$6. Target cost per free signup
   under $6 in month one; under $4 by month three.

### B2. Conversion tracking (I do this; you provide two IDs)

Umami cannot feed conversions back into Google Ads, so Google's own tag is needed.

1. In Google Ads: Goals → Conversions → New conversion action → Website → enter dogyenta.com →
   create two actions manually: `signup` (primary) and `pro_checkout` (secondary, value $9.99).
   Copy the Conversion ID (`AW-XXXXXXXXX`) and each action's label.
2. Send me those three strings. I will:
   - Add the Google tag to `app/layout.tsx` behind an env var so staging stays clean.
   - Update the Content Security Policy in `frontend/middleware.ts` for `googletagmanager.com`,
     `google.com`, `googleads.g.doubleclick.net`, and `google-analytics.com`.
   - Fire `signup` on first successful sign-in and `pro_checkout` from the existing
     `/api/analytics/checkout-success` flow.
   - Capture `utm_source`, `utm_campaign`, `utm_content`, and `gclid` on first visit and store them on
     the user record in Supabase, so you can see paid vs organic signups and Pro conversions in SQL,
     not just in Google's dashboard.
3. Verify with Google Tag Assistant on staging before any spend.

### B3. Google Ads account setup (you, 30 min)

1. Create the account at ads.google.com. Use Expert Mode; skip the guided campaign wizard, which
   creates a bloated Smart campaign.
2. Billing: add a card. Set an account-level monthly spend limit equal to your cap x 30.4.
3. Settings → turn off Auto-apply recommendations. Every one of them increases spend.
4. Tools → Linked accounts → link Search Console (lets you compare paid vs organic queries).
5. Admin → Access: add me later only if you want automated reporting; the CSVs below work without it.

### B3b. Keyword research before any spend (automated)

`scripts/keyword-research/research.py` builds the keyword set from free sources, so no money moves
on guesswork:

| Source | What it gives |
| --- | --- |
| Google + Bing autocomplete | Real query expansions for every breed and city seed, with Google's relevance ordering |
| Google Trends | Relative demand vs "adopt a dog", 12-month seasonality, interest by state |
| Wikimedia pageviews | Breed-level demand proxy (12 months of article views) |
| RescueGroups (optional) | Listing supply per breed and per city, when `RESCUEGROUPS_API_KEY` is set |

Outputs land in `docs/ads/research/`: `REPORT.md` (read this first), `keywords-scored.csv`,
`negatives-discovered.csv`, `content-ideas.csv`, `breed-priority.csv`, `city-priority.csv`,
`seasonality.csv`. With `--write-import-files` it regenerates `docs/ads/keywords.csv` and
`docs/ads/negative-keywords.csv` from the scored data.

Automation: `.github/workflows/keyword-research.yml` runs it on the first Monday of each month and on
demand (Actions → Keyword research refresh → Run workflow), then opens a PR titled "Keyword research
refresh" for you to review and merge. Add `RESCUEGROUPS_API_KEY` as a repository secret to include
listing supply in the ranking. Nothing is spent or changed in Google Ads by this job; it only updates
the files you import.

How to use the report:

1. Fund ad groups in the order of `breed-priority.csv` and `city-priority.csv`. Pause breeds with
   strong demand but near-zero listings (ads would send people to empty pages).
2. Import `negatives-discovered.csv` alongside the base negatives before launch.
3. Time the launch with `seasonality.csv`; the REPORT names the peak and trough months.
4. Hand `content-ideas.csv` to the breed-page FAQs; informational queries are cheaper to win
   organically than to buy.

Once a Google Ads account exists, the same script can be extended with Keyword Planner volumes and
CPCs, and with Search Console impressions for `/adopt` pages, to replace proxies with real counts.

### B4. Build the campaigns from the files in `docs/ads/`

Three files, importable with Google Ads Editor (free desktop app) via File → Import → From file.

| File | Rows | What it builds |
| --- | --- | --- |
| `keywords.csv` | 339 | 3 campaigns, 45 ad groups, phrase and exact keywords, each with a UTM-tagged landing URL |
| `negative-keywords.csv` | 174 | Campaign-level negatives: sale, breeder, price, jobs, cats, grooming, etc. |
| `responsive-search-ads.csv` | 45 | One responsive search ad per ad group, 12 headlines and 4 descriptions each |

Campaign settings to apply after import (not in the CSVs):

- **Networks:** Search only. Uncheck Display Network and Search Partners.
- **Locations:** "Presence" not "Presence or interest". Breed campaign: United States. City campaign:
  each ad group's metro, 50 mile radius around the city.
- **Bidding, weeks 1-2:** Maximize Clicks with a max CPC cap of $1.50.
- **Bidding, week 3+:** Maximize Conversions once the `signup` action has 30+ conversions in 30 days.
- **Budget split:** 50% Breed Intent, 35% City Intent, 15% Generic Intent.
- **Ad schedule:** all hours initially. Review by hour after two weeks.
- **Sitelinks:** Browse Breeds (/adopt), Get Matched (/find), Pricing (/pricing), About (/about).
- **Callouts:** Free to search · Refreshed hourly · Real rescue dogs · AI matching.
- **Pin headline 1** in each ad to the "Adopt a [Breed]" or "Dogs for Adoption in [City]" line so the
  page-matching promise always shows.

### B5. Pre-launch checklist

- [ ] Keyword research report reviewed; empty-supply breeds paused
- [ ] `signup` conversion fires on staging (Tag Assistant shows the hit)
- [ ] Daily budget and account spend limit set
- [ ] Display Network and Search Partners off
- [ ] Negatives imported on all three campaigns
- [ ] Landing URLs load with their UTM parameters and show listings
- [ ] Every ad group has one RSA with "Good" or better Ad Strength
- [ ] One person is named to check the search terms report twice in week one

### B6. First 30 days

| Day | Action |
| --- | --- |
| 1 | Launch. Check the campaigns are serving within 4 hours (Status column). |
| 2, 4, 7 | Search terms report → add negatives for every irrelevant query. Expect 20-40 new negatives in week one. |
| 7 | Pause any keyword with 30+ clicks and 0 signups. Pause any ad group with CTR under 2%. |
| 14 | Compare cost per signup across the three campaigns. Shift budget toward the winner. |
| 14 | Switch to Maximize Conversions if signups ≥ 30 in the trailing 30 days. |
| 30 | Decision: scale (raise cap 50%), hold, or stop. Scale only if cost per signup is under target and signups from paid are converting to Pro at a rate near organic. |

Benchmarks to sanity-check against (rough estimates for pet adoption search terms, verify in your account):
CPC $0.60-1.50, CTR 4-8%, landing page to signup 5-10%.

### B7. What I can run on my own once this is live

- Weekly report: paid vs organic signups and Pro conversions from Supabase and Umami, emailed to you.
- Monthly refresh of the ad CSVs when breeds or cities are added to the catalog.
- Negative keyword suggestions from a search terms export you paste in.

What stays with you: creating the account, adding billing, approving budget changes, and pasting
account access if you ever want me to pull the search terms report directly.
