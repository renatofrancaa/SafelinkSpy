import { NextRequest, NextResponse } from "next/server";
import {
  getPresenceList,
  getEventsInRange,
  FUNNEL_ORDER,
  UPSELL_FUNNEL_ORDER,
  STAGE_LABELS,
  STAGE_RANK,
  maxStageOf,
  getStorageBackend,
  normalizePagePath,
} from "@/lib/analytics/store";
import { REASON_LABELS } from "@/lib/analytics/reason";
import { displayReasonFallback } from "@/lib/analytics/reason";
import { isNonHumanTraffic, isRealTraffic } from "@/utils/botDetect";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ error: "unauthorized" }, { status: 401 });
}

/** Read utm_* from a path+query string when stored fields are empty */
function utmsFromPage(page?: string): {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  term: string;
} {
  const empty = { source: "", medium: "", campaign: "", content: "", term: "" };
  if (!page) return empty;
  try {
    const q = page.includes("?") ? page.slice(page.indexOf("?")) : page;
    const sp = new URLSearchParams(
      q.startsWith("?") ? q : page.includes("=") ? `?${q}` : ""
    );
    return {
      source: sp.get("utm_source") || "",
      medium: sp.get("utm_medium") || "",
      campaign: sp.get("utm_campaign") || "",
      content: sp.get("utm_content") || "",
      term: sp.get("utm_term") || "",
    };
  } catch {
    return empty;
  }
}

function resolveUtms(row: {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  source?: string;
  page?: string;
  landing?: string;
}) {
  const fromPage = utmsFromPage(row.page || row.landing || "");
  const source =
    row.utmSource || fromPage.source || row.source || "direct" || "";
  const medium = row.utmMedium || fromPage.medium || "";
  // Decode common double-encoded campaign names for readability
  let campaign = row.utmCampaign || fromPage.campaign || "";
  try {
    campaign = decodeURIComponent(campaign.replace(/\+/g, " "));
  } catch {
    /* keep raw */
  }
  let content = fromPage.content || "";
  let term = fromPage.term || "";
  try {
    content = content ? decodeURIComponent(content.replace(/\+/g, " ")) : "";
    term = term ? decodeURIComponent(term.replace(/\+/g, " ")) : "";
  } catch {
    /* keep */
  }
  return {
    source: source || "—",
    medium: medium || "—",
    campaign: campaign || "—",
    content: content || "—",
    term: term || "—",
  };
}

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.DASHBOARD_SECRET || "1234";
  const header = req.headers.get("x-dashboard-secret") || "";
  const q = req.nextUrl.searchParams.get("key") || "";
  return header === secret || q === secret;
}

/** Calendar day bounds in America/Sao_Paulo (avoids UTC "hoje" wiping history) */
function dayBoundsInTZ(
  dayOffset: number,
  timeZone = "America/Sao_Paulo"
): { from: number; to: number } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA → YYYY-MM-DD
  const parts = fmt.formatToParts(now);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  // Build noon UTC then shift by dayOffset, then get that calendar day in TZ via offset
  const base = new Date(Date.UTC(y, m - 1, d + dayOffset, 12, 0, 0));
  const ymd = fmt.format(base); // YYYY-MM-DD in Sao Paulo
  // Approximate: SP is UTC-3 (no need DST precision for panel ranges)
  const from = new Date(`${ymd}T00:00:00-03:00`).getTime();
  const to = new Date(`${ymd}T23:59:59.999-03:00`).getTime();
  return { from, to };
}

