# 4 e-mails recovery — visual do funil + checkout direto

**From:** `App Spy <noreply@mysafelinkspy.com>`

| # | Quando | Checkout | Preço |
|---|--------|----------|--------|
| **E1** | ~30 min | `https://go.centerpag.com/PPU38CQEHD1` | **$39** (mesmo do step6) |
| **E2** | +24 h | idem | **$39** |
| **E3** | +48 h | idem | **$39** |
| **E4** | +72 h (último) | `https://go.centerpag.com/PPU38CQEKTG` | **$29** (mesmo do backredirect) |

Link **não** vai pro step6 — CTA abre o checkout CenterPag com `name`, `email`, `phone` do lead + UTM.

Sempre no n8n: **Get row → IF `purchased ≠ true` → HTTP Request (Resend)**.

---

## Email 1 — ~30 min · $39

```javascript
{{
  {
    from: 'App Spy <noreply@mysafelinkspy.com>',
    to: [$json.email],
    subject: ($json.name || 'there') + ', your report is ready — unlock full access',
    html: '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">'
      + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;">'
      + '<tr><td align="center">'
      + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;background:#f0f2f5;">'
      + '<tr><td style="background:#128C7E;padding:14px 16px;border-radius:12px 12px 0 0;">'
      + '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,.85);text-transform:uppercase;">App Spy</div>'
      + '<div style="font-size:18px;font-weight:800;color:#ffffff;margin-top:4px;line-height:1.25;">See everything they\'re hiding from you</div>'
      + '</td></tr>'
      + '<tr><td style="background:#ffffff;padding:14px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
      + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e9edef;border-radius:14px;">'
      + '<tr><td style="padding:12px 14px;">'
      + '<table role="presentation" cellspacing="0" cellpadding="0"><tr>'
      + '<td style="width:48px;height:48px;border-radius:50%;background:#e9edef;border:2px solid #25D366;text-align:center;vertical-align:middle;font-size:20px;">👤</td>'
      + '<td style="padding-left:12px;">'
      + '<div style="font-size:15px;font-weight:700;color:#111b21;">' + ($json.phone || 'Your scanned number') + '</div>'
      + '<div style="font-size:12px;color:#667781;margin-top:2px;">Recovery complete · Conversations locked</div>'
      + '</td></tr></table>'
      + '</td></tr></table>'
      + '</td></tr>'
      + '<tr><td style="background:#ffffff;padding:0 16px 12px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
      + '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;text-align:center;">'
      + '<div style="font-size:15px;font-weight:800;color:#128C7E;">✅ We found everything.</div>'
      + '<div style="font-size:12px;color:#667781;margin-top:4px;">Hi ' + ($json.name || 'there') + ' — finish unlock to open the full report.</div>'
      + '</div></td></tr>'
      + '<tr><td style="background:#ffffff;padding:0 16px 12px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
      + '<div style="background:#ffffff;border:1px solid #e9edef;border-radius:14px;padding:12px 14px;">'
      + '<div style="font-size:13px;font-weight:800;color:#111b21;margin-bottom:10px;">📡 Activity Monitor <span style="font-size:11px;font-weight:700;color:#25D366;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:2px 8px;margin-left:6px;">● locked</span></div>'
      + '<div style="padding:8px 0;border-bottom:1px solid #e9edef;font-size:13px;color:#111b21;line-height:1.4;">💬 Deleted messages recovered <span style="font-size:10px;font-weight:700;background:#fee2e2;color:#ef4444;border:1px solid #fecaca;border-radius:3px;padding:1px 6px;margin-left:4px;">DELETED</span></div>'
      + '<div style="padding:8px 0;border-bottom:1px solid #e9edef;font-size:13px;color:#111b21;line-height:1.4;">📸 Photos &amp; videos still blurred <span style="font-size:10px;font-weight:700;background:#fff0f0;color:#ef4444;border:1px solid #fecaca;border-radius:3px;padding:1px 6px;margin-left:4px;">LOCKED</span></div>'
      + '<div style="padding:8px 0;font-size:13px;color:#111b21;line-height:1.4;">📍 Location history ready to view <span style="font-size:10px;font-weight:700;background:#fef2f2;color:#ef4444;border-radius:3px;padding:1px 6px;margin-left:4px;">ALERT</span></div>'
      + '</div></td></tr>'
      + '<tr><td style="background:#ffffff;padding:0 16px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;border-bottom:1px solid #e9edef;border-radius:0 0 12px 12px;">'
      + '<div style="background:#ffffff;border:2px solid #25D366;border-radius:16px;padding:18px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">'
      + '<div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;color:#ef4444;margin-bottom:10px;">75% OFF - LIMITED TIME</div>'
      + '<div style="font-size:14px;color:#667781;text-decoration:line-through;">$197</div>'
      + '<div style="font-size:42px;font-weight:900;color:#111b21;line-height:1;letter-spacing:-1px;">$39</div>'
      + '<div style="font-size:13px;font-weight:700;color:#25D366;margin:6px 0 8px;">You save $158 today!</div>'
      + '<div style="font-size:11px;color:#667781;margin-bottom:14px;"><span style="color:#128C7E;font-weight:600;">One-time payment</span> · Lifetime access · 30-day guarantee</div>'
      + '<a href="https://go.centerpag.com/PPU38CQEHD1?name=' + encodeURIComponent($json.name || '') + '&email=' + encodeURIComponent($json.email || '') + '&phone=' + encodeURIComponent($json.phone || '') + '&plan=full&utm_source=email&utm_medium=recovery&utm_campaign=e1" style="display:block;background:#25D366;background:linear-gradient(135deg,#25D366,#22c55e);color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">'
      + '🔓 UNLOCK FULL ACCESS NOW<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Secure checkout · $39') + '</span>'
      + '</a>'
      + '<div style="margin-top:12px;font-size:11px;color:#667781;">🔒 Secure payment · Access in up to 2 minutes</div>'
      + '</div></td></tr>'
      + '<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">App Spy · If you already purchased, ignore this email.</td></tr>'
      + '</table></td></tr></table></body></html>'
  }
}}
```

