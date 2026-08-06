/**
 * Shared recovery email HTML + subjects (n8n expressions).
 * Used by build-n8n-simple.mjs and build-n8n-workflows.mjs
 *
 * IMPORTANT: After "Get row" the item is the sheet row (column "phone " with
 * trailing space + Excel text prefix "='..."). Always prefer Normalize Lead
 * for name / phone / email, then fall back and strip sheet junk.
 */

export function resendJsonBody(subjectExpr, htmlExpr) {
  // Resend requires `to` as a STRING (not array, not nested array).
  // leadEmailArr was accidentally wrapped twice as to: [[email]] → 422 invalid.
  return `={{ ({ from: 'App Spy <noreply@mysafelinkspy.com>', to: (${E}), subject: ${subjectExpr}, html: ${htmlExpr} }) }}`;
}

/** Direct PerfectPay / CenterPag checkout (no mysafelinkspy /go/ redirect). */
const CHECKOUT_BASE = "https://go.centerpag.com";

/** n8n expression: clean display name */
const N =
  "String(($('Normalize Lead').item.json.name || $json.name || '')).trim() || 'there'";

/** n8n expression: phone the lead typed (strip sheet "=' " junk) */
const P =
  "String(($('Normalize Lead').item.json.phone || $json.phone || $json['phone '] || '')).replace(/^=+/, '').replace(/^'+/, '').trim() || 'the number you searched'";

/** n8n expression: email (for to: and checkout) */
const E =
  "(() => { const raw = String(($('Normalize Lead').item.json.email || $json.email || '')).replace(/[\\u200B-\\u200D\\uFEFF]/g,'').trim().toLowerCase(); const m = raw.match(/[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}/i); return m ? m[0] : raw.replace(/\\s+/g,''); })()";

const leadEmailArr = E;

function checkoutLink(code, plan, campaign) {
  // Raw fields for URL (no "there" / "your number" fallbacks)
  const nameQ =
    "String(($('Normalize Lead').item.json.name || $json.name || '')).trim()";
  // Use sanitized email in checkout links too
  const emailQ = E;
  const phoneQ =
    "String(($('Normalize Lead').item.json.phone || $json.phone || $json['phone '] || '')).replace(/^=+/, '').replace(/^'+/, '').trim()";
  return (
    `'${CHECKOUT_BASE}/${code}?name=' + encodeURIComponent(${nameQ}) + '&email=' + encodeURIComponent(${emailQ}) + '&phone=' + encodeURIComponent(${phoneQ}) + '&plan=${plan}&utm_source=email_recovery&utm_medium=email&utm_campaign=${campaign}&src=email_recovery&sck=${campaign}'`
  );
}

function shell(innerRows) {
  return `(''
+ '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;"><tr><td align="center">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;">'
${innerRows}
+ '<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;line-height:1.45;">App Spy · Private &amp; remote · No install on their phone<br>Already purchased? You can ignore this email.</td></tr>'
+ '</table></td></tr></table></body></html>')`;
}

export const subjects = {
  e1: `(${N}) + ', data recovery completed for ' + (${P})`,
  e2: `(${N}) + ' — deleted messages for ' + (${P}) + ' are still locked'`,
  e3: `(${N}) + ', your recovery for ' + (${P}) + ' is still waiting'`,
  e4: `(${N}) + ' — last email: unlock ' + (${P}) + ' before we stop'`,
};

/** Static subject previews for docs (sample name/phone) */
export const subjectPreviews = {
  e1: (n, p) => `${n}, data recovery completed for ${p}`,
  e2: (n, p) => `${n} — deleted messages for ${p} are still locked`,
  e3: (n, p) => `${n}, your recovery for ${p} is still waiting`,
  e4: (n, p) => `${n} — last email: unlock ${p} before we stop`,
};

