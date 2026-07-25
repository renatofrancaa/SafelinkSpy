export type AdSource = "meta" | "google" | "youtube" | "unknown";

export function detectAdSource(headers: Headers, url?: string): AdSource {
  const ua = (headers.get("user-agent") || "").toLowerCase();
  const ref = (headers.get("referer") || "").toLowerCase();
  const xrw = (headers.get("x-requested-with") || "").toLowerCase();

  let search: URLSearchParams | null = null;
  try {
    search = url ? new URL(url).searchParams : null;
  } catch {
    search = null;
  }

  // META (FB/IG)
  let metaScore = 0;
  if (/fb_iab|fbav|fban|instagram|iabmv/i.test(ua)) metaScore += 2;
  if (
    xrw.includes("com.facebook.katana") ||
    xrw.includes("com.instagram.android")
  ) {
    metaScore += 2;
  }
  if (ref.includes("facebook.com") || ref.includes("instagram.com")) {
    metaScore += 1;
  }
  if (search && (search.has("fbclid") || search.has("igshid"))) {
    metaScore += 1;
  }

  // GOOGLE / YOUTUBE
  let gScore = 0;
  const gclid = headers.get("x-gclid") || search?.get("gclid");
  const wbraid = headers.get("x-wbraid") || search?.get("wbraid");
  const gbraid = headers.get("x-gbraid") || search?.get("gbraid");
  const gadSource = (
    headers.get("x-gad-source") ||
    search?.get("gad_source") ||
    ""
  ).toLowerCase();

  if (gclid || wbraid || gbraid) gScore += 2;
  if (gadSource) gScore += 2;
  if (ref.includes("google.") || ref.includes("youtube.")) gScore += 1;

  const utmSource = (search?.get("utm_source") || "").toLowerCase();
  const looksYoutube =
    utmSource === "youtube" ||
    ref.includes("youtube.") ||
    /yt|youtube/.test(search?.get("utm_content") || "") ||
    /yt|youtube/.test(search?.get("utm_term") || "") ||
    (gadSource && /youtube/.test(gadSource));

  if (metaScore >= 1) return "meta";
  if (gScore >= 2) return looksYoutube ? "youtube" : "google";
  return "unknown";
}
