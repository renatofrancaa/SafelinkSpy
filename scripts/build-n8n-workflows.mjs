/**
 * Builds n8n importable workflows for lead recovery emails.
 * Run: node scripts/build-n8n-workflows.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs", "n8n");

const sheetDoc = {
  __rl: true,
  value: "YOUR_GOOGLE_SHEET_ID",
  mode: "id",
};
const sheetName = {
  __rl: true,
  value: "Leads",
  mode: "name",
};

function sheetsCred() {
  return {
    googleSheetsOAuth2Api: {
      id: "REPLACE_GOOGLE_SHEETS_CREDENTIAL_ID",
      name: "Google Sheets account",
    },
  };
}

function resendCred() {
  return {
    httpHeaderAuth: {
      id: "REPLACE_RESEND_HEADER_AUTH_CREDENTIAL_ID",
      name: "Resend API",
    },
  };
}

/** n8n expression: Resend JSON body with dynamic subject + html */
function resendJsonBody(subjectExpr, htmlExpr) {
  return `={{ ({ from: 'App Spy <noreply@mysafelinkspy.com>', to: [$json.email], subject: ${subjectExpr}, html: ${htmlExpr} }) }}`;
}

// HTML builders: return n8n expression fragment (parenthesized concat)
const htmlE1 = `(''
+ '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;"><tr><td align="center">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;background:#f0f2f5;">'
+ '<tr><td style="background:#128C7E;padding:14px 16px;border-radius:12px 12px 0 0;"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:rgba(255,255,255,.85);text-transform:uppercase;">App Spy</div><div style="font-size:18px;font-weight:800;color:#ffffff;margin-top:4px;line-height:1.25;">See everything they\\'re hiding from you</div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:14px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e9edef;border-radius:14px;"><tr><td style="padding:12px 14px;"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="width:48px;height:48px;border-radius:50%;background:#e9edef;border:2px solid #25D366;text-align:center;vertical-align:middle;font-size:20px;">👤</td><td style="padding-left:12px;"><div style="font-size:15px;font-weight:700;color:#111b21;">' + ($json.phone || 'Your scanned number') + '</div><div style="font-size:12px;color:#667781;margin-top:2px;">Recovery complete · Conversations locked</div></td></tr></table></td></tr></table></td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 12px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;"><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px 14px;text-align:center;"><div style="font-size:15px;font-weight:800;color:#128C7E;">✅ We found everything.</div><div style="font-size:12px;color:#667781;margin-top:4px;">Hi ' + ($json.name || 'there') + ' — finish unlock to open the full report.</div></div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 12px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;"><div style="background:#ffffff;border:1px solid #e9edef;border-radius:14px;padding:12px 14px;"><div style="font-size:13px;font-weight:800;color:#111b21;margin-bottom:10px;">📡 Activity Monitor <span style="font-size:11px;font-weight:700;color:#25D366;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:2px 8px;margin-left:6px;">● locked</span></div><div style="padding:8px 0;border-bottom:1px solid #e9edef;font-size:13px;color:#111b21;line-height:1.4;">💬 Deleted messages recovered <span style="font-size:10px;font-weight:700;background:#fee2e2;color:#ef4444;border:1px solid #fecaca;border-radius:3px;padding:1px 6px;margin-left:4px;">DELETED</span></div><div style="padding:8px 0;border-bottom:1px solid #e9edef;font-size:13px;color:#111b21;line-height:1.4;">📸 Photos &amp; videos still blurred <span style="font-size:10px;font-weight:700;background:#fff0f0;color:#ef4444;border:1px solid #fecaca;border-radius:3px;padding:1px 6px;margin-left:4px;">LOCKED</span></div><div style="padding:8px 0;font-size:13px;color:#111b21;line-height:1.4;">📍 Location history ready to view <span style="font-size:10px;font-weight:700;background:#fef2f2;color:#ef4444;border-radius:3px;padding:1px 6px;margin-left:4px;">ALERT</span></div></div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;border-bottom:1px solid #e9edef;border-radius:0 0 12px 12px;"><div style="background:#ffffff;border:2px solid #25D366;border-radius:16px;padding:18px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);"><div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;color:#ef4444;margin-bottom:10px;">75% OFF - LIMITED TIME</div><div style="font-size:14px;color:#667781;text-decoration:line-through;">$197</div><div style="font-size:42px;font-weight:900;color:#111b21;line-height:1;letter-spacing:-1px;">$39</div><div style="font-size:13px;font-weight:700;color:#25D366;margin:6px 0 8px;">You save $158 today!</div><div style="font-size:11px;color:#667781;margin-bottom:14px;"><span style="color:#128C7E;font-weight:600;">One-time payment</span> · Lifetime access · 30-day guarantee</div><a href="https://go.centerpag.com/PPU38CQEHD1?name=' + encodeURIComponent($json.name || '') + '&email=' + encodeURIComponent($json.email || '') + '&phone=' + encodeURIComponent($json.phone || '') + '&plan=full&utm_source=email&utm_medium=recovery&utm_campaign=e1" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">🔓 UNLOCK FULL ACCESS NOW<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Secure checkout · $39') + '</span></a><div style="margin-top:12px;font-size:11px;color:#667781;">🔒 Secure payment · Access in up to 2 minutes</div></div></td></tr>'
+ '<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">App Spy · If you already purchased, ignore this email.</td></tr>'
+ '</table></td></tr></table></body></html>')`;