// E1 — Name + phone first, strong hooks, CTA without “call this number” vibe
export const htmlE1 = shell(`
+ '<tr><td style="background:#128C7E;padding:16px;border-radius:12px 12px 0 0;">'
+ '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,.85);text-transform:uppercase;">App Spy · Recovery complete</div>'
+ '<div style="font-size:20px;font-weight:900;color:#ffffff;margin-top:8px;line-height:1.3;">' + (${N}) + ', you deserve to know the truth</div>'
+ '<div style="font-size:13px;color:rgba(255,255,255,.92);margin-top:8px;line-height:1.4;">Data recovery completed for <strong style="color:#25D366;">' + (${P}) + '</strong></div>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
+ '<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px 14px;margin-bottom:14px;text-align:center;">'
+ '<div style="font-size:15px;font-weight:900;color:#ef4444;">See what they\\'re hiding from you</div>'
+ '<div style="font-size:12px;color:#667781;margin-top:6px;line-height:1.45;">Scan target: <strong style="color:#111b21;">' + (${P}) + '</strong> · report ready · still locked</div>'
+ '</div>'
+ '<div style="font-size:13px;font-weight:800;color:#111b21;margin-bottom:10px;">What we found</div>'
+ '<div style="font-size:13px;color:#111b21;padding:10px 0;border-bottom:1px solid #e9edef;">💬 Deleted &amp; archived messages <span style="font-size:10px;font-weight:700;background:#fee2e2;color:#ef4444;border-radius:3px;padding:2px 6px;margin-left:4px;">READY</span></div>'
+ '<div style="font-size:13px;color:#111b21;padding:10px 0;border-bottom:1px solid #e9edef;">📸 Photos &amp; media still blurred <span style="font-size:10px;font-weight:700;background:#fff0f0;color:#ef4444;border-radius:3px;padding:2px 6px;margin-left:4px;">LOCKED</span></div>'
+ '<div style="font-size:13px;color:#111b21;padding:10px 0;border-bottom:1px solid #e9edef;">📍 Location history timeline <span style="font-size:10px;font-weight:700;background:#fef2f2;color:#ef4444;border-radius:3px;padding:2px 6px;margin-left:4px;">READY</span></div>'
+ '<div style="font-size:13px;color:#111b21;padding:10px 0;">🕵️ Hidden contacts &amp; activity <span style="font-size:10px;font-weight:700;background:#f0fdf4;color:#128C7E;border-radius:3px;padding:2px 6px;margin-left:4px;">SAVED</span></div>'
+ '<p style="margin:14px 0 0;font-size:13px;color:#667781;line-height:1.55;">You already did the hard part — the scan. <strong style="color:#111b21;">Don\\'t leave the answers locked.</strong></p>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
+ '<div style="border:2px solid #25D366;border-radius:16px;padding:20px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">'
+ '<div style="font-size:15px;font-weight:900;color:#111b21;margin-bottom:6px;">Unlock access now — before it\\'s too late</div>'
+ '<div style="font-size:12px;color:#ef4444;font-weight:700;margin-bottom:8px;">Your recovered data won\\'t wait forever</div>'
+ '<div style="font-size:12px;color:#667781;margin-bottom:16px;line-height:1.45;">Secure checkout · Lifetime access · 30-day guarantee</div>'
+ '<a href="' + ${checkoutLink("PPU38CQF005", "full", "e1")} + '" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">🔓 See What They\\'re Hiding Now<br><span style="font-size:11px;font-weight:600;opacity:.9;">Scan saved for ' + (${P}) + '</span></a>'
+ '<div style="margin-top:12px;font-size:11px;color:#667781;">🔒 SSL secure · Access in up to 2 minutes</div>'
+ '</div></td></tr>'
`);

