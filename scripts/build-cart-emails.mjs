/**
 * Cart-abandon emails — 7 sequence.
 * Benefits-focused (sales page promises), emotion + urgency.
 * Checkout: $29 PPU38CQEKTG · $19.50 PPU38CQEO73
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "docs", "cart-abandon");
fs.mkdirSync(dir, { recursive: true });

// Direct PerfectPay / CenterPag (no mysafelinkspy /go/ redirect)
const GO29 = "https://go.centerpag.com/PPU38CQEKTG";
const GO195 = "https://go.centerpag.com/PPU38CQEO73";

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
            <td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">App Spy · Private &amp; remote · If you already unlocked, ignore this email.</td>
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

function benefitsBlock(variant = "full") {
  if (variant === "short") {
    return `                <div style="background:#f8f8f8;border-radius:12px;padding:12px 14px;margin-top:10px;">
                  <div style="font-size:12px;font-weight:800;color:#111b21;margin-bottom:8px;">What you unlock instantly:</div>
                  <div style="font-size:12px;color:#111b21;line-height:1.7;">💬 Deleted &amp; archived messages<br>📸 Photos &amp; videos (including deleted)<br>👻 Secret / disappearing chats<br>📍 Real-time location history<br>📱 Full WhatsApp activity monitor</div>
                </div>`;
  }
  return `                <div style="font-size:13px;font-weight:800;color:#111b21;margin:12px 0 8px;">Still locked for {{ $json.phone || 'the number you searched' }}:</div>
                <div style="padding:8px 0;border-bottom:1px solid #e9edef;font-size:13px;color:#111b21;">💬 Deleted messages recovered <span style="font-size:10px;font-weight:700;background:#fee2e2;color:#ef4444;border-radius:3px;padding:1px 6px;margin-left:4px;">LOCKED</span></div>
                <div style="padding:8px 0;border-bottom:1px solid #e9edef;font-size:13px;color:#111b21;">📸 Photos &amp; videos they shared <span style="font-size:10px;font-weight:700;background:#fee2e2;color:#ef4444;border-radius:3px;padding:1px 6px;margin-left:4px;">BLURRED</span></div>
                <div style="padding:8px 0;border-bottom:1px solid #e9edef;font-size:13px;color:#111b21;">👻 Secret chats &amp; auto-delete threads <span style="font-size:10px;font-weight:700;background:#fef2f2;color:#ef4444;border-radius:3px;padding:1px 6px;margin-left:4px;">HIDDEN</span></div>
                <div style="padding:8px 0;border-bottom:1px solid #e9edef;font-size:13px;color:#111b21;">📍 Location history &amp; GPS trail <span style="font-size:10px;font-weight:700;background:#fee2e2;color:#ef4444;border-radius:3px;padding:1px 6px;margin-left:4px;">READY</span></div>
                <div style="padding:8px 0;font-size:13px;color:#111b21;">📱 Full activity dashboard <span style="font-size:10px;font-weight:700;background:#f0fdf4;color:#128C7E;border-radius:3px;padding:1px 6px;margin-left:4px;">1-CLICK</span></div>`;
}

function ctaBox({ badge, href, ctaMain, ctaSub, campaign, plan }) {
  // UTMify "Vendas por Fonte" ≈ utm_source / src (like Reportana rptn)
  const url =
    href +
    "?name={{ $json.name }}&email={{ $json.email }}&phone={{ $json.phone }}&plan=" +
    plan +
    "&utm_source=email_cart&utm_medium=email&utm_campaign=" +
    campaign +
    "&src=email_cart&sck=" +
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
                <div style="margin-top:12px;font-size:11px;color:#667781;">🔒 Private &amp; remote · No install on their phone</div>
              </div>
            </td>
          </tr>`;
}

const emails = {
  a1: shell(
    header("App Spy", "A gift from us to you") +
      profile("Scan ready · Access still locked") +
      banner(
        "#f0fdf4",
        "#bbf7d0",
        "#128C7E",
        "🎁 25% OFF — exclusive gift",
        "Hi {{ $json.name || 'there' }} — we recovered data for {{ $json.phone || 'the number you searched' }}."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">You started unlocking the truth… then stopped. The deleted messages, secret chats, and photos we found are still waiting behind the lock.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">As a thank-you for your interest, take <strong>25% off</strong> today — full access for just <strong style="color:#128C7E;">$29</strong> <span style="color:#667781;">(was $39)</span>.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;">Most people who come back say the same thing: <em style="color:#111b21;">"I just needed to know."</em> Don't leave yourself guessing.</div>
${benefitsBlock("full")}`) +
      ctaBox({
        badge: "25% OFF · LIMITED",
        href: GO29,
        ctaMain: "🔓 UNLOCK DELETED MESSAGES — $29",
        ctaSub: "Reveal everything · one-time payment",
        campaign: "cart_a1",
        plan: "backredirect",
      })
  ),

  a2: shell(
    header("App Spy", "Those deleted messages are still locked") +
      profile("Recovery complete · Waiting for unlock") +
      banner(
        "#fef2f2",
        "#fecaca",
        "#ef4444",
        "⚠️ Conversations still hidden from you",
        "Hi {{ $json.name || 'there' }} — {{ $json.phone || 'the number you searched' }} won't stay paused forever."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Every hour you wait is another hour of not knowing what was deleted, who they messaged at 2 AM, or which photos disappeared.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Your exclusive gift is still open: full App Spy access for <strong style="color:#128C7E;">$29</strong> (25% off).</div>
                <div style="background:#f8f8f8;border-left:3px solid #ef4444;border-radius:12px;padding:12px 14px;font-size:13px;color:#111b21;line-height:1.5;margin:10px 0;">"Don't tell <span style="background:#111b21;color:#111b21;border-radius:3px;">████████</span> that we <span style="background:#111b21;color:#111b21;border-radius:3px;">██████</span>…"</div>
                <div style="font-size:12px;color:#667781;margin-bottom:8px;">Deleted fragment recovered · <span style="color:#25D366;font-weight:700;">Unlock to read the full thread</span></div>
${benefitsBlock("short")}`) +
      ctaBox({
        badge: "25% OFF STILL OPEN",
        href: GO29,
        ctaMain: "🔓 REVEAL FULL CHATS — $29",
        ctaSub: "Secure unlock · target report",
        campaign: "cart_a2",
        plan: "backredirect",
      })
  ),

  a3: shell(
    header("App Spy", "Don't leave the truth locked") +
      profile("Access incomplete · Data on hold") +
      banner(
        "#fff7ed",
        "#fed7aa",
        "#c2410c",
        "⏳ Your $29 unlock is still available",
        "Hi {{ $json.name || 'there' }} — finish before this gift expires."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">You already did the hard part — the scan. Deleted WhatsApp messages, auto-deleted photos, secret chats, and location trails are ready.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">All that's left is one click. Full lifetime access for <strong style="color:#128C7E;">$29</strong> (was $39) — private, remote, no install on their phone.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;">If something feels off, you deserve answers — not more uncertainty.</div>
${benefitsBlock("short")}`) +
      ctaBox({
        badge: "COMPLETE UNLOCK · 25% OFF",
        href: GO29,
        ctaMain: "🔓 GET FULL ACCESS — $29",
        ctaSub: "Deleted msgs · photos · GPS · dashboard",
        campaign: "cart_a3",
        plan: "backredirect",
      })
  ),

  a4: shell(
    header("App Spy", "Our best offer for your report") +
      profile("50% OFF · Everything unlocked") +
      banner(
        "#f0fdf4",
        "#bbf7d0",
        "#128C7E",
        "🏆 50% OFF — strongest deal we can offer",
        "Hi {{ $json.name || 'there' }} — full access for only $19.50."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">This is the best possible deal. We're cutting the price in half so you can finally see <strong>everything</strong> — without risk.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Complete App Spy access for just <strong style="color:#128C7E;">$19.50</strong> <span style="color:#667781;">(originally $39)</span>.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:6px;"><strong>You get the full package promised on the sales page:</strong></div>
                <div style="font-size:12px;color:#111b21;line-height:1.75;margin-bottom:10px;">💬 All deleted &amp; archived messages<br>📸 Shared photos &amp; videos (including deleted)<br>👻 Secret chats &amp; disappearing messages<br>📍 Live location / GPS history<br>📱 WhatsApp monitor + full activity dashboard<br>🛡️ 30-day money-back guarantee — zero risk</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;">Stop wondering. Open the truth while this price is live.</div>`) +
      ctaBox({
        badge: "50% OFF · BEST OFFER",
        href: GO195,
        ctaMain: "🔓 UNLOCK EVERYTHING — $19.50",
        ctaSub: "Half price · 30-day guarantee",
        campaign: "cart_a4",
        plan: "cart_deep",
      })
  ),

  a5: shell(
    header("App Spy", "Your $19.50 unlock is still open") +
      profile("Half price · Full access held") +
      banner(
        "#f0fdf4",
        "#bbf7d0",
        "#128C7E",
        "💚 Best price still active",
        "Hi {{ $json.name || 'there' }} — we kept $19.50 for you a little longer."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Quick reminder: your exclusive <strong>50% off</strong> is still live. Deleted chats, photos, secret conversations, and location history for {{ $json.phone || 'the number you searched' }} are one unlock away.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Full access for <strong style="color:#128C7E;">$19.50</strong> (was $39) — same promises as the sales page, half the price.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;">Covered by our 30-day money-back guarantee. If you don't need answers… you can ignore this. If you do — this is the moment.</div>
${benefitsBlock("short")}`) +
      ctaBox({
        badge: "50% OFF STILL OPEN",
        href: GO195,
        ctaMain: "🔓 CLAIM $19.50 ACCESS NOW",
        ctaSub: "Deleted messages · media · GPS · dashboard",
        campaign: "cart_a5",
        plan: "cart_deep",
      })
  ),

  a6: shell(
    header("App Spy", "Last chance at $19.50") +
      profile("Offer ending · Data still locked") +
      banner(
        "#fef2f2",
        "#fecaca",
        "#ef4444",
        "⏳ 50% OFF closing soon",
        "Hi {{ $json.name || 'there' }} — only a short window left at half price."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;"><strong>This is almost over.</strong> After this offer, the deep discount disappears — and you may never see what was deleted.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">Unlock deleted messages, secret chats, photos, videos, and location history for <strong style="color:#128C7E;">$19.50</strong> before the price jumps back.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;">You don't need to confront anyone. You just need the truth on your screen — private, remote, no app on their phone.</div>
${benefitsBlock("short")}`) +
      ctaBox({
        badge: "ENDING SOON · 50% OFF",
        href: GO195,
        ctaMain: "🔓 KEEP MY $19.50 UNLOCK",
        ctaSub: "Secure checkout · limited time",
        campaign: "cart_a6",
        plan: "cart_deep",
      })
  ),

  a7: shell(
    header("App Spy", "Final notice — last unlock offer") +
      profile("Last email · 50% OFF ends") +
      banner(
        "#fef2f2",
        "#fecaca",
        "#ef4444",
        "📩 Final email from us",
        "Hi {{ $json.name || 'there' }} — we won't keep following up after this."
      ) +
      bodyCard(`                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">This is the last chance to unlock everything at <strong style="color:#128C7E;">$19.50</strong> (50% off $39).</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;">If you walk away now, the deleted messages, secret chats, photos, and location trail for {{ $json.phone || 'the number you searched' }} stay locked forever.</div>
                <div style="font-size:13px;color:#111b21;line-height:1.55;margin-bottom:10px;"><strong>One click. Full access. 30-day money-back guarantee.</strong> No risk — only answers.</div>
                <div style="font-size:12px;color:#667781;line-height:1.6;">WhatsApp monitor · deleted msgs · media · GPS · full dashboard</div>`) +
      ctaBox({
        badge: "FINAL NOTICE · 50% OFF",
        href: GO195,
        ctaMain: "🔓 UNLOCK EVERYTHING — $19.50",
        ctaSub: "Last email · secure checkout",
        campaign: "cart_a7",
        plan: "cart_deep",
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
  fs.writeFileSync(path.join(dir, `${key}.html`), html, "utf8");
  fs.writeFileSync(
    path.join(dir, `${key}-preview.html`),
    toPreview(html),
    "utf8"
  );
  console.log("wrote", key, html.length);
}
console.log("OK", dir);
console.log("GO29", GO29);
console.log("GO195", GO195);