const htmlE2 = `(''
+ '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;"><tr><td align="center">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;">'
+ '<tr><td style="background:#128C7E;padding:14px 16px;border-radius:12px 12px 0 0;"><div style="font-size:11px;font-weight:700;color:rgba(255,255,255,.85);text-transform:uppercase;letter-spacing:.06em;">App Spy Recovery</div><div style="font-size:18px;font-weight:800;color:#ffffff;margin-top:4px;">Those deleted messages won\\'t wait forever</div></td></tr>'
+ '<tr><td style="background:#fef2f2;border-left:3px solid #ef4444;padding:10px 14px;border-right:1px solid #e9edef;"><div style="font-size:13px;font-weight:700;color:#ef4444;">⚠️ Conversations still locked</div><div style="font-size:12px;color:#667781;margin-top:2px;">Hi ' + ($json.name || 'there') + ' — report for <strong style="color:#111b21;">' + ($json.phone || 'your number') + '</strong> is waiting.</div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:14px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;"><div style="font-size:13px;font-weight:700;color:#111b21;margin-bottom:8px;">🗑 Last deleted message recovered</div><div style="background:#f8f8f8;border-left:3px solid #ef4444;border-radius:12px;padding:12px 14px;font-size:13px;color:#111b21;line-height:1.5;">"Babe, don\\'t tell <span style="background:#111b21;color:#111b21;border-radius:3px;">████████</span> that we <span style="background:#111b21;color:#111b21;border-radius:3px;">██████</span>"</div><div style="margin-top:8px;font-size:12px;color:#667781;">Deleted · <span style="color:#25D366;font-weight:600;">🔓 Unlock to reveal full message</span></div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 14px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;"><div style="background:#f8f8f8;border-radius:10px;padding:12px;"><div style="text-align:right;margin-bottom:8px;"><span style="display:inline-block;background:#dcf8c6;border-radius:12px 12px 2px 12px;padding:8px 12px;font-size:12px;color:#111b21;filter:blur(4px);">Hey are you free tonight?</span></div><div style="text-align:left;"><span style="display:inline-block;background:#ffffff;border:1px solid #e9edef;border-radius:12px 12px 12px 2px;padding:8px 12px;font-size:12px;color:#111b21;filter:blur(4px);">Don\\'t tell anyone about this...</span></div><div style="text-align:center;margin-top:10px;font-size:11px;font-weight:700;color:#ef4444;">🔒 Full chat locked — unlock to read</div></div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;"><div style="border:2px solid #25D366;border-radius:16px;padding:16px;text-align:center;"><div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:5px 12px;font-size:11px;font-weight:700;color:#ef4444;margin-bottom:8px;">75% OFF - LIMITED TIME</div><div style="font-size:13px;color:#667781;text-decoration:line-through;">$197</div><div style="font-size:40px;font-weight:900;color:#111b21;">$39</div><div style="font-size:13px;font-weight:700;color:#25D366;margin-bottom:12px;">You save $158 today!</div><a href="https://go.centerpag.com/PPU38CQEHD1?name=' + encodeURIComponent($json.name || '') + '&email=' + encodeURIComponent($json.email || '') + '&phone=' + encodeURIComponent($json.phone || '') + '&plan=full&utm_source=email&utm_medium=recovery&utm_campaign=e2" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:15px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">🔓 REVEAL FULL REPORT<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Checkout · $39') + '</span></a></div></td></tr>'
+ '<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">Already purchased? You can ignore this email.</td></tr>'
+ '</table></td></tr></table></body></html>')`;