// E2
export const htmlE2 = shell(`
+ '<tr><td style="background:#128C7E;padding:16px;border-radius:12px 12px 0 0;">'
+ '<div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.06em;">Still locked · App Spy</div>'
+ '<div style="font-size:20px;font-weight:900;color:#ffffff;margin-top:8px;line-height:1.3;">' + (${N}) + ', see what they\\'re hiding from you</div>'
+ '<div style="font-size:13px;color:rgba(255,255,255,.92);margin-top:8px;">Deleted messages for <strong style="color:#25D366;">' + (${P}) + '</strong> are still locked</div>'
+ '</td></tr>'
+ '<tr><td style="background:#fef2f2;border-left:3px solid #ef4444;padding:12px 14px;border-right:1px solid #e9edef;">'
+ '<div style="font-size:14px;font-weight:900;color:#ef4444;">⚠️ You deserve to know the truth</div>'
+ '<div style="font-size:12px;color:#667781;margin-top:4px;line-height:1.45;">Every day you wait is another day of not knowing what was erased on ' + (${P}) + '.</div>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
+ '<p style="margin:0 0 10px;font-size:14px;color:#111b21;line-height:1.5;">Hi ' + (${N}) + ',</p>'
+ '<div style="font-size:13px;font-weight:800;color:#111b21;margin-bottom:10px;">What we already recovered</div>'
+ '<div style="font-size:13px;color:#111b21;padding:8px 0;border-bottom:1px solid #e9edef;">💬 Deleted chats ready to reveal</div>'
+ '<div style="font-size:13px;color:#111b21;padding:8px 0;border-bottom:1px solid #e9edef;">📸 Media still blurred until unlock</div>'
+ '<div style="font-size:13px;color:#111b21;padding:8px 0;border-bottom:1px solid #e9edef;">📍 Location history saved</div>'
+ '<div style="font-size:13px;color:#111b21;padding:8px 0;margin-bottom:12px;">🕵️ Contacts &amp; activity timeline</div>'
+ '<div style="background:#f8f8f8;border-left:3px solid #ef4444;border-radius:12px;padding:12px 14px;font-size:13px;color:#111b21;line-height:1.5;margin-bottom:10px;">“Don\\'t tell <span style="background:#111b21;color:#111b21;border-radius:3px;">████████</span> that we <span style="background:#111b21;color:#111b21;border-radius:3px;">██████</span>…”</div>'
+ '<div style="font-size:12px;color:#667781;">Deleted fragment recovered · <span style="color:#25D366;font-weight:700;">Unlock to read the full thread</span></div>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
+ '<div style="border:2px solid #25D366;border-radius:16px;padding:20px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">'
+ '<div style="font-size:15px;font-weight:900;color:#111b21;margin-bottom:6px;">Unlock access now — before it\\'s too late</div>'
+ '<div style="font-size:12px;color:#ef4444;font-weight:700;margin-bottom:8px;">Don\\'t let the truth stay buried</div>'
+ '<div style="font-size:12px;color:#667781;margin-bottom:16px;line-height:1.45;">Secure checkout · Lifetime access · 30-day guarantee</div>'
+ '<a href="' + ${checkoutLink("PPU38CQF005", "full", "e2")} + '" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">🔓 Reveal What They Deleted<br><span style="font-size:11px;font-weight:600;opacity:.9;">Scan saved for ' + (${P}) + '</span></a>'
+ '<div style="margin-top:12px;font-size:11px;color:#667781;">🔒 SSL secure · Access in up to 2 minutes</div>'
+ '</div></td></tr>'
`);

