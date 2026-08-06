/**
 * Build cancel-recovery email HTML (card refused) — 7 emails.
 * Run: node scripts/build-cancel-emails.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "docs", "cancel-emails");
fs.mkdirSync(dir, { recursive: true });

// Direct PerfectPay / CenterPag (no mysafelinkspy /go/ redirect)
const GO39 = "https://go.centerpag.com/PPU38CQEHD1";
const GO29 = "https://go.centerpag.com/PPU38CQEKTG";

function shell(inner) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;background:#f0f2f5;">
${inner}
          <tr>
            <td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">App Spy · If you already purchased, ignore this email.</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function header(kicker, title) {
  return `          <tr>
            <td style="background:#128C7E;padding:14px 16px;border-radius:12px 12px 0 0;">
              <div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,.85);text-transform:uppercase;">${kicker}</div>
              <div style="font-size:18px;font-weight:800;color:#ffffff;margin-top:4px;line-height:1.25;">${title}</div>
            </td>
          </tr>`;
}

function profile(statusLine) {
  return `          <tr>
            <td style="background:#ffffff;padding:14px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e9edef;border-radius:14px;">
                <tr>
                  <td style="padding:12px 14px;">
                    <table role="presentation" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="width:48px;height:48px;border-radius:50%;background:#e9edef;border:2px solid #25D366;text-align:center;vertical-align:middle;font-size:20px;">👤</td>
                        <td style="padding-left:12px;">
                          <div style="font-size:15px;font-weight:700;color:#111b21;">{{ $json.phone || 'Number you searched' }}</div>
                          <div style="font-size:12px;color:#667781;margin-top:2px;">${statusLine}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function banner(bg, border, titleColor, title, sub) {
  return `          <tr>
            <td style="background:#ffffff;padding:0 16px 12px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">
              <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:12px 14px;text-align:center;">
                <div style="font-size:15px;font-weight:800;color:${titleColor};">${title}</div>
                <div style="font-size:12px;color:#667781;margin-top:4px;">${sub}</div>
              </div>
            </td>
          </tr>`;
}

function bodyCard(html) {
  return `          <tr>
            <td style="background:#ffffff;padding:0 16px 12px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">
              <div style="background:#ffffff;border:1px solid #e9edef;border-radius:14px;padding:14px;">
${html}
              </div>
            </td>
          </tr>`;
}

function ctaBox({ badge, href, ctaMain, ctaSub, campaign, plan }) {
  const url =
    href +
    "?name={{ $json.name }}&email={{ $json.email }}&phone={{ $json.phone }}&plan=" +
    plan +
    "&utm_source=email_cancel&utm_medium=email&utm_campaign=" +
    campaign +
    "&src=email_cancel&sck=" +
    campaign;
  return `          <tr>
            <td style="background:#ffffff;padding:0 16px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;border-bottom:1px solid #e9edef;border-radius:0 0 12px 12px;">
              <div style="background:#ffffff;border:2px solid #25D366;border-radius:16px;padding:18px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">
                <div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;color:#ef4444;margin-bottom:12px;">${badge}</div>
                <div style="font-size:11px;color:#667781;margin-bottom:14px;"><span style="color:#128C7E;font-weight:600;">One-time payment</span> · Lifetime access · 30-day guarantee</div>
                <a href="${url}" style="display:block;background:#25D366;background:linear-gradient(135deg,#25D366,#22c55e);color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">
                  ${ctaMain}<br>
                  <span style="font-size:11px;font-weight:600;opacity:.9;">${ctaSub}</span>
                </a>
                <div style="margin-top:12px;font-size:11px;color:#667781;">🔒 Secure payment · Access in up to 2 minutes</div>
              </div>
            </td>
          </tr>`;
}

const emails = {
  // —— $39 phase (validated + bridge) ——
  c1: shell(
    header("App Spy", "We noticed an issue with your order") +
      profile("Order incomplete · Results still saved") +
      banner(
        "#fef2f2",
        "#fecaca",
        "#ef4444",
        "⚠️ Payment not completed",
        "Hi {{ $json.name || 'there' }} — your search results are still saved and ready."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">We noticed there was an issue processing your recent order. Don't worry — your search results are still saved and ready for you.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">If there was a problem with your payment method, you can try again using a different card or payment option.</div>
                <div style="font-size:13px;font-weight:700;color:#111b21;margin-bottom:8px;">What is still locked for you:</div>
                <div style="padding:8px 0;border-bottom:1px solid #e9edef;font-size:13px;color:#111b21;">💬 Deleted messages recovered <span style="font-size:10px;font-weight:700;background:#fee2e2;color:#ef4444;border-radius:3px;padding:1px 6px;margin-left:4px;">LOCKED</span></div>
                <div style="padding:8px 0;border-bottom:1px solid #e9edef;font-size:13px;color:#111b21;">📸 Photos &amp; videos <span style="font-size:10px;font-weight:700;background:#fee2e2;color:#ef4444;border-radius:3px;padding:1px 6px;margin-left:4px;">LOCKED</span></div>
                <div style="padding:8px 0;font-size:13px;color:#111b21;">📍 Location history <span style="font-size:10px;font-weight:700;background:#fee2e2;color:#ef4444;border-radius:3px;padding:1px 6px;margin-left:4px;">READY</span></div>`) +
      ctaBox({
        badge: "COMPLETE YOUR ORDER",
        href: GO39,
        ctaMain: "✅ COMPLETE MY ORDER — $39",
        ctaSub: "Secure checkout",
        campaign: "cancel_e1",
        plan: "full",
      })
  ),

  c2: shell(
    header("App Spy", "Your results are still waiting for you") +
      profile("Scan ready · Waiting for unlock") +
      banner(
        "#f0fdf4",
        "#bbf7d0",
        "#128C7E",
        "✅ Your report is still available",
        "Hi {{ $json.name || 'there' }} — quick follow-up for <strong style=\"color:#111b21;\">{{ $json.phone || 'the number you searched' }}</strong>."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Just a quick follow-up — your search results are still available and waiting for you to access them.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">We understand that sometimes things don't go as planned. If you'd like to try again, we've made it easy for you.</div>
                <div style="background:#f8f8f8;border-radius:10px;padding:12px;margin-top:4px;">
                  <div style="font-size:12px;font-weight:700;color:#111b21;margin-bottom:8px;">Still locked inside your report:</div>
                  <div style="font-size:12px;color:#667781;line-height:1.6;">• Deleted chats recovered<br>• Profile photos &amp; media<br>• Social signals &amp; activity history</div>
                </div>`) +
      ctaBox({
        badge: "RESULTS STILL SAVED",
        href: GO39,
        ctaMain: "🔓 ACCESS MY REPORT — $39",
        ctaSub: "Secure checkout",
        campaign: "cancel_e2",
        plan: "full",
      })
  ),

  c3: shell(
    header("App Spy", "Your report is still locked") +
      profile("Incomplete order · Data on hold") +
      banner(
        "#fff7ed",
        "#fed7aa",
        "#c2410c",
        "🔒 Still locked for you",
        "Hi {{ $json.name || 'there' }} — one more chance to open results for <strong style=\"color:#111b21;\">{{ $json.phone || 'the number you searched' }}</strong>."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Your order never fully went through, but everything we found is still saved on our side.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">You don't need to start over — just complete checkout with a working card or payment method and unlock the full report.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;">Deleted messages, photos, social profiles and activity history are ready when you are.</div>`) +
      ctaBox({
        badge: "FINISH UNLOCK",
        href: GO39,
        ctaMain: "🔓 UNLOCK MY REPORT — $39",
        ctaSub: "Secure checkout",
        campaign: "cancel_e3",
        plan: "full",
      })
  ),

  // —— $29 discount phase (validated offer + extensions) ——
  c4: shell(
    header("App Spy", "A special offer just for you") +
      profile("Exclusive discount · Full report") +
      banner(
        "#f0fdf4",
        "#bbf7d0",
        "#128C7E",
        "🎁 25% OFF — thank you for trying us",
        "Hi {{ $json.name || 'there' }} — keep everything we found for just $29."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">As a thank you for trying our service, we'd like to offer you a special <strong>25% discount</strong> on your full report.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Your original price was <strong>$39</strong>. With this offer, you can access everything for just <strong style="color:#128C7E;">$29</strong>.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;">This includes all the data we found: profile photos, social media profiles, deleted messages, and more.</div>`) +
      ctaBox({
        badge: "25% OFF · EXCLUSIVE",
        href: GO29,
        ctaMain: "🔓 GET MY REPORT — $29",
        ctaSub: "Redeem discount · limited offer",
        campaign: "cancel_e4",
        plan: "backredirect",
      })
  ),

  c5: shell(
    header("App Spy", "Your 25% discount is still available") +
      profile("Discount open · Full report") +
      banner(
        "#f0fdf4",
        "#bbf7d0",
        "#128C7E",
        "💚 $29 offer still active",
        "Hi {{ $json.name || 'there' }} — we held your exclusive price a little longer."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Just checking in — your special 25% discount is still available if you want to finish your order.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Full report for <strong style="color:#128C7E;">$29</strong> (was $39): deleted chats, photos, social profiles and activity history.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;">Click below whenever you're ready — no need to re-enter your search.</div>`) +
      ctaBox({
        badge: "25% OFF STILL OPEN",
        href: GO29,
        ctaMain: "🔓 CLAIM $29 ACCESS",
        ctaSub: "Same discount · secure checkout",
        campaign: "cancel_e5",
        plan: "backredirect",
      })
  ),

  c6: shell(
    header("App Spy", "Don't lose access to what we found") +
      profile("Offer ending soon · Full report") +
      banner(
        "#fef2f2",
        "#fecaca",
        "#ef4444",
        "⏳ Discount ending soon",
        "Hi {{ $json.name || 'there' }} — only a short window left at $29."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Your incomplete order is still on file, and the 25% discount is close to expiring.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">If you still want the full report for <strong style="color:#128C7E;">$29</strong>, this is a good time to complete it — before the offer closes.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;">Everything stays private, remote, and ready after checkout.</div>`) +
      ctaBox({
        badge: "ENDING SOON · 25% OFF",
        href: GO29,
        ctaMain: "🔓 KEEP MY $29 OFFER",
        ctaSub: "Secure checkout · limited time",
        campaign: "cancel_e6",
        plan: "backredirect",
      })
  ),

  c7: shell(
    header("App Spy", "Final notice: incomplete order") +
      profile("Last email · Discount closes") +
      banner(
        "#fef2f2",
        "#fecaca",
        "#ef4444",
        "📩 Final email from us",
        "Hi {{ $json.name || 'there' }} — we won't keep following up after this."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">This is the last reminder about your incomplete order and the special <strong style="color:#128C7E;">$29</strong> price (25% off).</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">If you still want access to the data we found — profile photos, social profiles, deleted messages and more — redeem it now.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;">If not, you can ignore this email and we won't send more about this order.</div>`) +
      ctaBox({
        badge: "FINAL NOTICE · 25% OFF",
        href: GO29,
        ctaMain: "🎁 REDEEM DISCOUNT — $29",
        ctaSub: "Last email · secure checkout",
        campaign: "cancel_e7",
        plan: "backredirect",
      })
  ),
};

function toPreview(html) {
  return html
    .replaceAll("{{ $json.name || 'there' }}", "Alex")
    .replaceAll("{{ $json.name }}", "Alex")
    .replaceAll("{{ $json.phone || 'Number you searched' }}", "+1 555 123 4567")
    .replaceAll("{{ $json.phone || 'the number you searched' }}", "+1 555 123 4567")
    .replaceAll("{{ $json.phone }}", "+15551234567")
    .replaceAll("{{ $json.email }}", "alex@example.com");
}

for (const [key, html] of Object.entries(emails)) {
  const name = `${key}.html`;
  fs.writeFileSync(path.join(dir, name), html, "utf8");
  fs.writeFileSync(path.join(dir, `${key}-preview.html`), toPreview(html), "utf8");
  console.log("wrote", name, html.length, "bytes");
}

console.log("OK →", dir, "(7 emails)");
