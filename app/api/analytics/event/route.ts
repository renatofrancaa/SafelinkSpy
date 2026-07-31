import { NextRequest, NextResponse } from "next/server";
import {
  pushEvent,
  upsertPresence,
  stageFromPage,
  detectDevice,
  type AnalyticsEvent,
  type Presence,
} from "@/lib/analytics/store";
import { resolveAnalyticsReason } from "@/lib/analytics/reason";
import { extractClientIp } from "@/utils/botDetect";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const visitorId = String(body.visitorId || "").slice(0, 80);
    const type = String(body.type || "custom").slice(0, 60);
    if (!visitorId || !type) {
      return NextResponse.json({ error: "missing fields" }, { status: 400 });
    }

    const page = String(body.page || "/").slice(0, 300);
    // Direct-link funnel: always black unless explicitly white (legacy)
    let layer = (body.layer === "white" || body.layer === "black"
      ? body.layer
      : "black") as AnalyticsEvent["layer"];
    if (page.toLowerCase().includes("famguard")) layer = "white";
    let stage = String(body.stage || stageFromPage(page)).slice(0, 40);
    // Always tag checkout clicks as stage=checkout
    if (type === "checkout_click") stage = "checkout";
    const ua = req.headers.get("user-agent") || String(body.ua || "");
    const meta =
      body.meta && typeof body.meta === "object"
        ? { ...(body.meta as Record<string, unknown>) }
        : {};
    // Promote top-level checkout fields into meta (client may send both)
    if (body.checkoutValue != null && meta.value == null) {
      meta.value = body.checkoutValue;
    }
    if (body.checkoutTier != null && meta.tier == null) {
      meta.tier = body.checkoutTier;
    }
    if (body.planLabel != null && meta.planLabel == null) {
      meta.planLabel = body.planLabel;
    }
    if (body.value != null && meta.value == null) meta.value = body.value;
    if (body.tier != null && meta.tier == null) meta.tier = body.tier;
    const ts = Date.now();

    const country =
      String(body.country || "").slice(0, 8) ||
      (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
    const domain =
      String(body.domain || "").slice(0, 120) ||
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "";
    const ip = extractClientIp(req.headers).slice(0, 64);
    const device = String(detectDevice(ua, ip) || body.device || "Desconhecido").slice(
      0,
      40
    );

    const resolved = resolveAnalyticsReason(req, {
      bodyReason: body.reason != null ? String(body.reason) : undefined,
      bodyReasonLabel:
        body.reasonLabel != null ? String(body.reasonLabel) : undefined,
      bodyIsBot: typeof body.isBot === "boolean" ? body.isBot : null,
      bodyHasParam: typeof body.hasParam === "boolean" ? body.hasParam : null,
      layer,
      ua: String(body.ua || ua),
      device,
      meta,
    });
    let { reason, reasonLabel, isBot, hasParam } = resolved;

    if (isBot === true || device === "Bot") {
      isBot = true;
    }

    const source = String(body.source || "direct").slice(0, 80);
    const landing = String(body.landing || page).slice(0, 300);
    const utmSource = String(body.utmSource || "").slice(0, 80);
    const utmMedium = String(body.utmMedium || "").slice(0, 80);
    const utmCampaign = String(body.utmCampaign || "").slice(0, 120);

    const ev: AnalyticsEvent = {
      id: `${ts}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      visitorId,
      page,
      stage,
      layer,
      source,
      landing,
      utmSource,
      utmMedium,
      utmCampaign,
      country,
      domain,
      ip,
      device,
      reason,
      reasonLabel,
      isBot,
      hasParam,
      meta: {
        ...meta,
        reason,
        reasonLabel,
        isBot,
        hasCatParam: hasParam,
      },
      ts,
    };
    await pushEvent(ev);

    // Refresh presence so maxStage advances on checkout etc.
    const presence: Presence = {
      visitorId,
      page,
      stage,
      maxStage: stage,
      layer,
      source,
      landing,
      utmSource,
      utmMedium,
      utmCampaign,
      country,
      domain,
      ip,
      device,
      reason,
      reasonLabel,
      isBot,
      hasParam,
      ts,
      firstSeen: ts,
    };
    await upsertPresence(presence);

    return NextResponse.json({ ok: true, reason, reasonLabel });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
