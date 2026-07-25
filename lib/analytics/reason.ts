/**
 * Resolve cloaker block/pass reason for analytics (server-side fallback).
 * Client may omit fields (cached JS, Meta in-app, sendBeacon quirks) —
 * always prefer cookies + UA so the dashboard never shows empty Motivo.
 */

import type { NextRequest } from "next/server";
import { REASON_LABELS } from "@/utils/ContentFilter";
import { checkBot, extractClientIp } from "@/utils/botDetect";

export type ResolvedReason = {
  reason: string;
  reasonLabel: string;
  isBot: boolean | null;
  hasParam: boolean | null;
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
 * Infer reason when body/cookies don't carry an explicit decision.
 */
function inferFromContext(
  layer: string,
  isBot: boolean,
  hasParam: boolean,
  hasForceBlack: boolean,
  hasCatCookie: boolean
): { reason: string; reasonLabel: string } {
  if (hasForceBlack) {
    return {
      reason: "force_black",
      reasonLabel: REASON_LABELS.force_black,
    };
  }
  if (layer === "black" || hasCatCookie) {
    if (hasCatCookie) {
      return {
        reason: "cat_cookie",
        reasonLabel: "Com parâmetro cat (cookie)",
      };
    }
    return {
      reason: "clean",
      reasonLabel: REASON_LABELS.clean,
    };
  }
  // white / unknown
  if (isBot) {
    return { reason: "bot", reasonLabel: REASON_LABELS.bot };
  }
  if (!hasParam) {
    return {
      reason: "no_cat_param",
      reasonLabel: REASON_LABELS.no_cat_param,
    };
  }
  return {
    reason: "white_blocked",
    reasonLabel: "Bloqueado (white)",
  };
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
  const layer = (opts.layer || req.cookies.get("zs_layer")?.value || "").toLowerCase();
  const device = (opts.device || "").toLowerCase();

  const hasForceBlack = req.cookies.get("force_black")?.value === "1";
  const hasCatCookie = req.cookies.get("cat_valid")?.value === "1";

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

  // --- hasParam ---
  let hasParam: boolean | null =
    typeof opts.bodyHasParam === "boolean"
      ? opts.bodyHasParam
      : typeof meta.hasCatParam === "boolean"
        ? (meta.hasCatParam as boolean)
        : typeof meta.hasCatCookie === "boolean"
          ? (meta.hasCatCookie as boolean)
          : cookieBool(req, "zs_has_param");

  if (hasParam === null) {
    hasParam = hasCatCookie || hasForceBlack;
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

  // Meta IP bots should never show as "passou em todos os filtros"
  if (botCheck.isBot && botCheck.reason) {
    if (
      !reason ||
      reason === "clean" ||
      reason === "cat_cookie" ||
      reasonLabel.includes("passou em todos")
    ) {
      reason = botCheck.reason;
      reasonLabel = botCheck.label || REASON_LABELS[botCheck.reason] || reasonLabel;
    }
  }

  if (!reason || !reasonLabel) {
    const inferred = inferFromContext(
      layer,
      !!isBot,
      !!hasParam,
      hasForceBlack,
      hasCatCookie
    );
    if (!reason) reason = inferred.reason;
    if (!reasonLabel) reasonLabel = inferred.reasonLabel;
  } else if (!reasonLabel) {
    reasonLabel = labelFor(reason);
  } else if (!reason) {
    // only label — try reverse map
    reason = reasonLabel;
  }

  // Prefer official label for known codes
  if (REASON_LABELS[reason]) {
    reasonLabel = REASON_LABELS[reason];
  } else if (reason && reason === reasonLabel) {
    reasonLabel = labelFor(reason, reasonLabel);
  }

  return {
    reason: reason || "unknown",
    reasonLabel: reasonLabel || labelFor(reason, "—"),
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
  if (layer === "black") {
    if (hasParam) return "Com parâmetro cat (cookie)";
    return REASON_LABELS.clean;
  }
  if (layer === "white") {
    if (hasParam === false || hasParam == null) {
      return REASON_LABELS.no_cat_param;
    }
    return "Bloqueado (white)";
  }
  return "—";
}