const htmlE3 = `(''
+ '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;"><tr><td align="center">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;">'
+ '<tr><td style="background:#128C7E;padding:14px 16px;border-radius:12px 12px 0 0;text-align:center;"><div style="font-size:18px;font-weight:900;color:#ffffff;line-height:1.25;">See everything <span style="color:#25D366;">they\\'re hiding</span></div><div style="font-size:12px;color:rgba(255,255,255,.9);margin-top:6px;">Your $39 unlock is still available</div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:14px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;"><p style="margin:0 0 10px;font-size:14px;color:#111b21;line-height:1.5;">Hi ' + ($json.name || 'there') + ',</p><p style="margin:0;font-size:13px;color:#667781;line-height:1.55;">Your scan for <strong style="color:#111b21;">' + ($json.phone || 'the number you entered') + '</strong> is saved. Most people come back for deleted chats, hidden contacts, media, and GPS history.</p></td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 12px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;"><div style="border:1px solid #e9edef;border-radius:14px;padding:12px 14px;"><div style="font-size:12px;font-weight:800;color:#111b21;margin-bottom:10px;">What you unlock</div><div style="font-size:13px;color:#111b21;padding:6px 0;border-bottom:1px solid #e9edef;">💬 All conversations + deleted messages</div><div style="font-size:13px;color:#111b21;padding:6px 0;border-bottom:1px solid #e9edef;">📸 Photos &amp; videos recovered</div><div style="font-size:13px;color:#111b21;padding:6px 0;border-bottom:1px solid #e9edef;">📍 Location history</div><div style="font-size:13px;color:#111b21;padding:6px 0;">🛡️ Lifetime dashboard · 100% undetectable</div></div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;"><div style="position:relative;border:2px solid #25D366;border-radius:16px;padding:20px 14px 16px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);"><div style="position:absolute;top:0;right:0;background:#ef4444;color:#fff;font-size:10px;font-weight:800;padding:5px 10px;border-radius:0 14px 0 10px;letter-spacing:.04em;">BEST VALUE</div><div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;color:#ef4444;margin:8px 0 10px;">75% OFF - LIMITED TIME</div><div style="font-size:14px;color:#667781;text-decoration:line-through;">$197</div><div style="font-size:44px;font-weight:900;color:#111b21;line-height:1;letter-spacing:-1px;">$39</div><div style="font-size:13px;font-weight:700;color:#25D366;margin:6px 0 6px;">You save $158 today!</div><div style="font-size:11px;color:#667781;margin-bottom:14px;"><span style="color:#128C7E;font-weight:600;">One-time payment</span> · Lifetime access · 30-day guarantee</div><a href="https://go.centerpag.com/PPU38CQEHD1?name=' + encodeURIComponent($json.name || '') + '&email=' + encodeURIComponent($json.email || '') + '&phone=' + encodeURIComponent($json.phone || '') + '&plan=full&utm_source=email&utm_medium=recovery&utm_campaign=e3" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">🔓 UNLOCK FULL ACCESS NOW<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Checkout · $39') + '</span></a><div style="margin-top:12px;font-size:11px;color:#128C7E;">🔒 Secure payment · Access in up to 2 minutes</div><div style="margin-top:6px;font-size:11px;color:#667781;">💳 Visa · Mastercard · Amex · PayPal</div></div></td></tr>'
+ '<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">App Spy · No install on their phone · Private &amp; remote</td></tr>'
+ '</table></td></tr></table></body></html>')`;

