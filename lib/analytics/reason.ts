/**
 * Resolve reason labels for analytics (server-side fallback).
 * Client may omit fields (cached JS, Meta in-app, sendBeacon quirks) —
 * always prefer cookies + UA so the dashboard never shows empty Motivo.
 */

import type { NextRequest } from "next/server";
import { checkBot, extractClientIp } from "@/utils/botDetect";

export type ResolvedReason = {
  reason: string;
  reasonLabel: string;
  isBot: boolean | null;
  hasParam: boolean | null;
};

/** Labels for known reason codes (incl. legacy cloaker codes for old events). */
export const REASON_LABELS: Record<string, string> = {
  direct: "Link direto",
  clean: "Link direto",
  bot: "Bot / crawler detectado",
  bot_ua: "Bot / crawler (User-Agent)",
  meta_ip: "Bot Meta (IP datacenter Facebook)",
  google_bot_ip: "Bot Google (IP crawler)",
  empty_ua: "Bot / UA vazio",
  force_black: "Teste local / force black",
  test_param: "Parâmetro ?test= válido",
  no_ad_source: "Sem origem Meta/Google/YouTube",
  no_cat_param: "Sem parâmetro cat (cookie)",
  cat_cookie: "Com parâmetro cat (cookie)",
  blocked_country: "País bloqueado",
  blocked_language: "Idioma bloqueado",
  vpn_proxy: "VPN / Proxy / Datacenter",
  white_blocked: "Bloqueado (white)",
  upsell_open: "Upsell aberto",
};

function labelFor(code: string, fallback?: string): string {
  if (!code) return fallback || "";
  if (REASON_LABELS[code]) return REASON_LABELS[code];
  // already a human label
  if (code.includes(" ") || code.includes("·") || /[àáâãéêíóôõúç]/i.test(code)) {
    return code;
  }
  return fallback || code;
}

function cookieBool(req: NextRequest, name: string): boolean | null {
  const v = req.cookies.get(name)?.value;
  if (v === "1" || v === "true") return true;
  if (v === "0" || v === "false") return false;
  return null;
}

/**
 * Resolve reason/isBot/hasParam from request body + cookies + UA.
 */
export function resolveAnalyticsReason(
  req: NextRequest,
  opts: {
    bodyReason?: string;
    bodyReasonLabel?: string;
    bodyIsBot?: boolean | null;
    bodyHasParam?: boolean | null;
    layer?: string;
    ua?: string;
    device?: string;
    meta?: Record<string, unknown>;
  }
): ResolvedReason {
  const meta = opts.meta || {};
  const headerUa = req.headers.get("user-agent") || "";
  const bodyUa = opts.ua || "";
  const ua = bodyUa || headerUa;
  const ip = extractClientIp(req.headers);
  const botCheck = checkBot(ua, ip);
  const device = (opts.device || "").toLowerCase();

  // --- isBot --- (server IP/UA wins over client "Humano" lies)
  let isBot: boolean | null =
    botCheck.isBot
      ? true
      : typeof opts.bodyIsBot === "boolean"
        ? opts.bodyIsBot
        : typeof meta.isBot === "boolean"
          ? (meta.isBot as boolean)
          : cookieBool(req, "zs_is_bot");

  if (isBot === null) {
    isBot = device === "bot";
  }
  if (botCheck.isBot) isBot = true;

  // --- hasParam --- (ad click ids / UTMs still useful for reporting)
  let hasParam: boolean | null =
    typeof opts.bodyHasParam === "boolean"
      ? opts.bodyHasParam
      : typeof meta.hasCatParam === "boolean"
        ? (meta.hasCatParam as boolean)
        : typeof meta.hasCatCookie === "boolean"
          ? (meta.hasCatCookie as boolean)
          : cookieBool(req, "zs_has_param");

  if (hasParam === null) {
    hasParam = false;
  }

  // --- reason code / label ---
  let reason = String(
    opts.bodyReason ||
      meta.reason ||
      req.cookies.get("zs_reason")?.value ||
      ""
  ).slice(0, 80);

  let reasonLabel = String(
    opts.bodyReasonLabel ||
      meta.reasonLabel ||
      req.cookies.get("zs_reason_label")?.value ||
      ""
  ).slice(0, 120);

  // decodeURIComponent if cookie came encoded
  try {
    if (reasonLabel && /%[0-9A-Fa-f]{2}/.test(reasonLabel)) {
      reasonLabel = decodeURIComponent(reasonLabel);
    }
    if (reason && /%[0-9A-Fa-f]{2}/.test(reason)) {
      reason = decodeURIComponent(reason);
    }
  } catch {
    /* keep raw */
  }

  // Bot IP/UA should show bot reason, not "direct"
  if (botCheck.isBot && botCheck.reason) {
    if (
      !reason ||
      reason === "clean" ||
      reason === "direct" ||
      reason === "cat_cookie" ||
      reasonLabel.includes("passou em todos") ||
      reasonLabel.includes("Link direto")
    ) {
      reason = botCheck.reason;
      reasonLabel = botCheck.label || REASON_LABELS[botCheck.reason] || reasonLabel;
    }
  }

  if (!reason) {
    reason = isBot ? "bot" : "direct";
  }
  if (!reasonLabel) {
    reasonLabel = labelFor(reason, isBot ? REASON_LABELS.bot : REASON_LABELS.direct);
  }

  // Prefer official label for known codes
  if (REASON_LABELS[reason]) {
    reasonLabel = REASON_LABELS[reason];
  } else if (reason && reason === reasonLabel) {
    reasonLabel = labelFor(reason, reasonLabel);
  }

  return {
    reason: reason || "direct",
    reasonLabel: reasonLabel || labelFor(reason, "Link direto"),
    isBot,
    hasParam,
  };
}

/**
 * Display fallback when stored reason is still empty (old events).
 */
export function displayReasonFallback(
  layer: string,
  isBot: boolean | null,
  hasParam: boolean | null,
  device?: string
): string {
  const bot =
    isBot === true ||
    (device || "").toLowerCase() === "bot";
  if (bot) return REASON_LABELS.bot;
  if (layer === "white") {
    return "Bloqueado (white)";
  }
  return REASON_LABELS.direct;
}
