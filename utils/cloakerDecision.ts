/**
 * Edge-safe cloaker decision (no next/headers) — usable from middleware.
 */
import {
  isFacebookOrInstagramBrowser,
  isGoogleOrYouTubeBrowser,
  getAdSource,
} from "@/utils/BrowseDetector";
import { checkBot, extractClientIp } from "@/utils/botDetect";

const blockedCountryList = (
  process.env.CLOAKER_BLOCKED_COUNTRIES || "BR,RU,KP,IR"
)
  .split(",")
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean);

const blockedLanguageList = (
  process.env.CLOAKER_BLOCKED_LANGS || "pt-br"
)
  .split(",")
  .map((l) => l.trim().toLowerCase())
  .filter(Boolean);

const localTestPass = process.env.CLOAKER_TEST_PASS || "forceblack";
const cloakerParamPass = process.env.CLOAKER_PARAM_PASS || "b6mP2e7KIKH7i2w";

export type LayerDecision = {
  layer: 1 | 3;
  layerName: "white" | "black";
  reason: string;
  reasonLabel: string;
  isBot: boolean;
  isHuman: boolean;
  hasCatCookie: boolean;
  hasCatParam: boolean;
  hasForceBlack: boolean;
  hasTestParam: boolean;
  adSource: string;
  country: string;
  language: string;
};

export const REASON_LABELS: Record<string, string> = {
  force_black: "Teste local / force black",
  test_param: "Parâmetro ?test= válido",
  bot: "Bot / crawler detectado",
  bot_ua: "Bot / crawler (User-Agent)",
  meta_ip: "Bot Meta (IP datacenter Facebook)",
  google_bot_ip: "Bot Google (IP crawler)",
  empty_ua: "Bot / UA vazio",
  no_ad_source: "Sem origem Meta/Google/YouTube",
  no_cat_param: "Sem parâmetro cat (cookie)",
  cat_cookie: "Com parâmetro cat (cookie)",
  blocked_country: "País bloqueado",
  blocked_language: "Idioma bloqueado",
  vpn_proxy: "VPN / Proxy / Datacenter",
  white_blocked: "Bloqueado (white)",
  clean: "Humano · passou em todos os filtros",
};

export type DecisionInput = {
  catCookie: boolean;
  forceBlack: boolean;
  localParam: string;
  catInUrl: boolean;
  userAgent: string;
  url: string;
  country: string;
  language: string;
  headers: Headers;
  ip?: string;
  /** Optional VPN result; if undefined, VPN check is skipped */
  isVpn?: boolean;
};

export function decideLayer(input: DecisionInput): LayerDecision {
  const {
    catCookie,
    forceBlack,
    localParam,
    catInUrl,
    userAgent,
    url,
    country,
    language,
    headers: hdrs,
    ip: ipIn,
    isVpn,
  } = input;

  const ip = ipIn || extractClientIp(hdrs);
  const primaryLang = language.split(",")[0]?.trim() || "";
  const botCheck = checkBot(userAgent, ip);
  const bot = botCheck.isBot;
  const adSource = getAdSource(hdrs, url);
  const isFBIG = isFacebookOrInstagramBrowser(hdrs, url);
  const isGoogleYT = isGoogleOrYouTubeBrowser(hdrs, url);

  const base = {
    isBot: bot,
    isHuman: !bot,
    hasCatCookie: catCookie,
    hasCatParam: catInUrl || catCookie,
    hasForceBlack: forceBlack,
    hasTestParam: localParam === localTestPass,
    adSource,
    country,
    language: primaryLang,
  };

  const done = (layer: 1 | 3, reason: string): LayerDecision => ({
    ...base,
    layer,
    layerName: layer === 1 ? "white" : "black",
    reason,
    reasonLabel: REASON_LABELS[reason] || reason,
  });

  // LOCAL TEST only — forceblack / test param always black (dev)
  if (localParam === localTestPass) return done(3, "test_param");
  if (forceBlack) return done(3, "force_black");

  // BOT / Meta scraper IP → always WHITE (even with cat cookie)
  if (bot) {
    const code = botCheck.reason || "bot";
    return done(1, code);
  }

  // Must look like Meta or Google/YouTube traffic
  if (!isFBIG && !isGoogleYT) return done(1, "no_ad_source");

  // Cloaker cookie required
  if (!catCookie) return done(1, "no_cat_param");

  // Country
  if (blockedCountryList.includes(country)) return done(1, "blocked_country");

  // Language
  if (
    blockedLanguageList.some(
      (bl) => primaryLang === bl || primaryLang.startsWith(bl)
    )
  ) {
    return done(1, "blocked_language");
  }

  // VPN / proxy
  if (isVpn === true) return done(1, "vpn_proxy");

  return done(3, "clean");
}

/**
 * Decision from NextRequest-like object (middleware).
 */
export function getLayerDecisionFromRequest(req: {
  cookies: { get: (name: string) => { value: string } | undefined };
  headers: Headers;
  nextUrl: { toString: () => string; searchParams: URLSearchParams };
}): LayerDecision {
  const hdrs = req.headers;
  const url = req.nextUrl.toString();
  const country = (hdrs.get("x-vercel-ip-country") || "US").toUpperCase();
  const userAgent = hdrs.get("user-agent") || "";
  const userLanguage = (hdrs.get("accept-language") || "").toLowerCase();
  const catParam = req.nextUrl.searchParams.get("cat") || "";
  // Prefer any IP we can find (Edge may only set some headers)
  const ip =
    extractClientIp(hdrs) ||
    (hdrs.get("x-vercel-forwarded-for") || "").split(",")[0].trim();

  return decideLayer({
    catCookie: req.cookies.get("cat_valid")?.value === "1",
    forceBlack: req.cookies.get("force_black")?.value === "1",
    localParam: req.nextUrl.searchParams.get("test") || "",
    catInUrl: catParam === cloakerParamPass,
    userAgent,
    url,
    country,
    language: userLanguage,
    headers: hdrs,
    ip,
  });
}

export { cloakerParamPass, localTestPass };
