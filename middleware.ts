import { NextRequest, NextResponse } from "next/server";
import {
  getLayerDecisionFromRequest,
  REASON_LABELS,
  type LayerDecision,
} from "@/utils/cloakerDecision";
import { checkBot, extractClientIp } from "@/utils/botDetect";

const CLOAKER_PARAM_PASS =
  process.env.CLOAKER_PARAM_PASS || "b6mP2e7KIKH7i2w";
const CLOAKER_TEST_PASS = process.env.CLOAKER_TEST_PASS || "forceblack";

/** Black funnel entry (static HTML in /public) */
const BLACK_ENTRY = "/index.html";
/** White safe page (static HTML in /public) */
const WHITE_CONTENT = "/famguard.html";

/** Funnel paths that must never be open without black decision */
const FUNNEL_PATHS = new Set([
  "/",
  "/index.html",
  "/step2.html",
  "/step3.html",
  "/step4.html",
  "/step5.html",
  "/step6.html",
  "/backredirect.html",
]);

function setCatCookieOnly(response: NextResponse) {
  response.cookies.set({
    name: "cat_valid",
    value: "1",
    path: "/",
    maxAge: 60 * 60 * 72,
    httpOnly: false,
    sameSite: "lax",
  });
}

function setForceBlackCookie(response: NextResponse) {
  response.cookies.set({
    name: "force_black",
    value: "1",
    path: "/",
    maxAge: 60 * 60 * 6,
    httpOnly: false,
    sameSite: "lax",
  });
  setCatCookieOnly(response);
}

function setLayerReasonCookies(
  response: NextResponse,
  info: {
    layer: string;
    reason: string;
    reasonLabel: string;
    isBot: boolean;
    hasParam: boolean;
  }
) {
  const base = {
    path: "/",
    maxAge: 60 * 60 * 6,
    httpOnly: false,
    sameSite: "lax" as const,
  };
  response.cookies.set({ name: "zs_layer", value: info.layer, ...base });
  response.cookies.set({ name: "zs_reason", value: info.reason, ...base });
  response.cookies.set({
    name: "zs_reason_label",
    value: info.reasonLabel,
    ...base,
  });
  response.cookies.set({
    name: "zs_is_bot",
    value: info.isBot ? "1" : "0",
    ...base,
  });
  response.cookies.set({
    name: "zs_has_param",
    value: info.hasParam ? "1" : "0",
    ...base,
  });
}

function applyDecisionCookies(
  response: NextResponse,
  decision: LayerDecision
) {
  setLayerReasonCookies(response, {
    layer: decision.layerName,
    reason: decision.reason,
    reasonLabel: decision.reasonLabel,
    isBot: decision.isBot,
    hasParam:
      decision.hasCatParam || decision.hasCatCookie || decision.hasTestParam,
  });
}

function botWhiteDecision(
  req: NextRequest,
  bot: ReturnType<typeof checkBot>
): LayerDecision {
  const reason = bot.reason || "bot";
  return {
    layer: 1,
    layerName: "white",
    reason,
    reasonLabel: bot.label || REASON_LABELS[reason] || REASON_LABELS.bot,
    isBot: true,
    isHuman: false,
    hasCatCookie: req.cookies.get("cat_valid")?.value === "1",
    hasCatParam:
      req.nextUrl.searchParams.get("cat") === CLOAKER_PARAM_PASS ||
      req.cookies.get("cat_valid")?.value === "1",
    hasForceBlack: req.cookies.get("force_black")?.value === "1",
    hasTestParam: false,
    adSource: "unknown",
    country: (req.headers.get("x-vercel-ip-country") || "").toUpperCase(),
    language: "",
  };
}

/** Rewrite keeps the browser URL; only the response body changes. */
function rewriteWhite(req: NextRequest, decision: LayerDecision) {
  const whiteUrl = req.nextUrl.clone();
  whiteUrl.pathname = WHITE_CONTENT;
  whiteUrl.search = "";
  const response = NextResponse.rewrite(whiteUrl, {
    request: {
      headers: (() => {
        const h = new Headers(req.headers);
        h.set("x-url", req.nextUrl.toString());
        h.set("x-host", req.nextUrl.hostname.toLowerCase());
        h.set("x-cloaker-layer", "white");
        return h;
      })(),
    },
  });
  applyDecisionCookies(response, decision);
  return response;
}

function detectBotFromRequest(req: NextRequest) {
  const ip = extractClientIp(
    req.headers,
    // @ts-expect-error — ip exists on Vercel / NextRequest in production
    typeof req.ip === "string" ? req.ip : ""
  );
  const ua = req.headers.get("user-agent") || "";
  return checkBot(ua, ip);
}