---

## Email 2 — +24 h · $39

```javascript
{{
  {
    from: 'App Spy <noreply@mysafelinkspy.com>',
    to: [$json.email],
    subject: ($json.name || 'there') + ' — deleted messages still locked for ' + ($json.phone || 'your number'),
    html: '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">'
      + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;">'
      + '<tr><td align="center">'
      + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;">'
      + '<tr><td style="background:#128C7E;padding:14px 16px;border-radius:12px 12px 0 0;">'
      + '<div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.06em;">App Spy Recovery</div>'
      + '<div style="font-size:18px;font-weight:800;color:#ffffff;margin-top:4px;">Those deleted messages won\'t wait forever</div>'
      + '</td></tr>'
      + '<tr><td style="background:#fef2f2;border-left:3px solid #ef4444;padding:10px 14px;border-right:1px solid #e9edef;">'
      + '<div style="font-size:13px;font-weight:700;color:#ef4444;">⚠️ Conversations still locked</div>'
      + '<div style="font-size:12px;color:#667781;margin-top:2px;">Hi ' + ($json.name || 'there') + ' — report for <strong style="color:#111b21;">' + ($json.phone || 'your number') + '</strong> is waiting.</div>'
      + '</td></tr>'
      + '<tr><td style="background:#ffffff;padding:14px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
      + '<div style="font-size:13px;font-weight:700;color:#111b21;margin-bottom:8px;">🗑 Last deleted message recovered</div>'
      + '<div style="background:#f8f8f8;border-left:3px solid #ef4444;border-radius:12px;padding:12px 14px;font-size:13px;color:#111b21;line-height:1.5;">"Babe, don\'t tell <span style="background:#111b21;color:#111b21;border-radius:3px;">████████</span> that we <span style="background:#111b21;color:#111b21;border-radius:3px;">██████</span>"</div>'
      + '<div style="margin-top:8px;font-size:12px;color:#667781;">Deleted · <span style="color:#25D366;font-weight:600;">🔓 Unlock to reveal full message</span></div>'
      + '</td></tr>'
      + '<tr><td style="background:#ffffff;padding:0 16px 14px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
      + '<div style="background:#f8f8f8;border-radius:10px;padding:12px;">'
      + '<div style="text-align:right;margin-bottom:8px;"><span style="display:inline-block;background:#dcf8c6;border-radius:12px 12px 2px 12px;padding:8px 12px;font-size:12px;color:#111b21;filter:blur(4px);">Hey are you free tonight?</span></div>'
      + '<div style="text-align:left;"><span style="display:inline-block;background:#ffffff;border:1px solid #e9edef;border-radius:12px 12px 12px 2px;padding:8px 12px;font-size:12px;color:#111b21;filter:blur(4px);">Don\'t tell anyone about this...</span></div>'
      + '<div style="text-align:center;margin-top:10px;font-size:11px;font-weight:700;color:#ef4444;">🔒 Full chat locked — unlock to read</div>'
      + '</div></td></tr>'
      + '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
      + '<div style="border:2px solid #25D366;border-radius:16px;padding:16px;text-align:center;">'
      + '<div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:5px 12px;font-size:11px;font-weight:700;color:#ef4444;margin-bottom:8px;">75% OFF - LIMITED TIME</div>'
      + '<div style="font-size:13px;color:#667781;text-decoration:line-through;">$197</div>'
      + '<div style="font-size:40px;font-weight:900;color:#111b21;">$39</div>'
      + '<div style="font-size:13px;font-weight:700;color:#25D366;margin-bottom:12px;">You save $158 today!</div>'
      + '<a href="https://go.centerpag.com/PPU38CQEHD1?name=' + encodeURIComponent($json.name || '') + '&email=' + encodeURIComponent($json.email || '') + '&phone=' + encodeURIComponent($json.phone || '') + '&plan=full&utm_source=email&utm_medium=recovery&utm_campaign=e2" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:15px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">'
      + '🔓 REVEAL FULL REPORT<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Checkout · $39') + '</span></a>'
      + '</div></td></tr>'
      + '<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">Already purchased? You can ignore this email.</td></tr>'
      + '</table></td></tr></table></body></html>'
  }
}}
```

