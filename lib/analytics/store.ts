/**
 * Analytics store
 * 1) Postgres (DATABASE_URL / POSTGRES_URL) — Supabase / Neon / any PG — durable
 * 2) Upstash Redis — if configured
 * 3) In-memory — last resort (ephemeral on Vercel)
 *
 * History is NEVER auto-deleted except:
 *  - explicit clearHistory() (Reset button)
 *  - hard cap MAX_EVENTS (oldest dropped only when over cap)
 */

import postgres, { type Sql } from "postgres";
import {
  isBotUserAgent,
  isGoogleBotIp,
  isMetaDatacenterIp,
} from "@/utils/botDetect";

export type Presence = {
  visitorId: string;
  page: string;
  stage: string;
  maxStage: string;
  layer: "white" | "black" | "unknown";
  source: string;
  landing: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  country: string;
  domain: string;
  ip: string;
  device: string;
  reason: string;
  reasonLabel: string;
  isBot: boolean | null;
  hasParam: boolean | null;
  ts: number;
  firstSeen: number;
};

export type AnalyticsEvent = {
  id: string;
  type: string;
  visitorId: string;
  page: string;
  stage: string;
  layer: "white" | "black" | "unknown";
  source: string;
  landing: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  country: string;
  domain: string;
  ip: string;
  device: string;
  reason: string;
  reasonLabel: string;
  isBot: boolean | null;
  hasParam: boolean | null;
  meta?: Record<string, unknown>;
  ts: number;
};

/** Online window — longer so we can write presence less often (saves DB transfer) */
const ONLINE_MS = 90_000;
const MAX_EVENTS = 20_000;
/** Pageview dedupe window — NOT forever (returning visitors must still count "today") */
const PAGEVIEW_DEDUP_MS = 4 * 60 * 60 * 1000; // 4h
/** Min interval between presence DB writes per visitor (mem always updated) */
const PRESENCE_DB_WRITE_MS = 40_000;
/** Short cache for dashboard range reads (cuts transfer on 8s polling) */
const EVENTS_CACHE_MS = 6_000;

const g = globalThis as unknown as {
  __zsPresence?: Map<string, Presence>;
  __zsEvents?: AnalyticsEvent[];
  __zsEventsCache?: {
    at: number;
    from: number;
    to: number;
    limit: number;
    events: AnalyticsEvent[];
  };
  __zsPgReady?: boolean;
  __zsPgError?: string;
  __zsPgLastCheck?: number;
  __zsSql?: Sql;
  __zsLastPresenceDb?: Map<string, number>;
  __zsInsertCount?: number;
};

function memPresence() {
  if (!g.__zsPresence) g.__zsPresence = new Map();
  return g.__zsPresence;
}
function memEvents() {
  if (!g.__zsEvents) g.__zsEvents = [];
  return g.__zsEvents;
}

function databaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    ""
  );
}

function hasPostgres() {
  return !!databaseUrl();
}

