# Row Level Security Audit

**Date:** November 11, 2025  
**Context:** Production hardening ahead of public launch

## Summary

- RLS is now enforced (`ENABLE` + `FORCE`) on the following tables: `users`, `plans`, `preferences`, `alert_settings`, `email_events`, `dog_cache`.
- End-user access is scoped to the authenticated Supabase user (`auth.uid()`), while the Supabase service role retains full management capability.
- Public read access is intentionally granted to `dog_cache` so that unauthenticated visitors can browse adoptable dogs without elevating privileges.

## Policy Matrix

| Table | End-user permissions | Service role permissions |
| ----- | -------------------- | ------------------------ |
| `users` | Select / update own record | Full CRUD |
| `plans` | Select / update own plan state | Full CRUD |
| `preferences` | Full CRUD on own preferences | Full CRUD |
| `alert_settings` | Full CRUD on own alert configuration | Full CRUD |
| `email_events` | Read own email event history | Full CRUD |
| `dog_cache` | Read-only (anon + authenticated) | Full CRUD |

## Smoke Test Checklist

1. **Create two staged accounts** (e.g. `user_a@dogfinder.app`, `user_b@dogfinder.app`), sign in via Supabase OAuth, and capture their JWTs with the Supabase CLI.
2. **Validate row isolation**  
   - With `user_a`'s JWT, call `GET https://<project>.supabase.co/rest/v1/preferences` and confirm only `user_a`'s row is returned.  
   - Repeat for `plans`, `alert_settings`, and `email_events`.
3. **Verify write protection**  
   - Attempt to `PATCH` `preferences` belonging to `user_b` while authenticated as `user_a`; the request must return `401`/`404`.  
   - Repeat the check for `plans`.
4. **Confirm public dog cache access**  
   - Hit `GET .../rest/v1/dog_cache?select=petfinder_id,name` without a JWT. The response should succeed with read-only data.  
   - Attempt a `POST` to `dog_cache` without the service role key; the request must be rejected.
5. **Service role regression test**  
   - Run `npm run migrate:up` locally with `SUPABASE_SERVICE_ROLE_KEY` set and ensure background jobs (email alerts, plan sync) can still create/update rows.

All scenarios above should be exercised in staging before production deploy. Document results in `STAGING_TEST_RESULTS.md`.

