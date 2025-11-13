# Performance & Accessibility Checklist

**Date:** November 11, 2025  
**Owner:** Frontend Engineering

## 1. Lighthouse Audits

Run Lighthouse on core flows (desktop + mobile):

```bash
# Production URL
TARGET=https://dogyenta.com

# Desktop
lighthouse $TARGET --preset=desktop --output=json --output=html --output-path=./reports/lighthouse-desktop.html

# Mobile
lighthouse $TARGET --preset=mobile --output=json --output=html --output-path=./reports/lighthouse-mobile.html
```

Target scores:
- Performance ≥ 90
- Accessibility ≥ 95
- Best Practices ≥ 95
- SEO ≥ 90

Investigate and document regressions in `reports/README.md`.

## 2. Web Vitals Monitor

- Enable Vercel Web Vitals (Project Settings → Analytics).
- Track LCP, CLS, FID in dashboard; configure alert when LCP > 2.5s for P75.
- Record baselines after each deploy.

## 3. Accessibility Walkthrough

- Tab through landing, search results, checkout — ensure logical focus order.
- Confirm `.skip-link` appears on focus and sends cursor to main content.
- Run [axe DevTools](https://www.deque.com/axe/devtools/) on key pages; resolve all critical/serious issues.
- Test screen reader (`VoiceOver` or `NVDA`) for navigation landmarks and heading structure.

## 4. Responsive & Motion Checks

- Validate layouts at 320px, 768px, 1024px, and ≥1440px.
- Ensure carousels respect `prefers-reduced-motion` (no auto-play when enabled).
- Confirm images use `next/image` or optimized CDN references (no layout shift).

## 5. Caching & Assets

- Verify static assets served with `cache-control: public, max-age=31536000, immutable`.
- Check dynamic routes for appropriate caching (should be `no-store` where personalization is involved).
- Audit bundle size with `next build && ANALYZE=true next build` (if webpack bundle analyzer is configured).
- Ensure third-party scripts (Stripe, Umami) load `afterInteractive` and are deferred where possible.

## 6. Post-Launch Regression Monitoring

- Watch Vercel Analytics for 48 hours after launch for new layout shifts.
- Monitor Chrome User Experience Report (CrUX) via PageSpeed API.
- Keep accessibility debt log for any issues deferred past launch day.

Document all findings and mitigations in `STAGING_TEST_RESULTS.md`. Re-run this checklist before major marketing pushes.