---

## Email 3 — +48 h · $39

```javascript
{{
  {
    from: 'App Spy <noreply@mysafelinkspy.com>',
    to: [$json.email],
    subject: '75% OFF still open for ' + ($json.phone || 'your scan') + ', ' + ($json.name || 'there'),
    html: '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">'
      + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;">'
      + '<tr><td align="center">'
      + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;">'
      + '<tr><td style="background:#128C7E;padding:14px 16px;border-radius:12px 12px 0 0;text-align:center;">'
      + '<div style="font-size:18px;font-weight:900;color:#ffffff;line-height:1.25;">See everything <span style="color:#25D366;">they\'re hiding</span></div>'
      + '<div style="font-size:12px;color:rgba(255,255,255,.9);margin-top:6px;">Your $39 unlock is still available</div>'
      + '</td></tr>'
      + '<tr><td style="background:#ffffff;padding:14px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
      + '<p style="margin:0 0 10px;font-size:14px;color:#111b21;line-height:1.5;">Hi ' + ($json.name || 'there') + ',</p>'
      + '<p style="margin:0;font-size:13px;color:#667781;line-height:1.55;">Your scan for <strong style="color:#111b21;">' + ($json.phone || 'the number you entered') + '</strong> is saved. Most people come back for deleted chats, hidden contacts, media, and GPS history.</p>'
      + '</td></tr>'
      + '<tr><td style="background:#ffffff;padding:0 16px 12px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
      + '<div style="border:1px solid #e9edef;border-radius:14px;padding:12px 14px;">'
      + '<div style="font-size:12px;font-weight:800;color:#111b21;margin-bottom:10px;">What you unlock</div>'
      + '<div style="font-size:13px;color:#111b21;padding:6px 0;border-bottom:1px solid #e9edef;">💬 All conversations + deleted messages</div>'
      + '<div style="font-size:13px;color:#111b21;padding:6px 0;border-bottom:1px solid #e9edef;">📸 Photos &amp; videos recovered</div>'
      + '<div style="font-size:13px;color:#111b21;padding:6px 0;border-bottom:1px solid #e9edef;">📍 Location history</div>'
      + '<div style="font-size:13px;color:#111b21;padding:6px 0;">🛡️ Lifetime dashboard · 100% undetectable</div>'
      + '</div></td></tr>'
      + '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
      + '<div style="position:relative;border:2px solid #25D366;border-radius:16px;padding:20px 14px 16px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">'
      + '<div style="position:absolute;top:0;right:0;background:#ef4444;color:#fff;font-size:10px;font-weight:800;padding:5px 10px;border-radius:0 14px 0 10px;letter-spacing:.04em;">BEST VALUE</div>'
      + '<div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;color:#ef4444;margin:8px 0 10px;">75% OFF - LIMITED TIME</div>'
      + '<div style="font-size:14px;color:#667781;text-decoration:line-through;">$197</div>'
      + '<div style="font-size:44px;font-weight:900;color:#111b21;line-height:1;letter-spacing:-1px;">$39</div>'
      + '<div style="font-size:13px;font-weight:700;color:#25D366;margin:6px 0 6px;">You save $158 today!</div>'
      + '<div style="font-size:11px;color:#667781;margin-bottom:14px;"><span style="color:#128C7E;font-weight:600;">One-time payment</span> · Lifetime access · 30-day guarantee</div>'
      + '<a href="https://go.centerpag.com/PPU38CQEHD1?name=' + encodeURIComponent($json.name || '') + '&email=' + encodeURIComponent($json.email || '') + '&phone=' + encodeURIComponent($json.phone || '') + '&plan=full&utm_source=email&utm_medium=recovery&utm_campaign=e3" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">'
      + '🔓 UNLOCK FULL ACCESS NOW<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Checkout · $39') + '</span></a>'
      + '<div style="margin-top:12px;font-size:11px;color:#128C7E;">🔒 Secure payment · Access in up to 2 minutes</div>'
      + '<div style="margin-top:6px;font-size:11px;color:#667781;">💳 Visa · Mastercard · Amex · PayPal</div>'
      + '</div></td></tr>'
      + '<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">App Spy · No install on their phone · Private &amp; remote</td></tr>'
      + '</table></td></tr></table></body></html>'
  }
}}
```