function isFunnelPath(pathname: string): boolean {
  if (FUNNEL_PATHS.has(pathname)) return true;
  // cleanUrls / trailing variants
  if (pathname === "/index") return true;
  if (/^\/step[2-6](\.html)?$/.test(pathname)) return true;
  if (pathname === "/backredirect") return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;
  const url = nextUrl.toString();
  const host = nextUrl.hostname.toLowerCase();
  const searchParams = nextUrl.searchParams;
  const pathname = nextUrl.pathname;

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-url", url);
  requestHeaders.set("x-host", host);

  const gclid = searchParams.get("gclid");
  const wbraid = searchParams.get("wbraid");
  const gbraid = searchParams.get("gbraid");
  const gadSource = searchParams.get("gad_source");
  if (gclid) requestHeaders.set("x-gclid", gclid);
  if (wbraid) requestHeaders.set("x-wbraid", wbraid);
  if (gbraid) requestHeaders.set("x-gbraid", gbraid);
  if (gadSource) requestHeaders.set("x-gad-source", gadSource);

  const catParam = searchParams.get("cat");
  const testParam = searchParams.get("test") || "";
  const forceBlackCookie = req.cookies.get("force_black")?.value === "1";

  // Never cloak dashboard / analytics APIs
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/api/analytics") ||
    pathname.startsWith("/api/probe") ||
    pathname.startsWith("/api/public-config")
  ) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // ─── HARD RULE: bots always WHITE (never black funnel) ───
  const bot = detectBotFromRequest(req);
  const isLocalTest =
    testParam === CLOAKER_TEST_PASS || forceBlackCookie;

  if (bot.isBot && !isLocalTest) {
    if (catParam === CLOAKER_PARAM_PASS) {
      const whiteUrl = req.nextUrl.clone();
      whiteUrl.pathname = WHITE_CONTENT;
      searchParams.delete("cat");
      whiteUrl.search = searchParams.toString();
      const response = NextResponse.rewrite(whiteUrl);
      setCatCookieOnly(response);
      applyDecisionCookies(response, botWhiteDecision(req, bot));
      return response;
    }
    if (pathname !== WHITE_CONTENT && pathname !== "/white") {
      return rewriteWhite(req, botWhiteDecision(req, bot));
    }
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    applyDecisionCookies(response, botWhiteDecision(req, bot));
    return response;
  }

  // Ads cloaker key → set cat cookie only (layer decided below)
  if (catParam === CLOAKER_PARAM_PASS) {
    searchParams.delete("cat");
    const newUrl = req.nextUrl.clone();
    newUrl.search = searchParams.toString();
    const response = NextResponse.redirect(newUrl, { status: 302 });
    setCatCookieOnly(response);
    setLayerReasonCookies(response, {
      layer: "black",
      reason: "cat_cookie",
      reasonLabel: REASON_LABELS.cat_cookie,
      isBot: false,
      hasParam: true,
    });
    return response;
  }

  // Local test key → force black (dev)
  if (testParam === CLOAKER_TEST_PASS) {
    searchParams.delete("test");
    const newUrl = req.nextUrl.clone();
    newUrl.search = searchParams.toString();
    if (pathname === "/" || pathname === "" || pathname === "/index.html") {
      newUrl.pathname = BLACK_ENTRY;
    }
    const response = NextResponse.redirect(newUrl, { status: 302 });
    setForceBlackCookie(response);
    setLayerReasonCookies(response, {
      layer: "black",
      reason: "force_black",
      reasonLabel: REASON_LABELS.force_black,
      isBot: false,
      hasParam: true,
    });
    return response;
  }

  // Already the white static file
  if (pathname === WHITE_CONTENT || pathname === "/white") {
    const decision = getLayerDecisionFromRequest(req);
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    applyDecisionCookies(response, {
      ...decision,
      layer: 1,
      layerName: "white",
      reason:
        decision.layerName === "white"
          ? decision.reason
          : decision.reason || "white_blocked",
      reasonLabel:
        decision.layerName === "white"
          ? decision.reasonLabel
          : decision.reasonLabel || REASON_LABELS.white_blocked,
    });
    return response;
  }

  // Full cloaker decision
  const decision = getLayerDecisionFromRequest(req);

  // Safety: bot / white → rewrite white
  if (decision.isBot || decision.layerName === "white") {
    return rewriteWhite(req, {
      ...decision,
      layer: 1,
      layerName: "white",
      isBot: decision.isBot || bot.isBot,
      isHuman: !(decision.isBot || bot.isBot),
    });
  }

  // BLACK on entry "/" → funnel index
  if (pathname === "/" || pathname === "") {
    const blackUrl = req.nextUrl.clone();
    blackUrl.pathname = BLACK_ENTRY;
    const response = NextResponse.redirect(blackUrl, { status: 302 });
    applyDecisionCookies(response, decision);
    return response;
  }

  // BLACK on funnel paths → pass through ONLY if not bot
  if (bot.isBot) {
    return rewriteWhite(req, botWhiteDecision(req, bot));
  }

  // Extra safety: non-funnel static assets already skipped by matcher
  if (isFunnelPath(pathname) || decision.layerName === "black") {
    const response = NextResponse.next({
      request: { headers: requestHeaders },
    });
    applyDecisionCookies(response, decision);
    return response;
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  applyDecisionCookies(response, decision);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|mp4|webm|woff2?)$).*)",
  ],
};
