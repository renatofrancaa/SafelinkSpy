import { NextRequest, NextResponse } from "next/server";
import { pushEvent, type AnalyticsEvent } from "@/lib/analytics/store";
import { extractClientIp } from "@/utils/botDetect";
import { detectDevice } from "@/lib/analytics/store";

export const dynamic = "force-dynamic";

/**
 * Lead capture from funnel Step 5 (name + email).
 * Forwards to n8n webhook when N8N_LEAD_WEBHOOK_URL is set (Resend recovery sequence).
 *
 * Body: { email, name, phone?, visitorId?, utmSource?, utmMedium?, utmCampaign?, page? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const email = String(body.email || "")
      .trim()
      .toLowerCase()
      .slice(0, 200);
    const name = String(body.name || "").trim().slice(0, 120);

    if (!email || !email.includes("@") || !name) {
      return NextResponse.json(
        { error: "name and valid email required" },
        { status: 400 }
      );
    }

    const phone = String(body.phone || "").trim().slice(0, 40);
    const visitorId = String(body.visitorId || body.visitor_id || "")
      .trim()
      .slice(0, 80);
    const utmSource = String(body.utmSource || body.utm_source || "").slice(0, 80);
    const utmMedium = String(body.utmMedium || body.utm_medium || "").slice(0, 80);
    const utmCampaign = String(
      body.utmCampaign || body.utm_campaign || ""
    ).slice(0, 120);
    const page = String(body.page || "/step5.html").slice(0, 300);
    const ts = Date.now();
    const ip = extractClientIp(req.headers).slice(0, 64);
    const ua = req.headers.get("user-agent") || "";
    const country = (
      req.headers.get("x-vercel-ip-country") || ""
    ).toUpperCase();
    const device = detectDevice(ua, ip);

    const payload = {
      email,
      name,
      phone,
      visitor_id: visitorId || undefined,
      visitorId: visitorId || undefined,
      utm_source: utmSource || undefined,
      utm_medium: utmMedium || undefined,
      utm_campaign: utmCampaign || undefined,
      page,
      stage: "lead_captured",
      event: "email_captured",
      status: "pending",
      ts,
      country: country || undefined,
      source: "funnel_step5",
    };

    // Best-effort analytics (doesn't block recovery)
    try {
      if (visitorId) {
        const ev: AnalyticsEvent = {
          id: `lead_${visitorId}_${ts.toString(36)}`,
          type: "lead_capture",
          visitorId,
          page,
          stage: "lead_captured",
          layer: "black",
          source: utmSource || "direct",
          landing: page,
          utmSource,
          utmMedium,
          utmCampaign,
          country,
          domain: req.headers.get("host") || "",
          ip,
          device,
          reason: "lead_capture",
          reasonLabel: "Nome e e-mail capturados",
          isBot: false,
          hasParam: !!utmSource,
          meta: {
            email,
            name,
            phone,
            event: "email_captured",
          },
          ts,
        };
        await pushEvent(ev);
      }
    } catch (e) {
      console.error("lead_capture analytics failed", e);
    }

    // Forward to n8n (Resend sequence lives there)
    const n8nUrl = (process.env.N8N_LEAD_WEBHOOK_URL || "").trim();
    let n8nOk = false;
    let n8nStatus: number | null = null;
    if (n8nUrl) {
      try {
        const secret = process.env.N8N_WEBHOOK_SECRET || "";
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (secret) headers["x-webhook-secret"] = secret;

        const res = await fetch(n8nUrl, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          cache: "no-store",
          signal: AbortSignal.timeout(8000),
        });
        n8nStatus = res.status;
        n8nOk = res.ok;
        if (!res.ok) {
          const t = await res.text().catch(() => "");
          console.error("n8n lead webhook failed", res.status, t.slice(0, 200));
        }
      } catch (e) {
        console.error("n8n lead webhook error", e);
      }
    }

    return NextResponse.json({
      ok: true,
      forwarded: n8nOk,
      n8nConfigured: !!n8nUrl,
      n8nStatus,
    });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