---

## Email 4 — +72 h · $29 (desconto do backredirect)

**Ângulo:** última chance + **$10 off** ($39 → $29), mesmo produto/código do backredirect.

```javascript
{{
  {
    from: 'App Spy <noreply@mysafelinkspy.com>',
    to: [$json.email],
    subject: ($json.name || 'there') + ' — exclusive $10 off (last email): unlock for $29',
    html: '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">'
      + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;">'
      + '<tr><td align="center">'
      + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;">'
      + '<tr><td style="background:#111b21;padding:14px 16px;border-radius:12px 12px 0 0;">'
      + '<div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#25D366;text-transform:uppercase;">Final email · App Spy</div>'
      + '<div style="font-size:18px;font-weight:800;color:#ffffff;margin-top:6px;line-height:1.3;">We won\'t keep emailing about this scan</div>'
      + '</td></tr>'
      + '<tr><td style="background:#ffffff;padding:14px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
      + '<div style="background:#fff8f8;border:1px solid #fecaca;border-radius:12px;padding:12px 14px;">'
      + '<div style="font-size:13px;font-weight:800;color:#111b21;">🔓 Unprotected account</div>'
      + '<div style="font-size:14px;font-weight:700;color:#111b21;margin:6px 0;">' + ($json.phone || 'Number from your scan') + '</div>'
      + '<div style="font-size:12px;color:#667781;line-height:1.5;">Hi ' + ($json.name || 'there') + ' — this is the last note. Claim this one-time exclusive discount and unlock deleted messages, chats, media, and locations.</div>'
      + '</div></td></tr>'
      + '<tr><td style="background:#ffffff;padding:0 16px 12px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;">'
      + '<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;text-align:center;">'
      + '<div style="font-size:14px;font-weight:800;color:#128C7E;">✅ Your recovery is still saved</div>'
      + '<div style="font-size:12px;color:#667781;margin-top:4px;">One-time exclusive discount · Lifetime access · 30-day guarantee</div>'
      + '</div></td></tr>'
      + '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;">'
      + '<div style="border:2px solid #25D366;border-radius:16px;padding:18px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);">'
      + '<div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;color:#ef4444;margin-bottom:10px;">EXCLUSIVE · $10 OFF · LAST CALL</div>'
      + '<div style="font-size:13px;color:#667781;margin-bottom:6px;">$39 → <strong style="color:#111b21;">$29 Instead of $39</strong></div>'
      + '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 12px;"><tr>'
      + '<td style="text-align:center;width:45%;"><div style="font-size:11px;color:#667781;text-transform:uppercase;letter-spacing:.04em;">Original</div><div style="font-size:22px;font-weight:700;color:#9ca3af;text-decoration:line-through;">$39</div></td>'
      + '<td style="text-align:center;width:10%;font-size:18px;color:#667781;font-weight:700;">→</td>'
      + '<td style="text-align:center;width:45%;"><div style="font-size:11px;color:#128C7E;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Your price now</div><div style="font-size:40px;font-weight:900;color:#111b21;line-height:1;">$29</div></td>'
      + '</tr></table>'
      + '<div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:5px 12px;font-size:12px;font-weight:700;color:#128C7E;margin-bottom:14px;">Save $10</div>'
      + '<a href="https://go.centerpag.com/PPU38CQEKTG?name=' + encodeURIComponent($json.name || '') + '&email=' + encodeURIComponent($json.email || '') + '&phone=' + encodeURIComponent($json.phone || '') + '&plan=backredirect&utm_source=email&utm_medium=recovery&utm_campaign=e4" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">'
      + '✅ Claim My $10 Discount Now<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Unlock · $29 one-time') + '</span></a>'
      + '<div style="margin-top:12px;font-size:11px;color:#667781;">After this, we stop emails about this scan.</div>'
      + '</div></td></tr>'
      + '<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">App Spy · SSL Secure · Same offer as exit special · Undetectable remote access</td></tr>'
      + '</table></td></tr></table></body></html>'
  }
}}
```

---

## Códigos de checkout (fonte no site)

| Onde no site | Código | Preço |
|--------------|--------|--------|
| step6 `CHECKOUT_CODE` | `PPU38CQEHD1` | $39 |
| backredirect `claimOffer` | `PPU38CQEKTG` | $29 |

## Query string do CTA

```
name, email, phone  → dados do lead ($json)
plan=full           → E1–E3
plan=backredirect   → E4
utm_source=email&utm_medium=recovery&utm_campaign=e1|e2|e3|e4
```

## Timing n8n

```text
30 min → E1 ($39)
+24 h  → E2 ($39)
+48 h  → E3 ($39)
+72 h  → E4 ($29 backredirect)
```

Cada envio: **Get row → IF não comprou → Resend**.