// E3
export const htmlE3 = shell(`
+ '<tr><td style="background:#128C7E;padding:16px;border-radius:12px 12px 0 0;text-align:center;">'
+ '<div style="font-size:20px;font-weight:900;color:#ffffff;line-height:1.25;">' + (${N}) + ', you deserve to know the truth</div>'
+ '<div style="font-size:13px;color:rgba(255,255,255,.9);margin-top:8px;">Recovery for <strong style="color:#25D366;">' + (${P}) + '</strong> is still waiting</div>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
+ '<p style="margin:0 0 12px;font-size:14px;color:#111b21;line-height:1.5;">Hi ' + (${N}) + ',</p>'
+ '<p style="margin:0 0 12px;font-size:14px;font-weight:800;color:#ef4444;line-height:1.45;">See what they\\'re hiding from you — before it\\'s too late.</p>'
+ '<p style="margin:0 0 12px;font-size:13px;color:#667781;line-height:1.55;">Here\\'s what we found for <strong style="color:#111b21;">' + (${P}) + '</strong> — still locked until you unlock:</p>'
+ '<div style="border:1px solid #e9edef;border-radius:14px;padding:12px 14px;margin-bottom:14px;">'
+ '<div style="font-size:12px;font-weight:800;color:#111b21;margin-bottom:10px;">What we found · one-time unlock</div>'
+ '<div style="font-size:13px;color:#111b21;padding:7px 0;border-bottom:1px solid #e9edef;">💬 Full chat history + deleted recovery</div>'
+ '<div style="font-size:13px;color:#111b21;padding:7px 0;border-bottom:1px solid #e9edef;">📸 Photos, videos &amp; voice notes</div>'
+ '<div style="font-size:13px;color:#111b21;padding:7px 0;border-bottom:1px solid #e9edef;">📍 GPS / location history</div>'
+ '<div style="font-size:13px;color:#111b21;padding:7px 0;border-bottom:1px solid #e9edef;">🛡️ 100% remote · they never get a notification</div>'
+ '<div style="font-size:13px;color:#111b21;padding:7px 0;">♾️ Lifetime dashboard · 30-day guarantee</div>'
+ '</div>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
+ '<div style="border:2px solid #25D366;border-radius:16px;padding:20px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">'
+ '<div style="font-size:15px;font-weight:900;color:#111b21;margin-bottom:6px;">Unlock access now — before it\\'s too late</div>'
+ '<div style="font-size:12px;color:#ef4444;font-weight:700;margin-bottom:8px;">Stop guessing. Get the full report.</div>'
+ '<div style="font-size:12px;color:#667781;margin-bottom:16px;line-height:1.45;">Secure checkout · Lifetime access · 30-day guarantee</div>'
+ '<a href="' + ${checkoutLink("PPU38CQF005", "full", "e3")} + '" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">🔓 Yes — Show Me Everything<br><span style="font-size:11px;font-weight:600;opacity:.9;">Scan saved for ' + (${P}) + '</span></a>'
+ '<div style="margin-top:12px;font-size:11px;color:#128C7E;">🔒 SSL secure · Visa · Mastercard · Amex · PayPal</div>'
+ '</div></td></tr>'
`);

// E4
export const htmlE4 = shell(`
+ '<tr><td style="background:#111b21;padding:16px;border-radius:12px 12px 0 0;">'
+ '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#25D366;text-transform:uppercase;">Final email · We stop after this</div>'
+ '<div style="font-size:20px;font-weight:900;color:#ffffff;margin-top:8px;line-height:1.3;">' + (${N}) + ', unlock access now — before it\\'s too late</div>'
+ '<div style="font-size:13px;color:rgba(255,255,255,.85);margin-top:8px;">Last chance for scan <strong style="color:#25D366;">' + (${P}) + '</strong></div>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
+ '<div style="background:#fff8f8;border:1px solid #fecaca;border-radius:12px;padding:12px 14px;margin-bottom:14px;">'
+ '<div style="font-size:15px;font-weight:900;color:#ef4444;">You deserve to know the truth</div>'
+ '<div style="font-size:12px;color:#667781;margin-top:6px;line-height:1.5;">Hi ' + (${N}) + ' — this is the last message about this scan. After this we stop, even if the report for ' + (${P}) + ' is still locked.</div>'
+ '</div>'
+ '<div style="font-size:13px;font-weight:800;color:#111b21;margin-bottom:8px;">What we found (still saved)</div>'
+ '<div style="font-size:13px;color:#111b21;padding:6px 0;border-bottom:1px solid #e9edef;">💬 Deleted messages</div>'
+ '<div style="font-size:13px;color:#111b21;padding:6px 0;border-bottom:1px solid #e9edef;">📸 Photos &amp; media</div>'
+ '<div style="font-size:13px;color:#111b21;padding:6px 0;border-bottom:1px solid #e9edef;">📍 Location history</div>'
+ '<div style="font-size:13px;color:#111b21;padding:6px 0;">🕵️ Contacts &amp; activity</div>'
+ '<p style="margin:12px 0 0;font-size:13px;color:#667781;line-height:1.5;"><strong style="color:#111b21;">See what they\\'re hiding from you</strong> — private, remote, no install on their phone.</p>'
+ '</td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
+ '<div style="border:2px solid #25D366;border-radius:16px;padding:20px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">'
+ '<div style="font-size:15px;font-weight:900;color:#111b21;margin-bottom:6px;">Final chance — unlock before we stop</div>'
+ '<div style="font-size:12px;color:#ef4444;font-weight:700;margin-bottom:8px;">After this email, no more reminders</div>'
+ '<div style="font-size:12px;color:#667781;margin-bottom:16px;line-height:1.45;">Secure checkout · Lifetime access · 30-day guarantee</div>'
+ '<a href="' + ${checkoutLink("PPU38CQF019", "backredirect", "e4")} + '" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">🔓 Unlock My Report Now<br><span style="font-size:11px;font-weight:600;opacity:.9;">Scan saved for ' + (${P}) + '</span></a>'
+ '<div style="margin-top:12px;font-size:11px;color:#667781;">After this, we stop emails about this scan.</div>'
+ '</div></td></tr>'
`);

