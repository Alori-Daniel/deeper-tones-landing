// Where a sign-up came from, taken from the landing URL (?utm_source=tiktok&utm_campaign=shelf30).
export const UTM_KEYS = ["utm_source", "utm_campaign", "utm_medium"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type Utm = Partial<Record<UtmKey, string>>;

const UTM_VALUE_RE = /^[a-z0-9_-]{1,64}$/;

// Keeps only known keys with short, lowercase, URL-safe values. Anything else is dropped
// without complaint: an odd UTM must never get in the way of a sign-up.
export function sanitizeUtm(input: unknown): Utm {
  const out: Utm = {};
  if (typeof input !== "object" || input === null) return out;
  for (const key of UTM_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value !== "string") continue;
    const clean = value.trim().toLowerCase();
    if (UTM_VALUE_RE.test(clean)) out[key] = clean;
  }
  return out;
}

const STORAGE_KEY = "dt_utm";

// Visitors scroll or move around before they sign up, so the first load keeps the UTM for the
// tab's session. A new tagged link in the same tab replaces it; an untagged page view doesn't.
export function captureUtm(): Utm {
  try {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = sanitizeUtm(Object.fromEntries(UTM_KEYS.map((k) => [k, params.get(k)])));
    if (Object.keys(fromUrl).length > 0) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fromUrl));
      return fromUrl;
    }
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    return stored ? sanitizeUtm(JSON.parse(stored)) : {};
  } catch {
    // Storage can be blocked (private mode) or hold junk; sign-ups carry on without a source.
    return {};
  }
}
