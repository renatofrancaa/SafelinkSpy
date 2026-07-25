/**
 * Bot / scraper detection for cloaker.
 * Meta ad-review bots often use real Mobile Chrome UAs + Facebook ASN IPs.
 * Real users clicking ads use their ISP IP, not 173.252.x / 31.13.x.
 */

/** Known Meta / Facebook public IP prefixes (ASN 32934 and related) */
const META_IP_PREFIXES = [
  "31.13.",
  "66.220.",
  "69.63.",
  "69.171.",
  "74.119.76.",
  "103.4.96.",
  "157.240.",
  "173.252.",
  "179.60.192.",
  "179.60.193.",
  "179.60.194.",
  "179.60.195.",
  "185.60.216.",
  "185.60.217.",
  "185.60.218.",
  "185.60.219.",
  "204.15.20.",
  // IPv6 Meta
  "2a03:2880:",
];

/** Common Google crawler / adsbot ranges (prefix-level) */
const GOOGLE_BOT_IP_PREFIXES = [
  "66.249.", // Googlebot
  "64.233.",
  "72.14.199.",
  "74.125.",
  "209.85.",
  "216.239.",
];

const BOT_UA_RE =
  /bot|spider|crawler|slurp|facebookexternalhit|facebot|meta-externalagent|meta-externalads|facebookcatalog|twitterbot|linkedinbot|pinterest|whatsapp|telegrambot|discordbot|slackbot|embedly|quora|outbrain|bingpreview|googlebot|adsbot-google|mediapartners-google|apis-google|feedfetcher|duplexweb-google|storebot|google-read-aloud|google-extended|bingbot|yandex|baidu|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider|gptbot|claudebot|anthropic|ccbot|dataforseo|screaming frog|headlesschrome|phantomjs|puppeteer|playwright|selenium|webdriver|curl\/|wget\/|python-requests|python-urllib|go-http-client|java\/|libwww|httpclient|okhttp|scrapy|node-fetch|axios\//i;

/**
 * Robust client IP extraction (Vercel Edge + Node).
 * Prefer real client IP headers; never trust empty string as "not bot".
 */
export function extractClientIp(
  headers: Headers,
  fallbackIp?: string | null
): string {
  const raw = [
    headers.get("x-real-ip"),
    headers.get("cf-connecting-ip"),
    headers.get("true-client-ip"),
    headers.get("x-client-ip"),
    headers.get("x-vercel-forwarded-for"),
    headers.get("x-forwarded-for"),
    fallbackIp || "",
  ];

  for (const h of raw) {
    if (!h) continue;
    // may be "client, proxy1, proxy2"
    const first = h.split(",")[0].trim();
    if (!first) continue;
    // strip port if present (ipv4:port)
    const noPort =
      first.includes(".") && first.includes(":")
        ? first.replace(/:\d+$/, "")
        : first;
    if (
      noPort &&
      noPort !== "127.0.0.1" &&
      noPort !== "::1" &&
      noPort !== "unknown"
    ) {
      return noPort;
    }
  }
  return "";
}

export function isMetaDatacenterIp(ip: string): boolean {
  if (!ip) return false;
  const v = ip.toLowerCase().replace(/^::ffff:/, "");
  return META_IP_PREFIXES.some((p) => v.startsWith(p.toLowerCase()));
}

export function isGoogleBotIp(ip: string): boolean {
  if (!ip) return false;
  const v = ip.replace(/^::ffff:/, "");
  return GOOGLE_BOT_IP_PREFIXES.some((p) => v.startsWith(p));
}

export function isBotUserAgent(ua: string): boolean {
  const u = (ua || "").trim();
  if (!u) return true; // empty UA → treat as bot
  if (u.length < 20) return true;
  return BOT_UA_RE.test(u);
}

export type BotCheck = {
  isBot: boolean;
  reason: "bot_ua" | "meta_ip" | "google_bot_ip" | "empty_ua" | null;
  label: string;
  ip: string;
};

/**
 * Full bot check: UA + Meta/Google datacenter IPs.
 */
export function checkBot(ua: string, ip: string): BotCheck {
  const u = (ua || "").trim();
  const cleanIp = (ip || "").replace(/^::ffff:/, "");

  if (!u) {
    return {
      isBot: true,
      reason: "empty_ua",
      label: "Bot / UA vazio",
      ip: cleanIp,
    };
  }
  if (isBotUserAgent(u)) {
    return {
      isBot: true,
      reason: "bot_ua",
      label: "Bot / crawler (User-Agent)",
      ip: cleanIp,
    };
  }
  if (isMetaDatacenterIp(cleanIp)) {
    return {
      isBot: true,
      reason: "meta_ip",
      label: "Bot Meta (IP datacenter Facebook)",
      ip: cleanIp,
    };
  }
  if (isGoogleBotIp(cleanIp)) {
    return {
      isBot: true,
      reason: "google_bot_ip",
      label: "Bot Google (IP crawler)",
      ip: cleanIp,
    };
  }
  return { isBot: false, reason: null, label: "", ip: cleanIp };
}