export const htmls = { e1: htmlE1, e2: htmlE2, e3: htmlE3, e4: htmlE4 };

/** Static HTML previews (sample lead) for opening in browser */
export function staticPreview(key, sample = { name: "Renato", phone: "+55 11 99999-9999", email: "renato@email.com" }) {
  const { name, phone, email } = sample;
  const codes = {
    e1: {
      code: "PPU38CQF005",
      plan: "full",
      cta: "See What They're Hiding Now",
      hook: "Unlock access now — before it's too late",
      sub: "Your recovered data won't wait forever",
    },
    e2: {
      code: "PPU38CQF005",
      plan: "full",
      cta: "Reveal What They Deleted",
      hook: "Unlock access now — before it's too late",
      sub: "Don't let the truth stay buried",
    },
    e3: {
      code: "PPU38CQF005",
      plan: "full",
      cta: "Yes — Show Me Everything",
      hook: "Unlock access now — before it's too late",
      sub: "Stop guessing. Get the full report.",
    },
    e4: {
      code: "PPU38CQF019",
      plan: "backredirect",
      cta: "Unlock My Report Now",
      hook: "Final chance — unlock before we stop",
      sub: "After this email, no more reminders",
    },
  };
  const c = codes[key];
  const href = `https://go.centerpag.com/${c.code}?name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}&phone=${encodeURIComponent(phone)}&plan=${c.plan}&utm_source=email_recovery&utm_medium=email&utm_campaign=${key}&src=email_recovery&sck=${key}`;

  const bodies = {
    e1: `
      <div style="background:#128C7E;padding:16px;border-radius:12px 12px 0 0;">
        <div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.85);text-transform:uppercase;">App Spy · Recovery complete</div>
        <div style="font-size:20px;font-weight:900;color:#fff;margin-top:8px;line-height:1.3;">${name}, you deserve to know the truth</div>
        <div style="font-size:13px;color:rgba(255,255,255,.92);margin-top:8px;">Data recovery completed for <strong style="color:#25D366;">${phone}</strong></div>
      </div>
      <div style="background:#fff;padding:16px;border:1px solid #e9edef;border-top:none;">
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:12px;margin-bottom:14px;text-align:center;">
          <div style="font-size:15px;font-weight:900;color:#ef4444;">See what they're hiding from you</div>
          <div style="font-size:12px;color:#667781;margin-top:6px;">Scan target: <strong>${phone}</strong></div>
        </div>
        <div style="font-size:13px;font-weight:800;color:#111b21;margin-bottom:10px;">What we found</div>
        <div style="font-size:13px;padding:10px 0;border-bottom:1px solid #e9edef;">💬 Deleted &amp; archived messages</div>
        <div style="font-size:13px;padding:10px 0;border-bottom:1px solid #e9edef;">📸 Photos &amp; media still blurred</div>
        <div style="font-size:13px;padding:10px 0;border-bottom:1px solid #e9edef;">📍 Location history timeline</div>
        <div style="font-size:13px;padding:10px 0;">🕵️ Hidden contacts &amp; activity</div>
      </div>`,
    e2: `
      <div style="background:#128C7E;padding:16px;border-radius:12px 12px 0 0;">
        <div style="font-size:20px;font-weight:900;color:#fff;">${name}, see what they're hiding from you</div>
        <div style="font-size:13px;color:rgba(255,255,255,.92);margin-top:8px;">Deleted messages for <strong style="color:#25D366;">${phone}</strong> still locked</div>
      </div>
      <div style="background:#fff;padding:16px;border:1px solid #e9edef;border-top:none;">
        <div style="font-size:14px;font-weight:900;color:#ef4444;margin-bottom:10px;">You deserve to know the truth</div>
        <div style="font-size:13px;font-weight:800;margin-bottom:10px;">What we already recovered</div>
        <div style="font-size:13px;padding:8px 0;border-bottom:1px solid #e9edef;">💬 Deleted chats</div>
        <div style="font-size:13px;padding:8px 0;border-bottom:1px solid #e9edef;">📸 Media blurred</div>
        <div style="font-size:13px;padding:8px 0;">📍 Location history</div>
      </div>`,
    e3: `
      <div style="background:#128C7E;padding:16px;border-radius:12px 12px 0 0;text-align:center;">
        <div style="font-size:20px;font-weight:900;color:#fff;">${name}, you deserve to know the truth</div>
        <div style="font-size:13px;color:rgba(255,255,255,.9);margin-top:8px;">Recovery for <strong style="color:#25D366;">${phone}</strong> is still waiting</div>
      </div>
      <div style="background:#fff;padding:16px;border:1px solid #e9edef;border-top:none;">
        <div style="font-size:14px;font-weight:800;color:#ef4444;margin-bottom:10px;">See what they're hiding from you — before it's too late.</div>
        <div style="font-size:13px;font-weight:800;margin-bottom:10px;">What we found</div>
        <div style="font-size:13px;padding:7px 0;border-bottom:1px solid #e9edef;">💬 Full chat + deleted</div>
        <div style="font-size:13px;padding:7px 0;border-bottom:1px solid #e9edef;">📸 Photos &amp; videos</div>
        <div style="font-size:13px;padding:7px 0;">📍 GPS history</div>
      </div>`,
    e4: `
      <div style="background:#111b21;padding:16px;border-radius:12px 12px 0 0;">
        <div style="font-size:20px;font-weight:900;color:#fff;margin-top:8px;">${name}, unlock access now — before it's too late</div>
        <div style="font-size:13px;color:rgba(255,255,255,.85);margin-top:8px;">Last chance for scan <strong style="color:#25D366;">${phone}</strong></div>
      </div>
      <div style="background:#fff;padding:16px;border:1px solid #e9edef;border-top:none;">
        <div style="font-size:15px;font-weight:900;color:#ef4444;">You deserve to know the truth</div>
        <div style="font-size:13px;font-weight:800;margin:12px 0 8px;">What we found (still saved)</div>
        <div style="font-size:13px;padding:6px 0;">💬 Deleted · 📸 Media · 📍 Location · 🕵️ Contacts</div>
      </div>`,
  };

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Recovery ${key.toUpperCase()}</title></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" style="background:#f0f2f5;padding:20px 10px;"><tr><td align="center">
    <table width="100%" style="max-width:420px;">
      ${bodies[key]}
      <tr><td style="background:#fff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">
        <div style="border:2px solid #25D366;border-radius:16px;padding:18px 14px;text-align:center;">
          <div style="font-size:15px;font-weight:900;color:#111b21;margin-bottom:6px;">${c.hook}</div>
          <div style="font-size:12px;color:#ef4444;font-weight:700;margin-bottom:8px;">${c.sub}</div>
          <div style="font-size:12px;color:#667781;margin-bottom:16px;">Secure checkout · Lifetime access · 30-day guarantee</div>
          <a href="${href}" style="display:block;background:#25D366;color:#fff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;">
            🔓 ${c.cta}<br><span style="font-size:11px;font-weight:600;opacity:.9;">Scan saved for ${phone}</span>
          </a>
        </div>
      </td></tr>
      <tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">App Spy · Private &amp; remote</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}
