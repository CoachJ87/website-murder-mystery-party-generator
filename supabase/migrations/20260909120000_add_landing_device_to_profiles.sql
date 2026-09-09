-- Adds device-at-first-landing (mobile/tablet/desktop) alongside the existing
-- UTM/referrer attribution columns, so device-level lead/purchase attribution
-- can be measured going forward. Captured client-side in captureLandingAttribution()
-- and persisted first-touch (never overwritten) via persistAttributionToProfile(),
-- same pattern as utm_source etc. See src/lib/attribution.ts.
alter table public.profiles add column if not exists landing_device text;