function resolveRange(req: NextRequest): { from: number; to: number; range: string } {
  const now = Date.now();
  const range = req.nextUrl.searchParams.get("range") || "today";
  const fromQ = req.nextUrl.searchParams.get("from");
  const toQ = req.nextUrl.searchParams.get("to");

  if (range === "custom" && fromQ && toQ) {
    const from = new Date(fromQ + "T00:00:00-03:00").getTime();
    const to = new Date(toQ + "T23:59:59.999-03:00").getTime();
    return { from, to, range: "custom" };
  }

  if (range === "yesterday") {
    const { from, to } = dayBoundsInTZ(-1);
    return { from, to, range };
  }
  if (range === "7d") {
    return { from: now - 7 * 24 * 60 * 60 * 1000, to: now, range };
  }
  if (range === "14d") {
    return { from: now - 14 * 24 * 60 * 60 * 1000, to: now, range };
  }
  if (range === "all") {
    return { from: 0, to: now, range: "all" };
  }
  // today (America/Sao_Paulo)
  const { from } = dayBoundsInTZ(0);
  return { from, to: now, range: "today" };
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  // PerfectPay API sync is ONLY via POST /api/analytics/sales-sync (button).
  // Never block dashboard stats on external PerfectPay calls.

  const { from, to, range } = resolveRange(req);
  const presenceAll = await getPresenceList();
  // Load by range in DB (not "last N global") so yesterday never vanishes under today's volume
  const eventsAll = await getEventsInRange(from, to, 15_000);
  // History + funnel + checkouts: real campaign clicks only (exclude bots + Meta/Google analysts)
  const events = eventsAll.filter(isRealTraffic);
  // Live (ao vivo): show everyone, including bots and Meta analysts — just don't count them in history/funnel
  const presence = presenceAll;
  const now = Date.now();
  // Probe real connectivity — never report durable if Neon is down (quota/etc.)
  const storage = await getStorageBackend();

  // Online by stage (includes bots/analysts so they appear on live tab)
  const onlineByStage: Record<string, number> = {};
  const onlineByLayer = { white: 0, black: 0, unknown: 0 };
  const onlineBySource: Record<string, number> = {};
  let onlineBots = 0;
  let onlineHumans = 0;
  for (const p of presence) {
    onlineByStage[p.stage] = (onlineByStage[p.stage] || 0) + 1;
    onlineByLayer[p.layer] = (onlineByLayer[p.layer] || 0) + 1;
    const src = p.utmSource || p.source || "direct";
    onlineBySource[src] = (onlineBySource[src] || 0) + 1;
    if (isNonHumanTraffic(p)) onlineBots += 1;
    else onlineHumans += 1;
  }

  // Unique visitors who hit each stage in range
  const stageVisitors: Record<string, Set<string>> = {};
  const layerCounts = { white: 0, black: 0, unknown: 0 };
  const layerVisitors = {
    white: new Set<string>(),
    black: new Set<string>(),
    unknown: new Set<string>(),
  };
  // All breakdowns = unique visitors (never double-count the same person)
  const sourceVisitors: Record<string, Set<string>> = {};
  const campaignVisitors: Record<string, Set<string>> = {};
  const landingVisitors: Record<string, Set<string>> = {};
  const reasonVisitors: Record<string, Set<string>> = {};
  const botHumanVisitors = {
    bot: new Set<string>(),
    human: new Set<string>(),
    unknown: new Set<string>(),
  };
  const paramVisitors = {
    withParam: new Set<string>(),
    withoutParam: new Set<string>(),
  };
  /** Unique black-layer visitors per country code */
  const blackCountryVisitors: Record<string, Set<string>> = {};
  /** Unique pageviews: visitorId + path (one view per person per page) */
  const uniquePageviewKeys = new Set<string>();
  /** Latest event per visitor (for unique feed) — events are newest-first */
  const latestByVisitor = new Map<string, (typeof events)[0]>();

  /** Real offer checkout only (step6 / CTA — not earlier funnel steps) */
  function isRealCheckoutEvent(e: (typeof events)[0]): boolean {
    const page = (e.page || "").toLowerCase();
    if (
      page.includes("step2") ||
      page.includes("step3") ||
      page.includes("step4") ||
      page.includes("step5") ||
      page.includes("conversas") ||
      page.includes("/chat") ||
      page.includes("phone.html")
    ) {
      return false;
    }
    const onCta =
      page.includes("step6") ||
      page.includes("cta-unified") ||
      page.includes("/cta") ||
      page.includes("offer") ||
      page.includes("backredirect");
    if (e.type === "checkout_click" && (onCta || e.stage === "checkout" || e.stage === "cta"))
      return true;
    if (e.stage === "checkout" && e.type === "pageview" && onCta) {
      const m = e.meta || {};
      return (
        m.value != null ||
        m.tier != null ||
        m.planLabel != null ||
        m.checkoutValue != null
      );
    }
    return false;
  }

  function effectiveStage(e: (typeof events)[0]): string {
    // Demote false checkout stages from conversas "unlock" clicks
    if (e.stage === "checkout" && !isRealCheckoutEvent(e)) {
      const page = (e.page || "").toLowerCase();
      if (page.includes("conversas")) return "conversas";
      if (page.includes("chat")) return "chat";
      if (page.includes("phone")) return "phone";
      return "cta";
    }
    return e.stage;
  }

  /** Black funnel + real traffic (not bot / Meta analyst) */
  function isBlackHumanEvent(e: (typeof events)[0]): boolean {
    if (e.layer !== "black") return false;
    return isRealTraffic(e);
  }

  // Max stage per visitor (for cumulative funnel)
  const visitorMaxStage: Record<string, string> = {};
  for (const e of events) {
    const st = effectiveStage(e);
    const cur = visitorMaxStage[e.visitorId];
    visitorMaxStage[e.visitorId] = cur ? maxStageOf(cur, st) : st;
  }

  for (const e of events) {
    const st = effectiveStage(e);
    if (!stageVisitors[st]) stageVisitors[st] = new Set();
    stageVisitors[st].add(e.visitorId);

    if (e.type === "layer" || e.type === "pageview") {
      layerVisitors[e.layer]?.add(e.visitorId);
    }

    // Black page access ranking by country (unique people)
    if (e.layer === "black") {
      const cc = (e.country || "??").toUpperCase().slice(0, 8) || "??";
      if (!blackCountryVisitors[cc]) blackCountryVisitors[cc] = new Set();
      blackCountryVisitors[cc].add(e.visitorId);
    }

    if (e.type === "pageview") {
      uniquePageviewKeys.add(
        `${e.visitorId}|${normalizePagePath(e.page || e.landing || "/")}`
      );
    }

    if (e.type === "layer") {
      const reason = String(
        e.reasonLabel ||
          e.reason ||
          e.meta?.reasonLabel ||
          e.meta?.reason ||
          "unknown"
      );
      const key = String(REASON_LABELS[reason] || reason);
      if (!reasonVisitors[key]) reasonVisitors[key] = new Set();
      reasonVisitors[key].add(e.visitorId);

      if (
        e.hasParam === true ||
        e.meta?.hasCatParam === true ||
        e.meta?.hasCatCookie === true
      ) {
        paramVisitors.withParam.add(e.visitorId);
      } else {
        paramVisitors.withoutParam.add(e.visitorId);
      }
    }

    // Attribute source/landing once per visitor (first/newest event wins for sets)
    const utm = resolveUtms(e);
    if (!sourceVisitors[utm.source]) sourceVisitors[utm.source] = new Set();
    sourceVisitors[utm.source].add(e.visitorId);

    const land = e.landing || e.page || "/";
    if (!landingVisitors[land]) landingVisitors[land] = new Set();
    landingVisitors[land].add(e.visitorId);

    // One feed row per unique visitor (events already newest-first)
    if (!latestByVisitor.has(e.visitorId)) {
      latestByVisitor.set(e.visitorId, e);
    }
  }

  // Campaigns: unique black humans only.
  // Campaign can sit on any of their events (newest wins); visitor must have black+human hit.
  const blackHumanIds = new Set<string>();
  for (const e of events) {
    if (isBlackHumanEvent(e)) blackHumanIds.add(e.visitorId);
  }
  const campaignByVisitor = new Map<string, string>();
  const eventsNewest = [...events].sort((a, b) => b.ts - a.ts);
  for (const e of eventsNewest) {
    if (campaignByVisitor.has(e.visitorId)) continue;
    const utm = resolveUtms(e);
    if (utm.campaign && utm.campaign !== "—") {
      campaignByVisitor.set(e.visitorId, utm.campaign);
    }
  }
  for (const [vid, camp] of campaignByVisitor) {
    if (!blackHumanIds.has(vid)) continue;
    if (!campaignVisitors[camp]) campaignVisitors[camp] = new Set();
    campaignVisitors[camp].add(vid);
  }

  const sourceHistory: Record<string, number> = {};
  for (const [k, set] of Object.entries(sourceVisitors)) {
    sourceHistory[k] = set.size;
  }
  const campaignHistory: Record<string, number> = {};
  for (const [k, set] of Object.entries(campaignVisitors)) {
    campaignHistory[k] = set.size;
  }
  const landingHistory: Record<string, number> = {};
  for (const [k, set] of Object.entries(landingVisitors)) {
    landingHistory[k] = set.size;
  }
  const reasonCounts: Record<string, number> = {};
  for (const [k, set] of Object.entries(reasonVisitors)) {
    reasonCounts[k] = set.size;
  }

  // Bot vs human diagnostics from FULL event set (before human filter)
  for (const e of eventsAll) {
    if (e.type !== "layer" && e.type !== "pageview") continue;
    if (isNonHumanTraffic(e)) {
      botHumanVisitors.bot.add(e.visitorId);
    } else if (e.meta?.isHuman === true || e.isBot === false) {
      botHumanVisitors.human.add(e.visitorId);
    } else {
      // Real traffic with unknown flag still counts as human for dash KPIs
      botHumanVisitors.human.add(e.visitorId);
    }
  }
  // A visitor marked both ways: bot wins
  for (const id of botHumanVisitors.bot) {
    botHumanVisitors.human.delete(id);
    botHumanVisitors.unknown.delete(id);
  }
  const botHuman = {
    bot: botHumanVisitors.bot.size,
    human: botHumanVisitors.human.size,
    unknown: botHumanVisitors.unknown.size,
  };
  const paramStats = {
    withParam: paramVisitors.withParam.size,
    withoutParam: paramVisitors.withoutParam.size,
  };
  // Unique visitors only in history feed (max 100 people)
  const recent = Array.from(latestByVisitor.values())
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 100);

  for (const k of Object.keys(layerVisitors) as (keyof typeof layerVisitors)[]) {
    layerCounts[k] = layerVisitors[k].size;
  }

  // Cumulative funnel: if user reached CTA, count them in phone/conversas/chat too
  const funnelStageSets: Record<string, Set<string>> = {};
  for (const st of FUNNEL_ORDER) funnelStageSets[st] = new Set();

  for (const [vid, maxSt] of Object.entries(visitorMaxStage)) {
    const maxRank = STAGE_RANK[maxSt] ?? 0;
    // Also count checkout_click as checkout stage
    for (const st of FUNNEL_ORDER) {
      const r = STAGE_RANK[st] ?? 0;
      if (r > 0 && r <= maxRank) {
        funnelStageSets[st].add(vid);
      }
    }
  }
  // Real CTA checkouts advance funnel to checkout (ignore conversas false positives)
  for (const e of events) {
    if (!isRealCheckoutEvent(e)) continue;
    for (const st of FUNNEL_ORDER) {
      const r = STAGE_RANK[st] ?? 0;
      if (r > 0 && r <= (STAGE_RANK.checkout ?? 7)) {
        funnelStageSets[st].add(e.visitorId);
      }
    }
  }

  const funnel = FUNNEL_ORDER.map((stage) => {
    // Prefer cumulative; fall back to raw stage hits
    const cum = funnelStageSets[stage]?.size || 0;
    const raw = stageVisitors[stage]?.size || 0;
    return {
      stage,
      label: STAGE_LABELS[stage] || stage,
      unique: Math.max(cum, raw),
    };
  });
  // Use first non-zero step as top for rates (entry often empty when black starts at phone)
  const top =
    funnel.find((f) => f.unique > 0)?.unique || funnel[0]?.unique || 0;
  const funnelWithRate = funnel.map((f, i) => ({
    ...f,
    rateFromStart: top ? Math.round((f.unique / top) * 1000) / 10 : 0,
    rateFromPrev:
      i === 0
        ? 100
        : funnel[i - 1].unique
          ? Math.round((f.unique / funnel[i - 1].unique) * 1000) / 10
          : 0,
  }));

  // ALWAYS unique — never raw event counts
  const uniques = new Set(events.map((e) => e.visitorId)).size;
  const pageviews = uniquePageviewKeys.size; // 1× por visitante+página
  const layerDecisions = new Set([
    ...layerVisitors.white,
    ...layerVisitors.black,
    ...layerVisitors.unknown,
  ]).size;

  // --- Checkout: only REAL offer clicks (cta-unified) ---
  const rawCheckoutClicks = events
    .filter(isRealCheckoutEvent)
    .sort((a, b) => b.ts - a.ts); // newest first

  // Keep first seen (newest) event per visitorId
  const checkoutByVisitor = new Map<string, (typeof rawCheckoutClicks)[0]>();
  for (const e of rawCheckoutClicks) {
    if (!checkoutByVisitor.has(e.visitorId)) {
      checkoutByVisitor.set(e.visitorId, e);
    }
  }
  const checkoutEvents = Array.from(checkoutByVisitor.values()).sort(
    (a, b) => b.ts - a.ts
  );
  // Both metrics = unique people (one click per person)
  const checkouts = checkoutEvents.length;
  const checkoutUniques = checkoutEvents.length;

  // Checkout history by day (YYYY-MM-DD) — unique people only
  const checkoutByDayMap: Record<
    string,
    { clicks: number; uniques: Set<string> }
  > = {};
  for (const e of checkoutEvents) {
    const day = new Date(e.ts).toISOString().slice(0, 10);
    if (!checkoutByDayMap[day]) {
      checkoutByDayMap[day] = { clicks: 0, uniques: new Set() };
    }
    checkoutByDayMap[day].clicks += 1;
    checkoutByDayMap[day].uniques.add(e.visitorId);
  }
  const checkoutByDay = Object.entries(checkoutByDayMap)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, v]) => ({
      day,
      clicks: v.clicks,
      uniquePeople: v.uniques.size,
    }));

  /**
   * Prefer ad placement (Instagram_Feed, Facebook_Mobile_Reels…) over generic utm_source (fb).
   * Reads meta.placement, URL params, or utm_content when it looks like Meta placement.
   */
  function looksLikePlacementLabel(s: string): boolean {
    return /instagram|facebook|messenger|audience_network|an_|reels|stories|feed|right_hand|marketplace|video_feeds|instant_article|search|tech_other|mobile_feed|desktop_feed|explore|profile_feed|facebook_mobile|facebook_desktop|ig_|fb_/i.test(
      s
    );
  }

  function resolveCheckoutPlacement(e: (typeof checkoutEvents)[0]): string {
    const meta = (e.meta || {}) as Record<string, unknown>;
    const fromMeta = String(
      meta.placement || meta.utm_placement || meta.adPlacement || ""
    ).trim();
    if (fromMeta) return fromMeta;

    const fromPage = (() => {
      try {
        const raw = e.page || e.landing || "";
        const q = raw.includes("?") ? raw.slice(raw.indexOf("?")) : "";
        const sp = new URLSearchParams(q.startsWith("?") ? q : `?${q}`);
        return (
          sp.get("placement") ||
          sp.get("utm_placement") ||
          sp.get("publisher_platform") ||
          sp.get("site_source_name") ||
          ""
        );
      } catch {
        return "";
      }
    })();
    if (fromPage) return fromPage;

    const u = resolveUtms(e);
    const content = String(meta.utmContent || u.content || "").trim();
    if (content && content !== "—" && looksLikePlacementLabel(content)) {
      return content;
    }

    // Fallback: generic source only if no placement known
    return u.source || e.utmSource || e.source || "direct";
  }

  // Checkout by placement / source — unique people (posicionamento Meta)
  const checkoutBySourceMap: Record<string, number> = {};
  for (const e of checkoutEvents) {
    const src = resolveCheckoutPlacement(e);
    checkoutBySourceMap[src] = (checkoutBySourceMap[src] || 0) + 1;
  }

  // Checkout by country — unique people who clicked offer checkout
  const checkoutCountryVisitors: Record<string, Set<string>> = {};
  for (const e of checkoutEvents) {
    const cc = (e.country || "??").toUpperCase().slice(0, 8) || "??";
    if (!checkoutCountryVisitors[cc]) checkoutCountryVisitors[cc] = new Set();
    checkoutCountryVisitors[cc].add(e.visitorId);
  }
  const checkoutByCountry = Object.entries(checkoutCountryVisitors)
    .map(([code, set]) => ({
      code,
      name: code,
      count: set.size,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);

  // Checkout by plan — only $37 full access + backredirect $29 (unique people)
  function resolvePlan(e: (typeof checkoutEvents)[0]): {
    key: string;
    label: string;
    value: number | null;
    tier: string | null;
  } {
    const meta = (e.meta || {}) as {
      value?: number | string;
      tier?: string;
      planLabel?: string;
      checkoutValue?: number | string;
      checkoutTier?: string;
      code?: string;
    };
    const page = (e.page || "").toLowerCase();
    const code = String(meta.code || "");
    const planLabelRaw = String(meta.planLabel || "").toLowerCase();

    let value: number | null = null;
    const rawVal = meta.value ?? meta.checkoutValue;
    if (typeof rawVal === "number") value = rawVal;
    else if (rawVal != null && rawVal !== "") value = Number(rawVal);
    if (value != null && isNaN(value)) value = null;

    let tier = (meta.tier || meta.checkoutTier || null) as string | null;

    // Infer value/tier from known codes/pages when missing
    if (value == null && (tier === "basic" || tier === "full")) value = 37;
    if (value == null && tier === "backredirect") value = 29;
    if (value == null && tier === "complete") value = 67;
    if (value == null) {
      if (
        code.includes("EKTG") ||
        page.includes("backredirect") ||
        planLabelRaw.includes("backredirect")
      ) {
        value = 29;
        tier = tier || "backredirect";
      } else if (
        code.includes("EHD1") ||
        page.includes("step6") ||
        page.includes("basic") ||
        page.includes("full")
      ) {
        value = 37;
        tier = tier || "full";
      } else if (code.includes("E961") || page.includes("complete")) {
        value = 67;
        tier = tier || "complete";
      }
    }

    const isBackredirect =
      tier === "backredirect" ||
      value === 29 ||
      page.includes("backredirect") ||
      planLabelRaw.includes("backredirect") ||
      code.includes("EKTG");

    // Main single offer: $37 product (also bucket older $39/$47 display values)
    const isMain =
      !isBackredirect &&
      (tier === "basic" ||
        tier === "full" ||
        value === 37 ||
        value === 39 ||
        value === 47 ||
        code.includes("EHD1"));

    const isLegacy67 =
      !isBackredirect &&
      !isMain &&
      (tier === "complete" || value === 67 || code.includes("E961"));

    if (isBackredirect) {
      return {
        key: "backredirect",
        label: meta.planLabel || "$29 Backredirect",
        value: value ?? 29,
        tier: "backredirect",
      };
    }
    if (isMain) {
      return {
        key: "37",
        label: meta.planLabel || "$37 Full Access",
        value: value ?? 37,
        tier: tier || "full",
      };
    }
    if (isLegacy67) {
      return {
        key: "67",
        label: meta.planLabel || "$67 Complete",
        value: value ?? 67,
        tier: "complete",
      };
    }

    const label =
      meta.planLabel ||
      (value != null ? `$${value}` : tier || "Desconhecido");
    const key = tier || (value != null ? String(value) : "unknown");
    return { key, label, value, tier };
  }

  const checkoutByPlanMap: Record<
    string,
    { label: string; clicks: number; uniques: Set<string>; value: number | null }
  > = {};
  for (const e of checkoutEvents) {
    const plan = resolvePlan(e);
    if (!checkoutByPlanMap[plan.key]) {
      checkoutByPlanMap[plan.key] = {
        label: plan.label,
        clicks: 0,
        uniques: new Set(),
        value: plan.value,
      };
    }
    // already unique per visitor in checkoutEvents
    checkoutByPlanMap[plan.key].clicks += 1;
    checkoutByPlanMap[plan.key].uniques.add(e.visitorId);
  }
  const checkoutByPlan = Object.entries(checkoutByPlanMap)
    .map(([key, v]) => ({
      key,
      label: v.label,
      value: v.value,
      clicks: v.clicks,
      uniquePeople: v.uniques.size,
    }))
    .sort((a, b) => b.clicks - a.clicks);

  // Feed: one row per unique person
  const checkoutFeed = checkoutEvents.slice(0, 50).map((e) => {
    const plan = resolvePlan(e);
    const u = resolveUtms(e);
    const placement = resolveCheckoutPlacement(e);
    return {
      id: e.id,
      visitorId: e.visitorId.slice(0, 12),
      page: e.page,
      source: placement, // show placement (Instagram_Feed…) not only "fb"
      placement,
      utmSource: u.source,
      utmCampaign: u.campaign,
      utmMedium: u.medium,
      country: e.country,
      tier: plan.tier,
      value: plan.value,
      planLabel: plan.label,
      ts: e.ts,
    };
  });


  // Max stage per visitor in range (for history enrichment)
  const maxStageByVisitor: Record<string, string> = {};
  for (const e of events) {
    const cur = maxStageByVisitor[e.visitorId];
    maxStageByVisitor[e.visitorId] = cur
      ? maxStageOf(cur, e.stage)
      : e.stage;
  }

  // Latest layer decision reason per visitor (backfill for old presence).
  // Use full event set so bots/Meta analysts still get Motivo when online.
  const latestLayerByVisitor: Record<
    string,
    {
      reason: string;
      reasonLabel: string;
      isBot: boolean | null;
      hasParam: boolean | null;
      layer: string;
    }
  > = {};
  for (const e of eventsAll) {
    if (e.type !== "layer") continue;
    if (latestLayerByVisitor[e.visitorId]) continue; // events are newest-first
    latestLayerByVisitor[e.visitorId] = {
      reason: e.reason || String(e.meta?.reason || ""),
      reasonLabel:
        e.reasonLabel ||
        String(e.meta?.reasonLabel || e.meta?.reason || ""),
      isBot:
        e.isBot ??
        (typeof e.meta?.isBot === "boolean" ? (e.meta.isBot as boolean) : null),
      hasParam:
        e.hasParam ??
        (typeof e.meta?.hasCatParam === "boolean"
          ? (e.meta.hasCatParam as boolean)
          : typeof e.meta?.hasCatCookie === "boolean"
            ? (e.meta.hasCatCookie as boolean)
            : null),
      layer: e.layer,
    };
  }

  const liveFeed = presence
    .slice()
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 80)
    .map((p) => {
      const back = latestLayerByVisitor[p.visitorId];
      const layer = p.layer || back?.layer || "unknown";
      // Prefer stored flag, then full bot/Meta-analyst heuristics (IP ASN, UA, reason codes)
      const isBot = isNonHumanTraffic({
        isBot: p.isBot ?? back?.isBot ?? null,
        device: p.device,
        reason: p.reason || back?.reason,
        reasonLabel: p.reasonLabel || back?.reasonLabel,
        ip: p.ip,
        meta: null,
      })
        ? true
        : p.isBot === false || back?.isBot === false
          ? false
          : p.isBot ?? back?.isBot ?? (p.device === "Bot" ? true : null);
      const hasParam = p.hasParam ?? back?.hasParam ?? null;
      const rawReason =
        p.reasonLabel ||
        p.reason ||
        back?.reasonLabel ||
        back?.reason ||
        "";
      const reasonLabel =
        (rawReason && rawReason !== "—"
          ? REASON_LABELS[rawReason] || rawReason
          : "") ||
        displayReasonFallback(layer, isBot, hasParam, p.device);
      return {
        visitorId: p.visitorId.slice(0, 14),
        page: p.page,
        stage: p.stage,
        stageLabel: STAGE_LABELS[p.stage] || p.stage,
        maxStage: p.maxStage || p.stage,
        maxStageLabel:
          STAGE_LABELS[p.maxStage || p.stage] || p.maxStage || p.stage,
        layer,
        ...(() => {
          const u = resolveUtms(p);
          return {
            source: u.source,
            utmSource: u.source,
            utmMedium: u.medium,
            utmCampaign: u.campaign,
            utmContent: u.content,
            utmTerm: u.term,
          };
        })(),
        country: p.country || "—",
        domain: p.domain || "—",
        ip: p.ip || "—",
        device: p.device || "—",
        reason: reasonLabel,
        isBot,
        hasParam,
        ts: p.ts,
        when: new Date(p.ts).toISOString(),
        agoSec: Math.round((now - p.ts) / 1000),
      };
    });

  const historyFeed = recent.map((e) => {
    const maxSt = maxStageByVisitor[e.visitorId] || e.stage;
    const isBot =
      e.isBot ??
      (typeof e.meta?.isBot === "boolean" ? (e.meta.isBot as boolean) : null) ??
      (e.device === "Bot" ? true : null);
    const hasParam =
      e.hasParam ??
      (typeof e.meta?.hasCatParam === "boolean"
        ? (e.meta.hasCatParam as boolean)
        : typeof e.meta?.hasCatCookie === "boolean"
          ? (e.meta.hasCatCookie as boolean)
          : null);
    const rawReason =
      e.reasonLabel ||
      e.reason ||
      (e.meta?.reasonLabel as string) ||
      (e.meta?.reason as string) ||
      "";
    const reason =
      (rawReason && rawReason !== "—"
        ? REASON_LABELS[rawReason] || rawReason
        : "") ||
      displayReasonFallback(e.layer, isBot, hasParam, e.device);
    const u = resolveUtms(e);
    return {
      id: e.id,
      type: e.type,
      visitorId: e.visitorId.slice(0, 14),
      page: e.page,
      stage: e.stage,
      stageLabel: STAGE_LABELS[e.stage] || e.stage,
      maxStage: maxSt,
      maxStageLabel: STAGE_LABELS[maxSt] || maxSt,
      layer: e.layer,
      source: u.source,
      utmSource: u.source,
      utmMedium: u.medium,
      utmCampaign: u.campaign,
      utmContent: u.content,
      utmTerm: u.term,
      landing: e.landing,
      country: e.country || "—",
      domain: e.domain || "—",
      ip: e.ip || "—",
      device: e.device || "—",
      reason,
      isBot,
      hasParam,
      ts: e.ts,
      when: new Date(e.ts).toISOString(),
    };
  });

  const sortObj = (o: Record<string, number>) =>
    Object.entries(o)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }));

  // ─── Sales + refunds + chargebacks (PerfectPay webhook) ───
  const moneyTypes = new Set(["sale", "sale_refund", "sale_chargeback"]);
  const moneyEvents = events
    .filter((e) => moneyTypes.has(e.type))
    .sort((a, b) => b.ts - a.ts);

  // Dedupe each type by order code
  function dedupeMoney(
    type: string
  ): (typeof moneyEvents)[0][] {
    const map = new Map<string, (typeof moneyEvents)[0]>();
    for (const e of moneyEvents) {
      if (e.type !== type) continue;
      const order = String(
        e.meta?.orderCode || e.meta?.saleCode || e.meta?.code || e.id
      );
      if (!map.has(order)) map.set(order, e);
    }
    return Array.from(map.values());
  }

  const salesList = dedupeMoney("sale").sort((a, b) => b.ts - a.ts);
  const refundList = dedupeMoney("sale_refund");
  const chargebackList = dedupeMoney("sale_chargeback");

  /** Day key in America/Sao_Paulo (YYYY-MM-DD) — same calendar as range filters */
  function dayKeySP(ts: number): string {
    try {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(ts));
    } catch {
      return new Date(ts).toISOString().slice(0, 10);
    }
  }

  function saleValue(e: (typeof moneyEvents)[0]): number {
    const raw = e.meta?.value ?? e.meta?.saleAmount ?? e.meta?.sale_amount;
    if (typeof raw === "number" && !isNaN(raw)) return Math.abs(raw);
    if (raw != null && raw !== "") {
      const n = Number(String(raw).replace(",", "."));
      return isNaN(n) ? 0 : Math.abs(n);
    }
    return 0;
  }

  function saleCurrency(e: (typeof moneyEvents)[0]): string {
    const c = String(e.meta?.currency || "").toUpperCase();
    if (c === "BRL" || c === "USD") return c;
    return "USD";
  }

  let grossRevenue = 0;
  let refundedAmount = 0;
  let chargebackAmount = 0;
  const salesBySourceMap: Record<
    string,
    { count: number; revenue: number; refunds: number; chargebacks: number }
  > = {};
  const salesByProductMap: Record<
    string,
    {
      label: string;
      count: number;
      revenue: number;
      refunds: number;
      chargebacks: number;
    }
  > = {};
  const salesByDayMap: Record<
    string,
    {
      count: number;
      revenue: number;
      refunds: number;
      chargebacks: number;
      buyers: Set<string>;
    }
  > = {};
  const buyers = new Set<string>();

  function touchSource(src: string) {
    if (!salesBySourceMap[src]) {
      salesBySourceMap[src] = {
        count: 0,
        revenue: 0,
        refunds: 0,
        chargebacks: 0,
      };
    }
    return salesBySourceMap[src];
  }
  function touchProduct(key: string, label: string) {
    if (!salesByProductMap[key]) {
      salesByProductMap[key] = {
        label,
        count: 0,
        revenue: 0,
        refunds: 0,
        chargebacks: 0,
      };
    }
    return salesByProductMap[key];
  }
  function touchDay(day: string) {
    if (!salesByDayMap[day]) {
      salesByDayMap[day] = {
        count: 0,
        revenue: 0,
        refunds: 0,
        chargebacks: 0,
        buyers: new Set(),
      };
    }
    return salesByDayMap[day];
  }

  for (const e of salesList) {
    const value = saleValue(e);
    grossRevenue += value;
    buyers.add(e.visitorId);
    const src =
      e.utmSource || e.source || String(e.meta?.placement || "") || "direct";
    const s = touchSource(src);
    s.count += 1;
    s.revenue += value;
    const productKey = String(
      e.meta?.productCode || e.meta?.code || e.meta?.tier || "unknown"
    );
    const productLabel = String(
      e.meta?.planLabel || e.meta?.productName || e.meta?.planName || productKey
    );
    const p = touchProduct(productKey, productLabel);
    p.count += 1;
    p.revenue += value;
    const d = touchDay(dayKeySP(e.ts));
    d.count += 1;
    d.revenue += value;
    d.buyers.add(e.visitorId);
  }

  for (const e of refundList) {
    const value = saleValue(e);
    refundedAmount += value;
    const src =
      e.utmSource || e.source || String(e.meta?.placement || "") || "direct";
    touchSource(src).refunds += value;
    const productKey = String(
      e.meta?.productCode || e.meta?.code || e.meta?.tier || "unknown"
    );
    const productLabel = String(
      e.meta?.planLabel || e.meta?.productName || e.meta?.planName || productKey
    );
    touchProduct(productKey, productLabel).refunds += value;
    touchDay(dayKeySP(e.ts)).refunds += value;
  }

  for (const e of chargebackList) {
    const value = saleValue(e);
    chargebackAmount += value;
    const src =
      e.utmSource || e.source || String(e.meta?.placement || "") || "direct";
    touchSource(src).chargebacks += value;
    const productKey = String(
      e.meta?.productCode || e.meta?.code || e.meta?.tier || "unknown"
    );
    const productLabel = String(
      e.meta?.planLabel || e.meta?.productName || e.meta?.planName || productKey
    );
    touchProduct(productKey, productLabel).chargebacks += value;
    touchDay(dayKeySP(e.ts)).chargebacks += value;
  }

  const netRevenue = grossRevenue - refundedAmount - chargebackAmount;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const todayKey = dayKeySP(Date.now());
  const todayBucket = salesByDayMap[todayKey];
  const todayGross = todayBucket?.revenue ?? 0;
  const todayRefunds = todayBucket?.refunds ?? 0;
  const todayChargebacks = todayBucket?.chargebacks ?? 0;
  const todayNet = todayGross - todayRefunds - todayChargebacks;
  const todaySalesCount = todayBucket?.count ?? 0;

  const salesByDay = Object.entries(salesByDayMap)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, v]) => {
      const net = v.revenue - v.refunds - v.chargebacks;
      return {
        day,
        count: v.count,
        revenue: round2(v.revenue),
        refunds: round2(v.refunds),
        chargebacks: round2(v.chargebacks),
        netRevenue: round2(net),
        uniqueBuyers: v.buyers.size,
        avgTicket:
          v.count > 0 ? round2(v.revenue / v.count) : 0,
      };
    });

  // Combined feed: sales + refunds + chargebacks, newest first
  const saleFeed = [...salesList, ...refundList, ...chargebackList]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 100)
    .map((e) => {
      const u = resolveUtms(e);
      const value = saleValue(e);
      const kind =
        e.type === "sale_refund"
          ? "refund"
          : e.type === "sale_chargeback"
            ? "chargeback"
            : "sale";
      return {
        id: e.id,
        orderCode: String(e.meta?.orderCode || e.meta?.saleCode || "—"),
        visitorId: e.visitorId.slice(0, 14),
        value: value || null,
        signedValue: kind === "sale" ? value : -value,
        kind,
        currency: saleCurrency(e),
        day: dayKeySP(e.ts),
        planLabel: String(
          e.meta?.planLabel || e.meta?.productName || e.meta?.planName || "—"
        ),
        productCode: String(e.meta?.productCode || e.meta?.code || "—"),
        isUpsell: !!e.meta?.isUpsell,
        source: u.source,
        utmSource: u.source,
        utmCampaign: u.campaign,
        utmMedium: u.medium,
        placement: String(e.meta?.placement || ""),
        country: e.country || "—",
        email: String(e.meta?.customerEmail || "").slice(0, 40) || null,
        ts: e.ts,
      };
    });

  // ─── Upsell performance (view / accept / decline / thankyou) ───
  const upsellStats = UPSELL_FUNNEL_ORDER.map((stage) => {
    const views = new Set<string>();
    const accepts = new Set<string>();
    const declines = new Set<string>();
    for (const e of events) {
      const st = effectiveStage(e);
      if (st === stage || e.stage === stage) {
        if (e.type === "pageview" || e.type === "upsell_accept" || e.type === "upsell_decline" || e.type === "thankyou_complete") {
          views.add(e.visitorId);
        }
      }
      if (e.type === "upsell_accept" && (e.stage === stage || st === stage)) {
        accepts.add(e.visitorId);
      }
      if (e.type === "upsell_decline" && (e.stage === stage || st === stage)) {
        declines.add(e.visitorId);
      }
      if (stage === "thankyou" && e.type === "thankyou_complete") {
        views.add(e.visitorId);
      }
    }
    // Also count pageviews that land on upsell paths even if stage mis-tagged
    for (const e of events) {
      if (e.type !== "pageview") continue;
      const p = (e.page || "").toLowerCase();
      if (stage === "thankyou" && p.includes("thankyou")) views.add(e.visitorId);
      const m = stage.match(/^upsell([1-7])$/);
      if (m && (p.includes(`/up${m[1]}`) || p.includes(`up${m[1]}.html`))) {
        views.add(e.visitorId);
      }
    }
    const v = views.size;
    const a = accepts.size;
    const d = declines.size;
    return {
      stage,
      label: STAGE_LABELS[stage] || stage,
      views: v,
      accepts: a,
      declines: d,
      acceptRate: v ? Math.round((a / v) * 1000) / 10 : 0,
      declineRate: v ? Math.round((d / v) * 1000) / 10 : 0,
    };
  });

  // Upsell funnel cumulative (viewed each stage)
  const upsellFunnelStageSets: Record<string, Set<string>> = {};
  for (const st of UPSELL_FUNNEL_ORDER) upsellFunnelStageSets[st] = new Set();
  for (const [vid, maxSt] of Object.entries(visitorMaxStage)) {
    const maxRank = STAGE_RANK[maxSt] ?? 0;
    for (const st of UPSELL_FUNNEL_ORDER) {
      const r = STAGE_RANK[st] ?? 0;
      if (r > 0 && r <= maxRank) upsellFunnelStageSets[st].add(vid);
    }
  }
  // Also add accept/decline/thankyou hits
  for (const e of events) {
    if (
      e.type === "upsell_accept" ||
      e.type === "upsell_decline" ||
      e.type === "thankyou_complete" ||
      (e.type === "pageview" &&
        (String(e.stage).startsWith("upsell") || e.stage === "thankyou"))
    ) {
      const st = e.stage;
      if (upsellFunnelStageSets[st]) upsellFunnelStageSets[st].add(e.visitorId);
      const maxRank = STAGE_RANK[st] ?? 0;
      for (const s of UPSELL_FUNNEL_ORDER) {
        const r = STAGE_RANK[s] ?? 0;
        if (r > 0 && r <= maxRank) upsellFunnelStageSets[s].add(e.visitorId);
      }
    }
  }
  const upsellFunnel = UPSELL_FUNNEL_ORDER.map((stage, i, arr) => {
    const unique = upsellFunnelStageSets[stage]?.size || 0;
    const prev = i === 0 ? unique : upsellFunnelStageSets[arr[i - 1]]?.size || 0;
    const top = upsellFunnelStageSets[arr[0]]?.size || 0;
    return {
      stage,
      label: STAGE_LABELS[stage] || stage,
      unique,
      rateFromStart: top ? Math.round((unique / top) * 1000) / 10 : 0,
      rateFromPrev:
        i === 0 ? 100 : prev ? Math.round((unique / prev) * 1000) / 10 : 0,
    };
  });

  // ─── Drop-off: last stage reached (visitors who did NOT buy + not thankyou) ───
  const buyerIds = new Set(salesList.map((e) => e.visitorId));
  const thankyouIds = new Set(
    events
      .filter(
        (e) =>
          e.type === "thankyou_complete" ||
          e.stage === "thankyou" ||
          (e.page || "").toLowerCase().includes("thankyou")
      )
      .map((e) => e.visitorId)
  );
  const dropOffMap: Record<string, number> = {};
  for (const [vid, maxSt] of Object.entries(visitorMaxStage)) {
    if (buyerIds.has(vid) || thankyouIds.has(vid)) continue;
    // Only count people who entered the main funnel
    if ((STAGE_RANK[maxSt] ?? 0) < 1) continue;
    dropOffMap[maxSt] = (dropOffMap[maxSt] || 0) + 1;
  }
  const dropOff = Object.entries(dropOffMap)
    .map(([stage, count]) => ({
      stage,
      label: STAGE_LABELS[stage] || stage,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  // Include max stage from full funnel order in visitorMaxStage (already from all events)

  return NextResponse.json({
    ok: true,
    now,
    storage,
    range: {
      key: range,
      from,
      to,
      // Human/real traffic only (bots + Meta analysts excluded from dashboard counts)
      eventCount: events.length,
      eventCountAll: eventsAll.length,
      botsExcluded: Math.max(0, eventsAll.length - events.length),
    },
    online: {
      total: presence.length,
      humans: onlineHumans,
      bots: onlineBots,
      byStage: Object.entries(onlineByStage)
        .map(([stage, count]) => ({
          stage,
          label: STAGE_LABELS[stage] || stage,
          count,
        }))
        .sort((a, b) => b.count - a.count),
      byLayer: onlineByLayer,
      bySource: sortObj(onlineBySource),
      liveFeed,
    },
    history: {
      uniques,
      pageviews,
      checkouts,
      checkoutUniques,
      checkoutByDay,
      checkoutBySource: sortObj(checkoutBySourceMap),
      checkoutByCountry,
      checkoutByPlan,
      checkoutFeed,
      layerDecisions,
      layerUniques: layerCounts,
      funnel: funnelWithRate,
      upsellFunnel,
      upsellStats,
      dropOff,
      sales: {
        count: salesList.length,
        uniqueBuyers: buyers.size,
        /** Bruto (só aprovadas) */
        revenue: round2(grossRevenue),
        grossRevenue: round2(grossRevenue),
        refundedAmount: round2(refundedAmount),
        chargebackAmount: round2(chargebackAmount),
        /** Líquido = bruto − reembolsos − chargebacks */
        netRevenue: round2(netRevenue),
        refundCount: refundList.length,
        chargebackCount: chargebackList.length,
        avgTicket:
          salesList.length > 0 ? round2(grossRevenue / salesList.length) : 0,
        /** Faturamento do dia (America/Sao_Paulo) */
        today: {
          day: todayKey,
          count: todaySalesCount,
          revenue: round2(todayGross),
          grossRevenue: round2(todayGross),
          refunds: round2(todayRefunds),
          chargebacks: round2(todayChargebacks),
          netRevenue: round2(todayNet),
          uniqueBuyers: todayBucket?.buyers.size ?? 0,
        },
        byDay: salesByDay,
        bySource: Object.entries(salesBySourceMap)
          .map(([name, v]) => ({
            name,
            count: v.count,
            revenue: round2(v.revenue),
            refunds: round2(v.refunds),
            chargebacks: round2(v.chargebacks),
            netRevenue: round2(v.revenue - v.refunds - v.chargebacks),
          }))
          .sort((a, b) => b.netRevenue - a.netRevenue)
          .slice(0, 20),
        byProduct: Object.entries(salesByProductMap)
          .map(([key, v]) => ({
            key,
            label: v.label,
            count: v.count,
            revenue: round2(v.revenue),
            refunds: round2(v.refunds),
            chargebacks: round2(v.chargebacks),
            netRevenue: round2(v.revenue - v.refunds - v.chargebacks),
          }))
          .sort((a, b) => b.netRevenue - a.netRevenue),
        feed: saleFeed,
      },
      sources: sortObj(sourceHistory),
      campaigns: sortObj(campaignHistory),
      blackCountries: Object.entries(blackCountryVisitors)
        .map(([code, set]) => ({
          code,
          name: code,
          count: set.size,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 30),
      landings: sortObj(landingHistory),
      reasons: sortObj(reasonCounts),
      botHuman,
      paramStats,
      feed: historyFeed,
    },
    stageLabels: STAGE_LABELS,
    reasonLabels: REASON_LABELS,
  });
}
