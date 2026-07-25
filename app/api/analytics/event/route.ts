import { NextRequest, NextResponse } from "next/server";
import {
  pushEvent,
  upsertPresence,
  stageFromPage,
  detectDevice,
  extractIp,
  type AnalyticsEvent,
  type Presence,
} from "@/lib/analytics/store";
import { resolveAnalyticsReason } from "@/lib/analytics/reason";

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
    let layer = (body.layer === "white" || body.layer === "black"
      ? body.layer
      : "unknown") as AnalyticsEvent["layer"];
    if (layer === "unknown") {
      const cl = req.cookies.get("zs_layer")?.value;
      if (cl === "white" || cl === "black") layer = cl;
      else if (page.toLowerCase().includes("famguard")) layer = "white";
      else if (
        page.toLowerCase().includes("step") ||
        page.toLowerCase().includes("index") ||
        page.toLowerCase().includes("/en-m")
      )
        layer = "black";
    }
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
    const ip = extractIp(req.headers).slice(0, 64);
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

    // HARD RULE: bots always WHITE in analytics
    if (isBot === true || device === "Bot") {
      isBot = true;
      layer = "white";
      if (
        !reason ||
        reason === "clean" ||
        reason === "cat_cookie" ||
        String(reasonLabel).includes("passou em todos")
      ) {
        reason = "meta_ip";
        reasonLabel = "Bot Meta (IP datacenter Facebook)";
      }
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
      stage: isBot ? "white" : stage,
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
      stage: isBot ? "white" : stage,
      maxStage: isBot ? "white" : stage,
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