const htmlE4 = `(''
+ '<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,Helvetica,sans-serif;">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f0f2f5;padding:20px 10px;"><tr><td align="center">'
+ '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:420px;">'
+ '<tr><td style="background:#111b21;padding:14px 16px;border-radius:12px 12px 0 0;"><div style="font-size:11px;font-weight:700;letter-spacing:.08em;color:#25D366;text-transform:uppercase;">Final email · App Spy</div><div style="font-size:18px;font-weight:800;color:#ffffff;margin-top:6px;line-height:1.3;">We won\\'t keep emailing about this scan</div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:14px 16px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;"><div style="background:#fff8f8;border:1px solid #fecaca;border-radius:12px;padding:12px 14px;"><div style="font-size:13px;font-weight:800;color:#111b21;">🔓 Unprotected account</div><div style="font-size:14px;font-weight:700;color:#111b21;margin:6px 0;">' + ($json.phone || 'Number from your scan') + '</div><div style="font-size:12px;color:#667781;line-height:1.5;">Hi ' + ($json.name || 'there') + ' — this is the last note. Claim this one-time exclusive discount and unlock deleted messages, chats, media, and locations.</div></div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 12px;border-left:1px solid #e9edef;border-right:1px solid #e9edef;"><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:12px;text-align:center;"><div style="font-size:14px;font-weight:800;color:#128C7E;">✅ Your recovery is still saved</div><div style="font-size:12px;color:#667781;margin-top:4px;">One-time exclusive discount · Lifetime access · 30-day guarantee</div></div></td></tr>'
+ '<tr><td style="background:#ffffff;padding:0 16px 16px;border:1px solid #e9edef;border-top:none;border-radius:0 0 12px 12px;"><div style="border:2px solid #25D366;border-radius:16px;padding:18px 14px;text-align:center;box-shadow:0 4px 24px rgba(37,211,102,.15);"><div style="display:inline-block;background:#fee2e2;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:700;color:#ef4444;margin-bottom:10px;">EXCLUSIVE · $10 OFF · LAST CALL</div><div style="font-size:13px;color:#667781;margin-bottom:6px;">$39 → <strong style="color:#111b21;">$29 Instead of $39</strong></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 12px;"><tr><td style="text-align:center;width:45%;"><div style="font-size:11px;color:#667781;text-transform:uppercase;letter-spacing:.04em;">Original</div><div style="font-size:22px;font-weight:700;color:#9ca3af;text-decoration:line-through;">$39</div></td><td style="text-align:center;width:10%;font-size:18px;color:#667781;font-weight:700;">→</td><td style="text-align:center;width:45%;"><div style="font-size:11px;color:#128C7E;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">Your price now</div><div style="font-size:40px;font-weight:900;color:#111b21;line-height:1;">$29</div></td></tr></table><div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;padding:5px 12px;font-size:12px;font-weight:700;color:#128C7E;margin-bottom:14px;">Save $10</div><a href="https://go.centerpag.com/PPU38CQEKTG?name=' + encodeURIComponent($json.name || '') + '&email=' + encodeURIComponent($json.email || '') + '&phone=' + encodeURIComponent($json.phone || '') + '&plan=backredirect&utm_source=email&utm_medium=recovery&utm_campaign=e4" style="display:block;background:#25D366;color:#ffffff;text-decoration:none;font-weight:900;font-size:15px;padding:16px 12px;border-radius:13px;box-shadow:0 4px 24px rgba(37,211,102,.35);">✅ Claim My $10 Discount Now<br><span style="font-size:11px;font-weight:600;opacity:.9;">' + ($json.phone || 'Unlock · $29 one-time') + '</span></a><div style="margin-top:12px;font-size:11px;color:#667781;">After this, we stop emails about this scan.</div></div></td></tr>'
+ '<tr><td style="padding:14px 8px;text-align:center;font-size:11px;color:#667781;">App Spy · SSL Secure · Same offer as exit special · Undetectable remote access</td></tr>'
+ '</table></td></tr></table></body></html>')`;

const subjects = {
  e1: "($json.name || 'there') + ', your report is ready — unlock full access'",
  e2: "($json.name || 'there') + ' — deleted messages still locked for ' + ($json.phone || 'your number')",
  e3: "'75% OFF still open for ' + ($json.phone || 'your scan') + ', ' + ($json.name || 'there')",
  e4: "($json.name || 'there') + ' — exclusive $10 off (last email): unlock for $29'",
};

function getRowNode(id, name, position) {
  return {
    parameters: {
      authentication: "oAuth2",
      resource: "sheet",
      operation: "read",
      documentId: sheetDoc,
      sheetName: sheetName,
      filtersUI: {
        values: [
          {
            lookupColumn: "email",
            lookupValue: "={{ $('Normalize Lead').item.json.email }}",
          },
        ],
      },
      options: {
        returnFirstMatch: true,
        dataLocationOnSheet: {
          values: {
            rangeDefinition: "detectAutomatically",
          },
        },
      },
    },
    id,
    name,
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.5,
    position,
    credentials: sheetsCred(),
    notes:
      "Filter Column = email (texto fixo). Value = expression do Normalize Lead. Re-selecione Document/Sheet From list após import.",
  };
}

