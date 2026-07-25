import { NextRequest, NextResponse } from "next/server";
import {
  upsertPresence,
  pushEvent,
  stageFromPage,
  detectDevice,
  extractIp,
  type Presence,
  type AnalyticsEvent,
} from "@/lib/analytics/store";
import { resolveAnalyticsReason } from "@/lib/analytics/reason";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const visitorId = String(body.visitorId || "").slice(0, 80);
    if (!visitorId) {
      return NextResponse.json({ error: "visitorId required" }, { status: 400 });
    }

    const page = String(body.page || "/").slice(0, 300);
    let layer = (body.layer === "white" || body.layer === "black"
      ? body.layer
      : "unknown") as Presence["layer"];
    // Prefer cookie layer when client sends unknown
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
    const stage =
      String(body.stage || "").slice(0, 40) || stageFromPage(page);
    const source = String(body.source || "direct").slice(0, 80);
    const landing = String(body.landing || page).slice(0, 300);
    const utmSource = String(body.utmSource || "").slice(0, 80);
    const utmMedium = String(body.utmMedium || "").slice(0, 80);
    const utmCampaign = String(body.utmCampaign || "").slice(0, 120);
    const country =
      String(body.country || "").slice(0, 8) ||
      (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
    const domain =
      String(body.domain || "").slice(0, 120) ||
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "";
    const ua = req.headers.get("user-agent") || String(body.ua || "");
    const ip = extractIp(req.headers).slice(0, 64);
    // Prefer server device (Meta IPs → Bot even if client sent "Mobile")
    const device = String(detectDevice(ua, ip) || body.device || "Desconhecido").slice(
      0,
      40
    );

    const meta: Record<string, unknown> =
      body.meta && typeof body.meta === "object"
        ? { ...(body.meta as Record<string, unknown>) }
        : {};

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

    // HARD RULE: bots always recorded as WHITE (never black in dashboard)
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

    const ts = Date.now();

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

    // Always write history for pageview/layer/checkout.
    const shouldLog =
      body.event === "pageview" ||
      body.event === "layer" ||
      body.event === "checkout_click" ||
      body.type === "checkout_click" ||
      body.logHistory === true ||
      body.event === "heartbeat_log" ||
      stage === "checkout";

    if (shouldLog) {
      const isCheckout =
        body.event === "checkout_click" ||
        body.type === "checkout_click" ||
        stage === "checkout";

      // Promote plan fields into meta
      if (body.checkoutValue != null && meta.value == null) {
        meta.value = body.checkoutValue;
      }
      if (body.checkoutTier != null && meta.tier == null) {
        meta.tier = body.checkoutTier;
      }
      if (body.planLabel != null && meta.planLabel == null) {
        meta.planLabel = body.planLabel;
      }
      // Ad placement (Instagram_Feed, Facebook_Mobile_Reels…)
      if (body.placement != null && meta.placement == null) {
        meta.placement = String(body.placement).slice(0, 120);
      }
      if (body.utmContent != null && meta.utmContent == null) {
        meta.utmContent = String(body.utmContent).slice(0, 120);
      }

      const evType = isCheckout
        ? "checkout_click"
        : body.event === "layer"
          ? "layer"
          : "pageview";

      const ev: AnalyticsEvent = {
        id: `${ts}_${Math.random().toString(36).slice(2, 8)}`,
        type: evType,
        visitorId,
        page,
        stage: isBot ? "white" : isCheckout ? "checkout" : stage,
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
          value: meta.value ?? body.checkoutValue ?? null,
          tier: meta.tier ?? body.checkoutTier ?? null,
          planLabel: meta.planLabel ?? body.planLabel ?? null,
        },
        ts,
      };
      const pushed = await pushEvent(ev);
      return NextResponse.json({
        ok: true,
        ts,
        reason,
        reasonLabel,
        logged: true,
        eventType: evType,
        pushed,
      });
    }

    return NextResponse.json({ ok: true, ts, reason, reasonLabel, logged: false });
  } catch (e) {
    console.error("heartbeat error", e);
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