function hasRedis() {
  return !!(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

function pgErrorMessage(e: unknown): string {
  if (!e) return "unknown postgres error";
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return "unknown postgres error";
  }
}

function markPgDown(e: unknown) {
  g.__zsPgReady = false;
  g.__zsPgError = pgErrorMessage(e);
  g.__zsPgLastCheck = Date.now();
  // Force new client after quota/auth failures
  if (/402|quota|exceeded|unauthorized|password/i.test(g.__zsPgError)) {
    g.__zsSql = undefined;
  }
}

export type StorageInfo = {
  durable: boolean;
  backend: "postgres" | "redis" | "memory";
  /** What env is configured (even if currently down) */
  configured: "postgres" | "redis" | "memory";
  error?: string;
};

/**
 * Actual runtime storage — probes Postgres when configured.
 * Never claim durable:true if DB is down (quota, network, etc.).
 */
export async function getStorageBackend(): Promise<StorageInfo> {
  if (hasPostgres()) {
    const ok = await ensurePg();
    if (ok) {
      return { durable: true, backend: "postgres", configured: "postgres" };
    }
    if (hasRedis()) {
      return {
        durable: true,
        backend: "redis",
        configured: "postgres",
        error: g.__zsPgError || "Postgres unreachable — using Redis",
      };
    }
    return {
      durable: false,
      backend: "memory",
      configured: "postgres",
      error:
        g.__zsPgError ||
        "Postgres unreachable — falling back to memory (lost on deploy)",
    };
  }
  if (hasRedis()) {
    return { durable: true, backend: "redis", configured: "redis" };
  }
  return { durable: false, backend: "memory", configured: "memory" };
}

function sql(): Sql {
  if (!g.__zsSql) {
    // Pooled URL preferred; strip channel_binding (Neon-only) for Supabase/etc.
    let url = databaseUrl();
    try {
      url = url
        .replace(/([?&])channel_binding=require&?/i, "$1")
        .replace(/[?&]$/, "");
    } catch {
      /* keep raw */
    }
    g.__zsSql = postgres(url, {
      ssl: "require",
      max: 1, // serverless-friendly
      idle_timeout: 20,
      connect_timeout: 15,
      prepare: false, // required for Supabase transaction pooler / PgBouncer
      onnotice: () => {},
    });
  }
  return g.__zsSql;
}

async function ensurePg(): Promise<boolean> {
  if (!hasPostgres()) return false;
  // Re-probe periodically if previously failed (quota may reset; cold starts)
  if (g.__zsPgReady) return true;
  const last = g.__zsPgLastCheck || 0;
  // After a hard failure, wait 30s before retrying (avoid hammering 402)
  if (g.__zsPgError && Date.now() - last < 30_000) return false;

  try {
    const q = sql();
    // Cheap ping first — fail fast on quota without running DDL
    await q`SELECT 1 AS ok`;

    await q`
      CREATE TABLE IF NOT EXISTS zs_events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        visitor_id TEXT NOT NULL,
        page TEXT,
        stage TEXT,
        layer TEXT,
        source TEXT,
        landing TEXT,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        country TEXT,
        domain TEXT,
        ip TEXT,
        device TEXT,
        reason TEXT,
        reason_label TEXT,
        is_bot BOOLEAN,
        has_param BOOLEAN,
        meta JSONB,
        ts BIGINT NOT NULL
      )
    `;
    await q`CREATE INDEX IF NOT EXISTS zs_events_ts_idx ON zs_events (ts DESC)`;
    await q`CREATE INDEX IF NOT EXISTS zs_events_type_idx ON zs_events (type)`;
    await q`CREATE INDEX IF NOT EXISTS zs_events_visitor_idx ON zs_events (visitor_id)`;

    await q`
      CREATE TABLE IF NOT EXISTS zs_presence (
        visitor_id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        ts BIGINT NOT NULL
      )
    `;
    await q`CREATE INDEX IF NOT EXISTS zs_presence_ts_idx ON zs_presence (ts DESC)`;
    g.__zsPgReady = true;
    g.__zsPgError = undefined;
    g.__zsPgLastCheck = Date.now();
    return true;
  } catch (e) {
    console.error("ensurePg failed", e);
    markPgDown(e);
    return false;
  }
}

async function redis(command: (string | number)[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`redis ${res.status}`);
  const data = (await res.json()) as { result: unknown };
  return data.result;
}

export const STAGE_RANK: Record<string, number> = {
  entry: 1,
  landing: 2,
  phone: 2,
  scan: 3,
  recovery: 4,
  conversas: 5,
  chat: 5,
  cta: 6,
  checkout: 7,
  upsell1: 8,
  upsell2: 9,
  upsell3: 10,
  upsell4: 11,
  upsell5: 12,
  upsell6: 13,
  upsell7: 14,
  thankyou: 15,
  white: 0,
  black: 1,
  dashboard: 0,
  other: 0,
};

export function maxStageOf(a: string, b: string): string {
  const ra = STAGE_RANK[a] ?? 0;
  const rb = STAGE_RANK[b] ?? 0;
  return rb >= ra ? b : a;
}

function rowToEvent(r: Record<string, unknown>): AnalyticsEvent {
  return {
    id: String(r.id),
    type: String(r.type || "pageview"),
    visitorId: String(r.visitor_id || r.visitorId || ""),
    page: String(r.page || ""),
    stage: String(r.stage || ""),
    layer: (r.layer as AnalyticsEvent["layer"]) || "unknown",
    source: String(r.source || ""),
    landing: String(r.landing || ""),
    utmSource: String(r.utm_source || r.utmSource || ""),
    utmMedium: String(r.utm_medium || r.utmMedium || ""),
    utmCampaign: String(r.utm_campaign || r.utmCampaign || ""),
    country: String(r.country || ""),
    domain: String(r.domain || ""),
    ip: String(r.ip || ""),
    device: String(r.device || ""),
    reason: String(r.reason || ""),
    reasonLabel: String(r.reason_label || r.reasonLabel || ""),
    isBot:
      typeof r.is_bot === "boolean"
        ? r.is_bot
        : typeof r.isBot === "boolean"
          ? (r.isBot as boolean)
          : null,
    hasParam:
      typeof r.has_param === "boolean"
        ? r.has_param
        : typeof r.hasParam === "boolean"
          ? (r.hasParam as boolean)
          : null,
    meta:
      r.meta && typeof r.meta === "object"
        ? (r.meta as Record<string, unknown>)
        : undefined,
    ts: Number(r.ts) || 0,
  };
}

export async function upsertPresence(p: Presence): Promise<void> {
  let prev: Presence | null = null;

  if (await ensurePg()) {
    try {
      const q = sql();
      const rows = await q`
        SELECT data FROM zs_presence WHERE visitor_id = ${p.visitorId} LIMIT 1
      `;
      if (rows[0]?.data) {
        prev =
          typeof rows[0].data === "string"
            ? (JSON.parse(rows[0].data as string) as Presence)
            : (rows[0].data as Presence);
      }
    } catch {
      prev = memPresence().get(p.visitorId) || null;
    }
  } else if (hasRedis()) {
    const raw = (await redis(["GET", `zs:presence:${p.visitorId}`])) as
      | string
      | null;
    if (raw) {
      try {
        prev = JSON.parse(raw) as Presence;
      } catch {
        prev = null;
      }
    }
  } else {
    prev = memPresence().get(p.visitorId) || null;
  }

  const merged: Presence = {
    ...p,
    firstSeen: prev?.firstSeen || p.firstSeen || p.ts,
    maxStage: maxStageOf(prev?.maxStage || p.stage, p.stage),
    reason: p.reason || prev?.reason || "",
    reasonLabel: p.reasonLabel || prev?.reasonLabel || "",
    isBot: p.isBot ?? prev?.isBot ?? null,
    hasParam: p.hasParam ?? prev?.hasParam ?? null,
    ip: p.ip || prev?.ip || "",
    device: p.device || prev?.device || "",
    domain: p.domain || prev?.domain || "",
    country: p.country || prev?.country || "",
  };

  memPresence().set(p.visitorId, merged);

  // Throttle DB writes: always keep mem fresh for same-instance, write durable less often
  if (!g.__zsLastPresenceDb) g.__zsLastPresenceDb = new Map();
  const lastDb = g.__zsLastPresenceDb.get(p.visitorId) || 0;
  const stageChanged = prev && prev.stage !== merged.stage;
  const pageChanged = prev && prev.page !== merged.page;
  const layerChanged = prev && prev.layer !== merged.layer;
  const due = Date.now() - lastDb >= PRESENCE_DB_WRITE_MS;
  const shouldWriteDb =
    !prev || stageChanged || pageChanged || layerChanged || due;

  if (!shouldWriteDb) return;

  if (await ensurePg()) {
    try {
      const q = sql();
      await q`
        INSERT INTO zs_presence (visitor_id, data, ts)
        VALUES (${merged.visitorId}, ${q.json(merged as never)}, ${merged.ts})
        ON CONFLICT (visitor_id) DO UPDATE SET
          data = EXCLUDED.data,
          ts = EXCLUDED.ts
      `;
      g.__zsLastPresenceDb.set(p.visitorId, Date.now());
    } catch (e) {
      console.error("pg presence upsert failed", e);
      markPgDown(e);
    }
    return;
  }

  if (hasRedis()) {
    await redis([
      "SET",
      `zs:presence:${p.visitorId}`,
      JSON.stringify(merged),
      "EX",
      120,
    ]);
    await redis(["SADD", "zs:presence:ids", p.visitorId]);
    g.__zsLastPresenceDb.set(p.visitorId, Date.now());
  }
}

/** Path only (no query/hash) for stable unique keys */
export function normalizePagePath(page: string): string {
  try {
    const raw = (page || "/").split("?")[0].split("#")[0] || "/";
    return raw.toLowerCase() || "/";
  } catch {
    return (page || "/").toLowerCase() || "/";
  }
}

/**
 * Unique key for events that must never duplicate.
 * - pageview: 1× per visitor + stage + path
 * - layer: 1× per visitor
 * - checkout_click: 1× per visitor + product code (main + each upsell)
 * - upsell_accept / upsell_decline: 1× per visitor + stage
 * - thankyou_complete: 1× per visitor
 * - sale: 1× per PerfectPay order code
 * - sale_refund / sale_chargeback: 1× per order code
 * Other types: no server dedupe (null).
 */
function uniqueEventKey(e: AnalyticsEvent): string | null {
  const vid = e.visitorId || "";
  if (!vid) return null;
  const t = (e.type || "").toLowerCase();
  if (t === "pageview") {
    const stage = (e.stage || "other").toLowerCase();
    const page = normalizePagePath(e.page);
    return `pv:${vid}:${stage}:${page}`;
  }
  if (t === "layer") return `layer:${vid}`;
  if (t === "checkout_click") {
    const code = String(
      e.meta?.code || e.meta?.productCode || e.meta?.tier || "main"
    )
      .trim()
      .toLowerCase()
      .slice(0, 40);
    return `co:${vid}:${code || "main"}`;
  }
  if (t === "upsell_accept" || t === "upsell_decline") {
    const stage = (e.stage || "upsell").toLowerCase();
    return `${t}:${vid}:${stage}`;
  }
  if (t === "thankyou_complete") return `ty:${vid}`;
  if (t === "sale" || t === "sale_refund" || t === "sale_chargeback") {
    const order = String(
      e.meta?.orderCode || e.meta?.saleCode || e.meta?.code || e.id || ""
    )
      .trim()
      .toLowerCase();
    if (!order) return null;
    return `${t}:${order}`;
  }
  return null;
}

function memHasUnique(
  key: string,
  type: string,
  visitorId: string,
  stage: string,
  page: string,
  nowTs = Date.now()
): boolean {
  const list = memEvents();
  const t = type.toLowerCase();
  const pageN = normalizePagePath(page);
  const stageN = (stage || "other").toLowerCase();
  for (const ev of list) {
    if (ev.visitorId !== visitorId) continue;
    const et = (ev.type || "").toLowerCase();
    if (t === "pageview" && et === "pageview") {
      if (
        (ev.stage || "other").toLowerCase() === stageN &&
        normalizePagePath(ev.page) === pageN &&
        nowTs - (ev.ts || 0) < PAGEVIEW_DEDUP_MS
      ) {
        return true;
      }
    } else if (t === "layer" && et === "layer") {
      return true;
    } else if (t === "checkout_click" && et === "checkout_click") {
      if (uniqueEventKey(ev) === key) return true;
    } else if (
      (t === "upsell_accept" ||
        t === "upsell_decline" ||
        t === "thankyou_complete" ||
        t === "sale" ||
        t === "sale_refund" ||
        t === "sale_chargeback") &&
      et === t
    ) {
      if (uniqueEventKey(ev) === key) return true;
    }
  }
  void key;
  return false;
}

/**
 * Push event — always unique for pageview / layer / checkout.
 * Duplicates are skipped (ok:true, deduped:true). Presence still updates separately.
 */
export async function pushEvent(
  e: AnalyticsEvent
): Promise<{ ok: boolean; path?: string; error?: string; deduped?: boolean }> {
  const ukey = uniqueEventKey(e);

  // --- Dedup before write ---
  if (ukey) {
    if (await ensurePg()) {
      try {
        const q = sql();
        const t = (e.type || "").toLowerCase();
        let rows: { id: string }[] = [];
        if (t === "pageview") {
          const pageN = normalizePagePath(e.page);
          const stageN = (e.stage || "other").toLowerCase();
          const since = e.ts - PAGEVIEW_DEDUP_MS;
          // Only skip if same visitor+stage+path within the dedupe window
          // (forever-dedupe hid returning visitors from "today" range)
          rows = (await q`
            SELECT id FROM zs_events
            WHERE visitor_id = ${e.visitorId}
              AND type = 'pageview'
              AND lower(coalesce(stage, 'other')) = ${stageN}
              AND lower(split_part(coalesce(page, '/'), '?', 1)) = ${pageN}
              AND ts >= ${since}
            LIMIT 1
          `) as { id: string }[];
        } else if (t === "layer") {
          rows = (await q`
            SELECT id FROM zs_events
            WHERE visitor_id = ${e.visitorId} AND type = 'layer'
            LIMIT 1
          `) as { id: string }[];
        } else if (t === "checkout_click") {
          const code = String(
            e.meta?.code || e.meta?.productCode || e.meta?.tier || "main"
          )
            .trim()
            .toLowerCase()
            .slice(0, 40);
          // Match same product code in meta (main + each upsell separately)
          rows = (await q`
            SELECT id FROM zs_events
            WHERE visitor_id = ${e.visitorId}
              AND type = 'checkout_click'
              AND (
                lower(coalesce(meta->>'code', meta->>'productCode', meta->>'tier', 'main')) = ${code || "main"}
              )
            LIMIT 1
          `) as { id: string }[];
        } else if (t === "upsell_accept" || t === "upsell_decline") {
          const stageN = (e.stage || "upsell").toLowerCase();
          rows = (await q`
            SELECT id FROM zs_events
            WHERE visitor_id = ${e.visitorId}
              AND type = ${t}
              AND lower(coalesce(stage, 'upsell')) = ${stageN}
            LIMIT 1
          `) as { id: string }[];
        } else if (t === "thankyou_complete") {
          rows = (await q`
            SELECT id FROM zs_events
            WHERE visitor_id = ${e.visitorId} AND type = 'thankyou_complete'
            LIMIT 1
          `) as { id: string }[];
        } else if (
          t === "sale" ||
          t === "sale_refund" ||
          t === "sale_chargeback"
        ) {
          const order = String(
            e.meta?.orderCode || e.meta?.saleCode || e.meta?.code || ""
          )
            .trim()
            .toLowerCase();
          if (order) {
            rows = (await q`
              SELECT id FROM zs_events
              WHERE type = ${t}
                AND (
                  lower(coalesce(meta->>'orderCode', '')) = ${order}
                  OR lower(coalesce(meta->>'saleCode', '')) = ${order}
                  OR lower(coalesce(meta->>'code', '')) = ${order}
                )
              LIMIT 1
            `) as { id: string }[];
            // Re-sync from PerfectPay API: refresh commission / amounts on existing sale
            if (
              rows?.length &&
              e.meta &&
              (e.meta.commissionAmount != null || e.meta.importedFrom === "api")
            ) {
              try {
                await q`
                  UPDATE zs_events
                  SET meta = ${q.json((e.meta || {}) as never)},
                      ts = ${e.ts}
                  WHERE id = ${rows[0].id}
                `;
                // also refresh in-memory copy if present
                const list = memEvents();
                const idx = list.findIndex((x) => x.id === rows[0].id);
                if (idx >= 0) {
                  list[idx] = { ...list[idx], meta: e.meta, ts: e.ts };
                }
                return { ok: true, path: "postgres", deduped: true };
              } catch (updErr) {
                console.error("sale meta refresh failed", updErr);
              }
            }
          }
        }
        if (rows?.length) {
          return { ok: true, path: "postgres", deduped: true };
        }
      } catch (err) {
        // fall through — still try insert; mem check below
        console.error("pg dedupe check failed", err);
      }
    } else if (hasRedis()) {
      try {
        const raw = (await redis(["LRANGE", "zs:events", 0, 499])) as string[];
        for (const s of raw || []) {
          try {
            const ev = JSON.parse(s) as AnalyticsEvent;
            if (uniqueEventKey(ev) !== ukey) continue;
            // Pageviews: only within window
            if (
              (e.type || "").toLowerCase() === "pageview" &&
              e.ts - (ev.ts || 0) >= PAGEVIEW_DEDUP_MS
            ) {
              continue;
            }
            return { ok: true, path: "redis", deduped: true };
          } catch {
            /* skip */
          }
        }
      } catch {
        /* fall through */
      }
    } else if (
      memHasUnique(ukey, e.type, e.visitorId, e.stage, e.page)
    ) {
      return { ok: true, path: "memory", deduped: true };
    }
  }

  const listMem = memEvents();
  // Avoid mem duplicate even when PG path already checked
  if (ukey && memHasUnique(ukey, e.type, e.visitorId, e.stage, e.page)) {
    return { ok: true, path: "memory", deduped: true };
  }
  listMem.unshift(e);
  if (listMem.length > MAX_EVENTS) listMem.length = MAX_EVENTS;
  g.__zsEventsCache = undefined;

  if (await ensurePg()) {
    try {
      const q = sql();
      await q`
        INSERT INTO zs_events (
          id, type, visitor_id, page, stage, layer, source, landing,
          utm_source, utm_medium, utm_campaign, country, domain, ip, device,
          reason, reason_label, is_bot, has_param, meta, ts
        ) VALUES (
          ${e.id},
          ${e.type},
          ${e.visitorId},
          ${e.page},
          ${e.stage},
          ${e.layer},
          ${e.source},
          ${e.landing},
          ${e.utmSource},
          ${e.utmMedium},
          ${e.utmCampaign},
          ${e.country},
          ${e.domain},
          ${e.ip},
          ${e.device},
          ${e.reason},
          ${e.reasonLabel},
          ${e.isBot},
          ${e.hasParam},
          ${q.json((e.meta || {}) as never)},
          ${e.ts}
        )
        ON CONFLICT (id) DO NOTHING
      `;
      // Cap size rarely — full-table DELETE on every insert burned Neon transfer quota
      g.__zsInsertCount = (g.__zsInsertCount || 0) + 1;
      if (g.__zsInsertCount % 200 === 0) {
        await q`
          DELETE FROM zs_events
          WHERE id IN (
            SELECT id FROM zs_events
            ORDER BY ts DESC
            OFFSET ${MAX_EVENTS}
          )
        `;
      }
      g.__zsEventsCache = undefined;
      return { ok: true, path: "postgres" };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("pg pushEvent failed", msg);
      markPgDown(err);
      // Event already in mem — will vanish on deploy until PG is healthy again
      return { ok: false, path: "memory", error: msg };
    }
  }

  if (hasRedis()) {
    await redis(["LPUSH", "zs:events", JSON.stringify(e)]);
    await redis(["LTRIM", "zs:events", 0, MAX_EVENTS - 1]);
    return { ok: true, path: "redis" };
  }

  return { ok: true, path: "memory" };
}

export async function getPresenceList(): Promise<Presence[]> {
  const now = Date.now();

  if (await ensurePg()) {
    try {
      const q = sql();
      const rows = await q`
        SELECT data, ts FROM zs_presence
        WHERE ts > ${now - ONLINE_MS}
        ORDER BY ts DESC
        LIMIT 200
      `;
      const out: Presence[] = [];
      for (const r of rows) {
        try {
          const p =
            typeof r.data === "string"
              ? (JSON.parse(r.data as string) as Presence)
              : (r.data as Presence);
          if (now - p.ts <= ONLINE_MS) {
            out.push(p);
            memPresence().set(p.visitorId, p);
          }
        } catch {
          /* skip */
        }
      }
      return out;
    } catch (e) {
      console.error("pg getPresenceList failed", e);
    }
  }

  if (hasRedis()) {
    const ids = (await redis(["SMEMBERS", "zs:presence:ids"])) as string[];
    if (!ids?.length) return [];
    const out: Presence[] = [];
    for (const id of ids) {
      const raw = (await redis(["GET", `zs:presence:${id}`])) as string | null;
      if (!raw) {
        await redis(["SREM", "zs:presence:ids", id]);
        continue;
      }
      try {
        const p = JSON.parse(raw) as Presence;
        if (now - p.ts <= ONLINE_MS) out.push(p);
        else await redis(["SREM", "zs:presence:ids", id]);
      } catch {
        await redis(["SREM", "zs:presence:ids", id]);
      }
    }
    return out;
  }

  const out: Presence[] = [];
  for (const [id, p] of memPresence()) {
    if (now - p.ts <= ONLINE_MS) out.push(p);
    else memPresence().delete(id);
  }
  return out;
}

export async function getEvents(limit = 500): Promise<AnalyticsEvent[]> {
  return getEventsInRange(0, Date.now() + 60_000, limit);
}

/**
 * Load events for a time window (inclusive). Prefer this for dashboard ranges
 * so "yesterday" is not dropped when many events exist today.
 */
export async function getEventsInRange(
  fromTs: number,
  toTs: number,
  limit = 10_000
): Promise<AnalyticsEvent[]> {
  const from = Math.max(0, fromTs || 0);
  const to = toTs || Date.now() + 60_000;

  const cached = g.__zsEventsCache;
  if (
    cached &&
    cached.from === from &&
    cached.to === to &&
    cached.limit === limit &&
    Date.now() - cached.at < EVENTS_CACHE_MS
  ) {
    return cached.events;
  }

  if (await ensurePg()) {
    try {
      const q = sql();
      const rows = await q`
        SELECT * FROM zs_events
        WHERE ts >= ${from} AND ts <= ${to}
        ORDER BY ts DESC
        LIMIT ${limit}
      `;
      const events = (rows as Record<string, unknown>[]).map(rowToEvent);
      g.__zsEventsCache = { at: Date.now(), from, to, limit, events };
      return events;
    } catch (e) {
      console.error("pg getEventsInRange failed", e);
      markPgDown(e);
      return memEvents()
        .filter((ev) => ev.ts >= from && ev.ts <= to)
        .slice(0, limit);
    }
  }

  if (hasRedis()) {
    // Redis list is newest-first; pull a larger window then filter
    const pull = Math.min(Math.max(limit * 2, 2000), MAX_EVENTS);
    const raw = (await redis(["LRANGE", "zs:events", 0, pull - 1])) as string[];
    return (raw || [])
      .map((s) => {
        try {
          return JSON.parse(s) as AnalyticsEvent;
        } catch {
          return null;
        }
      })
      .filter((ev): ev is AnalyticsEvent => {
        if (!ev) return false;
        return ev.ts >= from && ev.ts <= to;
      })
      .slice(0, limit);
  }

  return memEvents()
    .filter((ev) => ev.ts >= from && ev.ts <= to)
    .slice(0, limit);
}

/** ONLY way to wipe history — dashboard Reset */
export async function clearHistory(): Promise<void> {
  g.__zsEventsCache = undefined;
  memEvents().length = 0;
  memPresence().clear();

  if (await ensurePg()) {
    const q = sql();
    await q`TRUNCATE zs_events`;
    await q`TRUNCATE zs_presence`;
    return;
  }

  if (hasRedis()) {
    await redis(["DEL", "zs:events"]);
    const ids = (await redis(["SMEMBERS", "zs:presence:ids"])) as string[];
    if (ids?.length) {
      for (const id of ids) {
        await redis(["DEL", `zs:presence:${id}`]);
      }
    }
    await redis(["DEL", "zs:presence:ids"]);
  }
}

export function stageFromPage(page: string): string {
  const p = (page || "").toLowerCase();
  if (p.includes("famguard") || p === "/white" || p === "/white/") return "white";
  if (p.includes("/upsell/thankyou") || p.includes("thankyou")) return "thankyou";
  const up = p.match(/\/upsell\/up([1-7])/);
  if (up) return `upsell${up[1]}`;
  if (p.includes("backredirect")) return "cta";
  if (p.includes("step6") || p.includes("checkout") || p.includes("centerpag") || p.includes("pay."))
    return p.includes("centerpag") || p.includes("pay.") ? "checkout" : "cta";
  if (p.includes("step5")) return "conversas";
  if (p.includes("step4")) return "recovery";
  if (p.includes("step3")) return "scan";
  if (p.includes("step2")) return "phone";
  if (p.includes("index.html") || p === "/" || p === "" || p === "/index")
    return "entry";
  if (p.includes("cta-unified") || p.includes("cta")) return "cta";
  if (p.includes("conversas")) return "conversas";
  if (p.includes("chat")) return "chat";
  if (p.includes("phone")) return "phone";
  if (p.includes("dashboard")) return "dashboard";
  if (p.includes("landing") || p.includes("bridge") || p.includes("login"))
    return "landing";
  return "other";
}

export function detectDevice(ua: string, ip?: string): string {
  const cleanIp = (ip || "").replace(/^::ffff:/, "");
  if (cleanIp && (isMetaDatacenterIp(cleanIp) || isGoogleBotIp(cleanIp))) {
    return "Bot";
  }
  if (isBotUserAgent(ua || "")) return "Bot";
  const u = (ua || "").toLowerCase();
  if (/ipad|tablet|kindle|playbook|silk|(android(?!.*mobile))/i.test(u))
    return "Tablet";
  if (
    /mobi|iphone|ipod|android.*mobile|windows phone|opera mini|iemobile/i.test(
      u
    )
  )
    return "Mobile";
  return "Desktop";
}

export function extractIp(reqHeaders: Headers): string {
  const xf = reqHeaders.get("x-forwarded-for") || "";
  if (xf) return xf.split(",")[0].trim();
  return (
    reqHeaders.get("x-real-ip") ||
    reqHeaders.get("cf-connecting-ip") ||
    reqHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    ""
  );
}

export const STAGE_LABELS: Record<string, string> = {
  entry: "Step 1 — Gênero",
  white: "White (bloqueado)",
  black: "Black (liberado)",
  landing: "Landing",
  phone: "Step 2 — Telefone",
  scan: "Step 3 — Acessando",
  recovery: "Step 4 — Cloud",
  conversas: "Step 5 — Conversas",
  chat: "Chat",
  cta: "Step 6 — Oferta",
  checkout: "Checkout",
  upsell1: "Upsell 1",
  upsell2: "Upsell 2",
  upsell3: "Upsell 3",
  upsell4: "Upsell 4",
  upsell5: "Upsell 5",
  upsell6: "Upsell 6",
  upsell7: "Upsell 7",
  thankyou: "Thank you (fim)",
  dashboard: "Dashboard",
  other: "Outras",
};

/** SafelinkSpy funnel: index (step1) → step2…step6 → checkout */
export const FUNNEL_ORDER = [
  "entry",
  "phone",
  "scan",
  "recovery",
  "conversas",
  "cta",
  "checkout",
] as const;

/** Post-purchase upsell chain */
export const UPSELL_FUNNEL_ORDER = [
  "upsell1",
  "upsell2",
  "upsell3",
  "upsell4",
  "upsell5",
  "upsell6",
  "upsell7",
  "thankyou",
] as const;

/** Full journey including upsells */
export const FULL_FUNNEL_ORDER = [
  ...FUNNEL_ORDER,
  ...UPSELL_FUNNEL_ORDER,
] as const;
