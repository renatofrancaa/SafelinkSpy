import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { getLayerDecision } from "@/utils/ContentFilter";
import {
  pushEvent,
  upsertPresence,
  detectDevice,
  extractIp,
} from "@/lib/analytics/store";

/**
 * Entry fallback when middleware does not rewrite/redirect.
 *  white → famguard iframe (URL stays "/")
 *  black → funnel /index.html
 */
export default async function HomePage() {
  const decision = await getLayerDecision();
  const isWhite = decision.layer === 1;
  const layer = decision.layerName;
  const page = isWhite ? "/" : "/index.html";

  const hdrs = await headers();
  const cks = await cookies();
  const url = hdrs.get("x-url") || "";
  const host =
    hdrs.get("x-forwarded-host") ||
    hdrs.get("host") ||
    hdrs.get("x-host") ||
    "";
  const ua = hdrs.get("user-agent") || "";
  const ip = extractIp(hdrs);
  const device = detectDevice(ua, ip);
  const visitorId =
    cks.get("zs_vid")?.value ||
    cks.get("funnelVisitorId")?.value ||
    `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const jar = await cookies();
    const base = { path: "/", maxAge: 60 * 60 * 6 } as const;
    jar.set("zs_layer", layer, base);
    jar.set("zs_reason", decision.reason, base);
    jar.set("zs_reason_label", decision.reasonLabel, base);
    jar.set("zs_is_bot", decision.isBot ? "1" : "0", base);
    jar.set(
      "zs_has_param",
      decision.hasCatParam || decision.hasCatCookie || decision.hasTestParam
        ? "1"
        : "0",
      base
    );
    jar.set("zs_vid", visitorId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  } catch (e) {
    console.error("cookie set failed", e);
  }

  try {
    const ts = Date.now();
    const common = {
      visitorId,
      page,
      stage: isWhite ? "white" : "entry",
      layer,
      source: decision.adSource || "entry",
      landing: url || page,
      utmSource: "",
      utmMedium: "",
      utmCampaign: "",
      country: decision.country,
      domain: host,
      ip,
      device,
      reason: decision.reason,
      reasonLabel: decision.reasonLabel,
      isBot: decision.isBot,
      hasParam:
        decision.hasCatParam ||
        decision.hasCatCookie ||
        decision.hasTestParam,
      ts,
    };

    await pushEvent({
      id: `${ts}_${Math.random().toString(36).slice(2, 8)}`,
      type: "layer",
      ...common,
      meta: {
        reason: decision.reason,
        reasonLabel: decision.reasonLabel,
        isBot: decision.isBot,
        isHuman: decision.isHuman,
        hasCatParam: decision.hasCatParam,
        hasCatCookie: decision.hasCatCookie,
        hasForceBlack: decision.hasForceBlack,
        hasTestParam: decision.hasTestParam,
        adSource: decision.adSource,
        language: decision.language,
        userLayer: decision.layer,
      },
    });

    await upsertPresence({
      ...common,
      maxStage: common.stage,
      firstSeen: ts,
    });
  } catch (e) {
    console.error("layer log failed", e);
  }

  if (isWhite) {
    return (
      <iframe
        src="/famguard.html"
        title="Safe"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          border: 0,
          margin: 0,
          padding: 0,
          display: "block",
          background: "#0b0f14",
        }}
      />
    );
  }

  redirect("/index.html");
}