function ifNotPurchased(id, name, position) {
  return {
    parameters: {
      conditions: {
        options: {
          caseSensitive: false,
          leftValue: "",
          typeValidation: "loose",
          version: 2,
        },
        conditions: [
          {
            id: `${id}-c1`,
            leftValue: "={{ String($json.purchased ?? '').toLowerCase() }}",
            rightValue: "true",
            operator: { type: "string", operation: "notEquals" },
          },
          {
            id: `${id}-c2`,
            leftValue: "={{ String($json.purchased ?? '').toLowerCase() }}",
            rightValue: "yes",
            operator: { type: "string", operation: "notEquals" },
          },
          {
            id: `${id}-c3`,
            leftValue: "={{ String($json.purchased ?? '').toLowerCase() }}",
            rightValue: "1",
            operator: { type: "string", operation: "notEquals" },
          },
        ],
        combinator: "and",
      },
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position,
  };
}

function resendNode(id, name, position, subjectExpr, htmlExpr) {
  return {
    parameters: {
      method: "POST",
      url: "https://api.resend.com/emails",
      authentication: "genericCredentialType",
      genericAuthType: "httpHeaderAuth",
      sendHeaders: true,
      headerParameters: {
        parameters: [{ name: "Content-Type", value: "application/json" }],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: resendJsonBody(subjectExpr, htmlExpr),
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position,
    credentials: resendCred(),
  };
}

function waitNode(id, name, position, amount, unit) {
  return {
    parameters: {
      resume: "timeInterval",
      amount,
      unit,
    },
    id,
    name,
    type: "n8n-nodes-base.wait",
    typeVersion: 1.1,
    position,
    webhookId: `${id}-wait`,
  };
}

function keepLead(id, name, position) {
  return {
    parameters: {
      mode: "manual",
      duplicateItem: false,
      assignments: {
        assignments: [
          {
            id: "k1",
            name: "email",
            value: "={{ $('Normalize Lead').item.json.email }}",
            type: "string",
          },
          {
            id: "k2",
            name: "name",
            value: "={{ $('Normalize Lead').item.json.name }}",
            type: "string",
          },
          {
            id: "k3",
            name: "phone",
            value: "={{ $('Normalize Lead').item.json.phone }}",
            type: "string",
          },
        ],
      },
      options: {},
    },
    id,
    name,
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position,
  };
}

const nodes = [
  {
    parameters: {
      httpMethod: "POST",
      path: "lead-funnel-recovery",
      responseMode: "onReceived",
      options: {},
    },
    id: "webhook-lead",
    name: "Webhook Lead",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [200, 360],
    webhookId: "lead-funnel-recovery",
  },
  {
    parameters: {
      mode: "manual",
      duplicateItem: false,
      assignments: {
        assignments: [
          {
            id: "a1",
            name: "email",
            value:
              "={{ String($json.body?.email || $json.email || '').trim().toLowerCase() }}",
            type: "string",
          },
          {
            id: "a2",
            name: "name",
            value: "={{ String($json.body?.name || $json.name || '').trim() }}",
            type: "string",
          },
          {
            id: "a3",
            name: "phone",
            value: "={{ String($json.body?.phone || $json.phone || '').trim() }}",
            type: "string",
          },
          {
            id: "a4",
            name: "purchased",
            value: "false",
            type: "string",
          },
          {
            id: "a5",
            name: "visitor_id",
            value:
              "={{ String($json.body?.visitor_id || $json.body?.visitorId || $json.visitor_id || '') }}",
            type: "string",
          },
          {
            id: "a6",
            name: "utm_source",
            value:
              "={{ String($json.body?.utm_source || $json.body?.utmSource || '') }}",
            type: "string",
          },
          {
            id: "a7",
            name: "utm_medium",
            value:
              "={{ String($json.body?.utm_medium || $json.body?.utmMedium || '') }}",
            type: "string",
          },
          {
            id: "a8",
            name: "utm_campaign",
            value:
              "={{ String($json.body?.utm_campaign || $json.body?.utmCampaign || '') }}",
            type: "string",
          },
          {
            id: "a9",
            name: "created_at",
            value: "={{ $now.toISO() }}",
            type: "string",
          },
          {
            id: "a10",
            name: "status",
            value: "pending",
            type: "string",
          },
        ],
      },
      options: {},
    },
    id: "normalize-lead",
    name: "Normalize Lead",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position: [420, 360],
  },
  {
    parameters: {
      authentication: "oAuth2",
      resource: "sheet",
      operation: "append",
      documentId: sheetDoc,
      sheetName: sheetName,
      // autoMap evita o erro "Column names were updated / Column to Match On"
      // (schema rígido no import quebra quando a planilha é ligada depois)
      columns: {
        mappingMode: "autoMapInputData",
        value: {},
        matchingColumns: [],
        schema: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false,
      },
      options: {},
    },
    id: "append-row",
    name: "Append row in sheet",
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.5,
    position: [640, 360],
    credentials: sheetsCred(),
    notes:
      "DEPOIS DO IMPORT: Credential + Document (From list) + Sheet Leads (From list). Mapping = Auto-map.",
  },
  keepLead("keep-lead", "Keep Lead Fields", [860, 360]),
  waitNode("wait-30m", "Wait 30 min (E1)", [1080, 360], 30, "minutes"),
  getRowNode("get-e1", "Get row (E1)", [1300, 360]),
  ifNotPurchased("if-e1", "If not purchased (E1)", [1520, 360]),
  resendNode("email-1", "Email 1 ($39)", [1760, 240], subjects.e1, htmlE1),
  keepLead("keep-after-e1", "Keep after E1", [1980, 240]),
  waitNode("wait-24h-e2", "Wait 24h (E2)", [2200, 240], 24, "hours"),
  getRowNode("get-e2", "Get row (E2)", [2420, 240]),
  ifNotPurchased("if-e2", "If not purchased (E2)", [2640, 240]),
  resendNode("email-2", "Email 2 ($39)", [2880, 140], subjects.e2, htmlE2),
  keepLead("keep-after-e2", "Keep after E2", [3100, 140]),
  waitNode("wait-24h-e3", "Wait 24h (E3)", [3320, 140], 24, "hours"),
  getRowNode("get-e3", "Get row (E3)", [3540, 140]),
  ifNotPurchased("if-e3", "If not purchased (E3)", [3760, 140]),
  resendNode("email-3", "Email 3 ($39)", [4000, 40], subjects.e3, htmlE3),
  keepLead("keep-after-e3", "Keep after E3", [4220, 40]),
  waitNode("wait-24h-e4", "Wait 24h (E4)", [4440, 40], 24, "hours"),
  getRowNode("get-e4", "Get row (E4)", [4660, 40]),
  ifNotPurchased("if-e4", "If not purchased (E4)", [4880, 40]),
  resendNode("email-4", "Email 4 ($29)", [5120, 40], subjects.e4, htmlE4),
];

const connections = {
  "Webhook Lead": {
    main: [[{ node: "Normalize Lead", type: "main", index: 0 }]],
  },
  "Normalize Lead": {
    main: [[{ node: "Append row in sheet", type: "main", index: 0 }]],
  },
  "Append row in sheet": {
    main: [[{ node: "Keep Lead Fields", type: "main", index: 0 }]],
  },
  "Keep Lead Fields": {
    main: [[{ node: "Wait 30 min (E1)", type: "main", index: 0 }]],
  },
  "Wait 30 min (E1)": {
    main: [[{ node: "Get row (E1)", type: "main", index: 0 }]],
  },
  "Get row (E1)": {
    main: [[{ node: "If not purchased (E1)", type: "main", index: 0 }]],
  },
  "If not purchased (E1)": {
    main: [[{ node: "Email 1 ($39)", type: "main", index: 0 }], []],
  },
  "Email 1 ($39)": {
    main: [[{ node: "Keep after E1", type: "main", index: 0 }]],
  },
  "Keep after E1": {
    main: [[{ node: "Wait 24h (E2)", type: "main", index: 0 }]],
  },
  "Wait 24h (E2)": {
    main: [[{ node: "Get row (E2)", type: "main", index: 0 }]],
  },
  "Get row (E2)": {
    main: [[{ node: "If not purchased (E2)", type: "main", index: 0 }]],
  },
  "If not purchased (E2)": {
    main: [[{ node: "Email 2 ($39)", type: "main", index: 0 }], []],
  },
  "Email 2 ($39)": {
    main: [[{ node: "Keep after E2", type: "main", index: 0 }]],
  },
  "Keep after E2": {
    main: [[{ node: "Wait 24h (E3)", type: "main", index: 0 }]],
  },
  "Wait 24h (E3)": {
    main: [[{ node: "Get row (E3)", type: "main", index: 0 }]],
  },
  "Get row (E3)": {
    main: [[{ node: "If not purchased (E3)", type: "main", index: 0 }]],
  },
  "If not purchased (E3)": {
    main: [[{ node: "Email 3 ($39)", type: "main", index: 0 }], []],
  },
  "Email 3 ($39)": {
    main: [[{ node: "Keep after E3", type: "main", index: 0 }]],
  },
  "Keep after E3": {
    main: [[{ node: "Wait 24h (E4)", type: "main", index: 0 }]],
  },
  "Wait 24h (E4)": {
    main: [[{ node: "Get row (E4)", type: "main", index: 0 }]],
  },
  "Get row (E4)": {
    main: [[{ node: "If not purchased (E4)", type: "main", index: 0 }]],
  },
  "If not purchased (E4)": {
    main: [[{ node: "Email 4 ($29)", type: "main", index: 0 }], []],
  },
};

const recoveryWorkflow = {
  name: "Captura Lead Funil — Recovery 4 Emails",
  nodes,
  connections,
  settings: { executionOrder: "v1" },
  staticData: null,
  meta: { templateCredsSetupCompleted: false },
  pinData: {},
};

const purchaseWorkflow = {
  name: "Mark Lead Purchased (skip recovery)",
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "lead-purchased",
        responseMode: "onReceived",
        options: {},
      },
      id: "wh-purchase",
      name: "Webhook Purchase",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2,
      position: [240, 300],
      webhookId: "lead-purchased",
    },
    {
      parameters: {
        mode: "manual",
        assignments: {
          assignments: [
            {
              id: "p1",
              name: "email",
              value:
                "={{ String($json.body?.email || $json.email || '').trim().toLowerCase() }}",
              type: "string",
            },
            {
              id: "p2",
              name: "purchased",
              value: "true",
              type: "string",
            },
            {
              id: "p3",
              name: "status",
              value: "purchased",
              type: "string",
            },
          ],
        },
        options: {},
      },
      id: "norm-purchase",
      name: "Normalize Purchase",
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [480, 300],
    },
    {
      parameters: {
        authentication: "oAuth2",
        resource: "sheet",
        operation: "update",
        documentId: sheetDoc,
        sheetName: sheetName,
        columns: {
          mappingMode: "defineBelow",
          value: {
            email: "={{ $json.email }}",
            purchased: "true",
            status: "purchased",
          },
          matchingColumns: ["email"],
          schema: [
            {
              id: "email",
              displayName: "email",
              required: true,
              defaultMatch: true,
              display: true,
              type: "string",
              canBeUsedToMatch: true,
              removed: false,
            },
            {
              id: "purchased",
              displayName: "purchased",
              required: false,
              defaultMatch: false,
              display: true,
              type: "string",
              canBeUsedToMatch: false,
              removed: false,
            },
            {
              id: "status",
              displayName: "status",
              required: false,
              defaultMatch: false,
              display: true,
              type: "string",
              canBeUsedToMatch: false,
              removed: false,
            },
          ],
          attemptToConvertTypes: false,
          convertFieldsToString: false,
        },
        options: {},
      },
      id: "update-row",
      name: "Update purchased in sheet",
      type: "n8n-nodes-base.googleSheets",
      typeVersion: 4.5,
      position: [720, 300],
      credentials: sheetsCred(),
      notes:
        "Match on column email. After import: re-select Document + Sheet from list.",
    },
  ],
  connections: {
    "Webhook Purchase": {
      main: [[{ node: "Normalize Purchase", type: "main", index: 0 }]],
    },
    "Normalize Purchase": {
      main: [[{ node: "Update purchased in sheet", type: "main", index: 0 }]],
    },
  },
  settings: { executionOrder: "v1" },
  meta: { templateCredsSetupCompleted: false },
  pinData: {},
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "workflow-lead-recovery-4emails.json"),
  JSON.stringify(recoveryWorkflow, null, 2)
);
fs.writeFileSync(
  path.join(outDir, "workflow-mark-purchased.json"),
  JSON.stringify(purchaseWorkflow, null, 2)
);

console.log("Wrote:");
console.log(" -", path.join(outDir, "workflow-lead-recovery-4emails.json"));
console.log(" -", path.join(outDir, "workflow-mark-purchased.json"));
console.log("Recovery nodes:", recoveryWorkflow.nodes.length);
