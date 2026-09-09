import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "mm_attribution_v1";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

type UtmKey = (typeof UTM_KEYS)[number];

export interface StoredAttribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  landing_referrer?: string;
  landing_page?: string;
  landing_device?: string;
  captured_at: string;
}

// Same mobile/tablet/desktop split Google Ads/GA4 report on, so device-level
// findings (e.g. "mobile converts, desktop doesn't") are comparable across
// both without translating buckets.
function detectDevice(): "mobile" | "tablet" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent;
  if (/iPad|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|Android/i.test(ua)) return "mobile";
  return "desktop";
}

const isInternalReferrer = (referrer: string): boolean => {
  if (!referrer) return true;
  try {
    const refHost = new URL(referrer).hostname;
    return refHost === window.location.hostname;
  } catch {
    return false;
  }
};

/**
 * Capture UTM params + referrer from the current URL/document.
 * Idempotent: only writes on the first eligible landing per browser.
 * Re-captures if the new visit has explicit UTM params (treats those as authoritative).
 */
export function captureLandingAttribution(): void {
  if (typeof window === "undefined") return;

  try {
    const params = new URLSearchParams(window.location.search);
    const incomingUtms: Partial<Record<UtmKey, string>> = {};
    let hasIncomingUtm = false;
    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) {
        incomingUtms[key] = value;
        hasIncomingUtm = true;
      }
    }

    const existing = getStoredAttribution();
    const referrer = document.referrer || "";
    const isExternalReferrer = referrer && !isInternalReferrer(referrer);

    // Skip if we already have data and this visit has no fresh UTM signal
    if (existing && !hasIncomingUtm) return;

    // Skip if no UTM AND no external referrer (direct internal nav)
    if (!hasIncomingUtm && !isExternalReferrer) return;

    const payload: StoredAttribution = {
      ...incomingUtms,
      landing_referrer: isExternalReferrer ? referrer : undefined,
      landing_page: window.location.pathname + window.location.search,
      landing_device: detectDevice(),
      captured_at: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn("Attribution capture failed:", err);
  }
}

export function getStoredAttribution(): StoredAttribution | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAttribution;
  } catch {
    return null;
  }
}

/**
 * Persist captured attribution to the user's profile.
 * Only writes columns that are currently NULL on the profile, so we never
 * overwrite a previous capture (first-touch attribution).
 */
export async function persistAttributionToProfile(userId: string): Promise<void> {
  const stored = getStoredAttribution();
  if (!stored) return;

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "utm_source, utm_medium, utm_campaign, utm_term, utm_content, landing_referrer, landing_page, landing_device"
      )
      .eq("id", userId)
      .maybeSingle();

    const updates: Record<string, string> = {};
    const fields: Array<keyof StoredAttribution> = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "landing_referrer",
      "landing_page",
      "landing_device",
    ];
    for (const field of fields) {
      const incoming = stored[field];
      const current = profile ? (profile as Record<string, unknown>)[field] : null;
      if (incoming && !current) {
        updates[field] = String(incoming);
      }
    }

    if (Object.keys(updates).length === 0) return;

    await supabase.from("profiles").update(updates).eq("id", userId);
  } catch (err) {
    console.warn("Failed to persist attribution to profile:", err);
  }
}
