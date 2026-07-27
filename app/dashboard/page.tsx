"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type RangeKey = "today" | "yesterday" | "7d" | "14d" | "all" | "custom";

type Stats = {
  now: number;
  storage?: {
    durable: boolean;
    backend: "postgres" | "redis" | "blob" | "memory";
    configured?: "postgres" | "redis" | "memory";
    error?: string;
  };
  range: { key: string; from: number; to: number; eventCount?: number };
  online: {
    total: number;
    byStage: { stage: string; label: string; count: number }[];
    byLayer: { white: number; black: number; unknown: number };
    bySource: { name: string; count: number }[];
    liveFeed: {
      visitorId: string;
      page: string;
      stage: string;
      stageLabel: string;
      maxStage?: string;
      maxStageLabel?: string;
      layer: string;
      source: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      utmTerm?: string;
      country: string;
      domain?: string;
      ip?: string;
      device?: string;
      reason?: string;
      isBot?: boolean | null;
      hasParam?: boolean | null;
      ts: number;
      when?: string;
      agoSec: number;
    }[];
  };
  history: {
    uniques: number;
    pageviews: number;
    checkouts: number;
    checkoutUniques?: number;
    checkoutByDay?: { day: string; clicks: number; uniquePeople: number }[];
    checkoutBySource?: { name: string; count: number }[];
    checkoutByCountry?: { code: string; name: string; count: number }[];
    checkoutByPlan?: {
      key: string;
      label: string;
      value: number | null;
      clicks: number;
      uniquePeople: number;
    }[];
    checkoutFeed?: {
      id: string;
      visitorId: string;
      page: string;
      source: string;
      placement?: string;
      utmSource?: string;
      utmCampaign?: string;
      utmMedium?: string;
      country: string;
      tier: string | null;
      value: number | null;
      planLabel?: string;
      ts: number;
    }[];
    layerDecisions: number;
    layerUniques: { white: number; black: number; unknown: number };
    funnel: {
      stage: string;
      label: string;
      unique: number;
      rateFromStart: number;
      rateFromPrev: number;
    }[];
    sources: { name: string; count: number }[];
    campaigns?: { name: string; count: number }[];
    blackCountries?: { code: string; name: string; count: number }[];
    landings: { name: string; count: number }[];
    reasons: { name: string; count: number }[];
    botHuman: { bot: number; human: number; unknown: number };
    paramStats: { withParam: number; withoutParam: number };
    feed: {
      id: string;
      type: string;
      visitorId: string;
      page: string;
      stageLabel: string;
      maxStage?: string;
      maxStageLabel?: string;
      layer: string;
      source: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmContent?: string;
      utmTerm?: string;
      landing: string;
      country: string;
      domain?: string;
      ip?: string;
      device?: string;
      reason: string | null;
      isBot: boolean | null;
      hasParam: boolean | null;
      ts: number;
      when?: string;
    }[];
  };
};

const SECRET_KEY = "zs_dash_key";

/** ISO country code → full name in Portuguese (e.g. AE → Emirados Árabes Unidos) */
function countryLabel(code?: string | null): string {
  if (!code || code === "—" || code === "-") return "—";
  const c = String(code).trim().toUpperCase();
  if (c.length !== 2) return String(code);
  try {
    const name = new Intl.DisplayNames(["pt-BR"], { type: "region" }).of(c);
    return name || c;
  } catch {
    return c;
  }
}

function fmtTime(ts: number) {
  try {
    return new Date(ts).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return "—";
  }
}

function InstallHelpModal({
  isIOS,
  onClose,
}: {
  isIOS: boolean;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Adicionar à tela inicial"
      style={styles.modalOverlay}
      onClick={onClose}
    >
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ ...styles.h1, fontSize: 18, margin: "0 0 8px" }}>
          Adicionar à tela inicial
        </h2>
        <p style={{ ...styles.muted, margin: "0 0 14px", fontSize: 13 }}>
          Assim o painel fica como um app no iPhone (ícone na Home).
        </p>
        {isIOS ? (
          <ol style={styles.installSteps}>
            <li>
              Toque em <strong>Compartilhar</strong> (ícone de quadrado com
              seta para cima) na barra do Safari.
            </li>
            <li>
              Role e toque em <strong>Adicionar à Tela de Início</strong>.
            </li>
            <li>
              Confirme com <strong>Adicionar</strong>.
            </li>
          </ol>
        ) : (
          <ol style={styles.installSteps}>
            <li>
              No menu do navegador, escolha{" "}
              <strong>Instalar app</strong> /{" "}
              <strong>Adicionar à tela inicial</strong>.
            </li>
            <li>
              No iPhone, abra este link no <strong>Safari</strong> e use
              Compartilhar → Adicionar à Tela de Início.
            </li>
          </ol>
        )}
        <p style={{ ...styles.muted, margin: "12px 0 0", fontSize: 12 }}>
          Dica: use o Safari no iPhone. Chrome no iOS não adiciona PWA da
          mesma forma.
        </p>
        <button type="button" style={{ ...styles.btn, marginTop: 16 }} onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}

function LayerBadge({ layer }: { layer: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    black: { bg: "rgba(34,197,94,0.15)", color: "#4ade80", label: "BLACK" },
    white: { bg: "rgba(248,250,252,0.12)", color: "#e2e8f0", label: "WHITE" },
    unknown: { bg: "rgba(148,163,184,0.15)", color: "#94a3b8", label: "?" },
  };
  const s = map[layer] || map.unknown;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 0.4,
        background: s.bg,
        color: s.color,
      }}
    >
      {s.label}
    </span>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function DashboardPage() {
  const [secret, setSecret] = useState("");
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"live" | "history">("live");
  const [range, setRange] = useState<RangeKey>("today");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [resetting, setResetting] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(SECRET_KEY) || "";
      if (s) setSecret(s);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const ua = navigator.userAgent || "";
      const ios =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setIsIOS(ios);
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        // iOS Safari
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    } catch {
      /* ignore */
    }

    const onBip = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  async function handleAddToHome() {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        await installPrompt.userChoice;
        setInstallPrompt(null);
      } catch {
        setShowInstallHelp(true);
      }
      return;
    }
    setShowInstallHelp(true);
  }

  const load = useCallback(
    async (key: string) => {
      if (!key) return;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ range });
        if (range === "custom" && fromDate && toDate) {
          params.set("from", fromDate);
          params.set("to", toDate);
        }
        const res = await fetch(`/api/analytics/stats?${params}`, {
          headers: { "x-dashboard-secret": key },
          cache: "no-store",
        });
        if (res.status === 401) {
          setError("Senha incorreta");
          setStats(null);
          setSecret("");
          sessionStorage.removeItem(SECRET_KEY);
          return;
        }
        if (!res.ok) throw new Error("fail");
        const data = await res.json();
        setStats(data);
        setSecret(key);
        sessionStorage.setItem(SECRET_KEY, key);
      } catch {
        setError("Falha ao carregar dados");
      } finally {
        setLoading(false);
      }
    },
    [range, fromDate, toDate]
  );

  // Load once on login / when range filters change — no auto polling (saves Supabase egress)
  useEffect(() => {
    if (!secret) return;
    if (range === "custom" && (!fromDate || !toDate)) return;
    load(secret);
  }, [secret, load, range, fromDate, toDate]);

  const maxFunnel = useMemo(() => {
    if (!stats?.history.funnel?.length) return 1;
    return Math.max(...stats.history.funnel.map((f) => f.unique), 1);
  }, [stats]);

  async function resetHistory() {
    if (!secret) return;
    if (
      !confirm(
        "Tem certeza que deseja apagar TODO o histórico e presença online?"
      )
    )
      return;
    setResetting(true);
    try {
      const res = await fetch("/api/analytics/reset", {
        method: "POST",
        headers: { "x-dashboard-secret": secret },
      });
      if (!res.ok) throw new Error("fail");
      await load(secret);
    } catch {
      alert("Não foi possível resetar.");
    } finally {
      setResetting(false);
    }
  }

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "today", label: "Hoje" },
    { key: "yesterday", label: "Ontem" },
    { key: "7d", label: "7 dias" },
    { key: "14d", label: "14 dias" },
    { key: "all", label: "Tudo" },
    { key: "custom", label: "Personalizado" },
  ];

  if (!secret) {
    return (
      <div style={styles.shell}>
        <div style={styles.loginCard}>
          <div style={styles.logoDot} />
          <h1 style={styles.h1}>Painel de Tráfego SafelinkSpy</h1>
          <p style={styles.muted}>Acesso restrito</p>
          <input
            type="password"
            placeholder="Senha do painel"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(input.trim())}
            style={styles.input}
            autoFocus
          />
          {error ? <p style={styles.err}>{error}</p> : null}
          <button style={styles.btn} onClick={() => load(input.trim())}>
            Entrar
          </button>
          {!isStandalone ? (
            <button
              type="button"
              style={{ ...styles.ghostBtn, width: "100%", marginTop: 10 }}
              onClick={handleAddToHome}
            >
              ☆ Adicionar à tela inicial
            </button>
          ) : null}
        </div>
        {showInstallHelp ? (
          <InstallHelpModal
            isIOS={isIOS}
            onClose={() => setShowInstallHelp(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div style={styles.shell}>
      <header style={styles.header}>
        <div>
          <div style={styles.brandRow}>
            <span style={styles.liveDot} />
            <h1 style={{ ...styles.h1, margin: 0, fontSize: 20 }}>
              Painel de Tráfego SafelinkSpy
            </h1>
          </div>
          <p style={{ ...styles.muted, margin: "4px 0 0" }}>
            {loading
              ? "Atualizando…"
              : stats?.now
                ? `Atualizado · ${new Date(stats.now).toLocaleTimeString("pt-BR")}`
                : "Clique em Atualizar para carregar"}
            {isStandalone ? " · app" : ""}
          </p>
        </div>
        <div style={styles.headerActions}>
          <div style={styles.tabs}>
            <button
              style={tab === "live" ? styles.tabActive : styles.tab}
              onClick={() => setTab("live")}
            >
              Ao vivo
            </button>
            <button
              style={tab === "history" ? styles.tabActive : styles.tab}
              onClick={() => setTab("history")}
            >
              Histórico
            </button>
          </div>
          <button
            type="button"
            style={styles.installBtn}
            onClick={() => load(secret)}
            disabled={loading}
            title="Buscar dados agora"
          >
            {loading ? "Atualizando…" : "↻ Atualizar"}
          </button>
          {!isStandalone ? (
            <button
              type="button"
              style={styles.ghostBtn}
              onClick={handleAddToHome}
              title="Salvar na tela inicial do iPhone"
            >
              ☆ Tela inicial
            </button>
          ) : null}
          <button
            style={styles.dangerBtn}
            onClick={resetHistory}
            disabled={resetting}
          >
            {resetting ? "Resetando…" : "Resetar histórico"}
          </button>
          <button
            style={styles.ghostBtn}
            onClick={() => {
              sessionStorage.removeItem(SECRET_KEY);
              setSecret("");
              setStats(null);
            }}
          >
            Sair
          </button>
        </div>
      </header>

      {showInstallHelp ? (
        <InstallHelpModal
          isIOS={isIOS}
          onClose={() => setShowInstallHelp(false)}
        />
      ) : null}

      {/* Time filters */}
      <div style={styles.filterBar}>
        {ranges.map((r) => (
          <button
            key={r.key}
            style={range === r.key ? styles.chipActive : styles.chip}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
        {range === "custom" ? (
          <div style={styles.customDates}>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={styles.dateInput}
            />
            <span style={styles.muted}>até</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={styles.dateInput}
            />
          </div>
        ) : null}
      </div>

      {stats?.storage && !stats.storage.durable ? (
        <div
          style={{
            background: "rgba(248,113,113,0.12)",
            border: "1px solid rgba(248,113,113,0.45)",
            color: "#fecaca",
            borderRadius: 12,
            padding: "12px 14px",
            marginBottom: 14,
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <strong>Histórico NÃO é permanente</strong> (usando:{" "}
          <code>{stats.storage.backend}</code>
          {stats.storage.configured
            ? ` · configurado: ${stats.storage.configured}`
            : ""}
          ). Eventos em memória{" "}
          <strong>somem a cada deploy / cold start</strong>.
          {stats.storage.error ? (
            <>
              <br />
              <span style={{ opacity: 0.95 }}>
                Erro: <code>{stats.storage.error.slice(0, 280)}</code>
              </span>
              {/402|quota|transfer/i.test(stats.storage.error) ? (
                <>
                  <br />
                  Cota do banco estourada. Use Supabase Free ou outro Postgres
                  e atualize <code>POSTGRES_URL</code> /{" "}
                  <code>DATABASE_URL</code> na Vercel.
                </>
              ) : !stats.storage.configured ||
                stats.storage.configured === "memory" ? (
                <>
                  <br />
                  Configure <code>POSTGRES_URL</code> (Supabase) no projeto
                  Vercel.
                </>
              ) : null}
            </>
          ) : (
            <>
              {" "}
              Configure <code>POSTGRES_URL</code> (Supabase) no projeto Vercel e
              faça redeploy.
            </>
          )}
        </div>
      ) : null}
      {stats?.storage?.durable ? (
        <div
          style={{
            background: "rgba(34,197,94,0.1)",
            border: "1px solid rgba(34,197,94,0.35)",
            color: "#bbf7d0",
            borderRadius: 12,
            padding: "8px 12px",
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          Storage: <strong>{stats.storage.backend}</strong> (durável)
          {stats.range?.eventCount != null
            ? ` · ${stats.range.eventCount} eventos no período`
            : ""}
        </div>
      ) : null}

      {!stats ? (
        <p style={styles.muted}>Carregando…</p>
      ) : (
        <>
          <section style={styles.kpiGrid}>
            <Kpi
              label="Online agora"
              value={String(stats.online.total)}
              accent="#22c55e"
            />
            <Kpi
              label="Black online"
              value={String(stats.online.byLayer.black || 0)}
              accent="#4ade80"
            />
            <Kpi
              label="White online"
              value={String(stats.online.byLayer.white || 0)}
              accent="#e2e8f0"
            />
            <Kpi
              label="Visitantes únicos"
              value={String(stats.history.uniques)}
              accent="#60a5fa"
            />
            <Kpi
              label="Checkout (únicos)"
              value={String(
                stats.history.checkoutUniques ?? stats.history.checkouts ?? 0
              )}
              accent="#f472b6"
            />
          </section>

          {tab === "live" ? (
            <>
              <section style={styles.grid2}>
                <Card title="Online por etapa">
                  {stats.online.byStage.length === 0 ? (
                    <Empty />
                  ) : (
                    stats.online.byStage.map((s) => (
                      <BarRow
                        key={s.stage}
                        label={s.label}
                        value={s.count}
                        max={Math.max(stats.online.total, 1)}
                        color="#22c55e"
                      />
                    ))
                  )}
                </Card>
                <Card title="Fontes agora">
                  {stats.online.bySource.length === 0 ? (
                    <Empty />
                  ) : (
                    stats.online.bySource.map((s) => (
                      <BarRow
                        key={s.name}
                        label={s.name || "direct"}
                        value={s.count}
                        max={Math.max(stats.online.total, 1)}
                        color="#60a5fa"
                      />
                    ))
                  )}
                </Card>
              </section>

              <Card title="Visitantes ao vivo">
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Quando</th>
                        <th style={styles.th}>Visitor</th>
                        <th style={styles.th}>Layer</th>
                        <th style={styles.th}>Etapa atual</th>
                        <th style={styles.th}>Etapa final</th>
                        <th style={styles.th}>Domínio</th>
                        <th style={styles.th}>IP</th>
                        <th style={styles.th}>País</th>
                        <th style={styles.th}>Dispositivo</th>
                        <th style={styles.th}>Bot?</th>
                        <th style={styles.th}>Param?</th>
                        <th style={styles.th}>Motivo</th>
                        <th style={styles.th}>Fonte</th>
                        <th style={styles.th}>Campanha</th>
                        <th style={styles.th}>Medium</th>
                        <th style={styles.th}>Página</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.online.liveFeed.length === 0 ? (
                        <tr>
                          <td colSpan={16} style={styles.tdMuted}>
                            Ninguém online no momento
                          </td>
                        </tr>
                      ) : (
                        stats.online.liveFeed.map((r, i) => (
                          <tr key={r.visitorId + i}>
                            <td style={styles.tdMono}>
                              {fmtTime(r.ts)}
                              <div style={{ color: "#64748b" }}>{r.agoSec}s</div>
                            </td>
                            <td style={styles.tdMono}>{r.visitorId}</td>
                            <td style={styles.td}>
                              <LayerBadge layer={r.layer} />
                            </td>
                            <td style={styles.td}>{r.stageLabel}</td>
                            <td style={styles.td}>
                              <strong>
                                {r.maxStageLabel || r.stageLabel}
                              </strong>
                            </td>
                            <td style={styles.tdMono}>{r.domain || "—"}</td>
                            <td style={styles.tdMono}>{r.ip || "—"}</td>
                            <td style={styles.td} title={r.country || ""}>
                              {countryLabel(r.country)}
                            </td>
                            <td style={styles.td}>{r.device || "—"}</td>
                            <td style={styles.td}>
                              {r.isBot === true
                                ? "Bot"
                                : r.isBot === false
                                  ? "Humano"
                                  : "—"}
                            </td>
                            <td style={styles.td}>
                              {r.hasParam === true
                                ? "Sim"
                                : r.hasParam === false
                                  ? "Não"
                                  : "—"}
                            </td>
                            <td style={{ ...styles.td, maxWidth: 180 }}>
                              {r.reason && r.reason !== "—" ? r.reason : "—"}
                            </td>
                            <td style={styles.td}>{r.source || "—"}</td>
                            <td
                              style={{ ...styles.tdEllipsis, maxWidth: 220 }}
                              title={r.utmCampaign || ""}
                            >
                              {r.utmCampaign && r.utmCampaign !== "—"
                                ? r.utmCampaign
                                : "—"}
                            </td>
                            <td style={styles.td}>
                              {r.utmMedium && r.utmMedium !== "—"
                                ? r.utmMedium
                                : "—"}
                            </td>
                            <td style={styles.tdEllipsis} title={r.page}>
                              {r.page}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          ) : (
            <>
              {/* Top row: Funil | White/Black + Checkout resumo */}
              <section style={styles.grid2Top}>
                <Card title="Funil de conversão (Step 1–6 → Checkout)">
                  {!stats.history.funnel?.length ||
                  !stats.history.funnel.some((f) => f.unique > 0) ? (
                    <Empty />
                  ) : (
                    <FunnelStream
                      steps={stats.history.funnel}
                      maxUnique={maxFunnel}
                      compact
                    />
                  )}
                </Card>

                <div style={styles.stackCol}>
                  <Card title="White vs Black (únicos)">
                    <div style={styles.layerCards}>
                      <div style={styles.layerBox}>
                        <div
                          style={{
                            color: "#4ade80",
                            fontWeight: 800,
                            fontSize: 28,
                          }}
                        >
                          {stats.history.layerUniques.black}
                        </div>
                        <div style={styles.muted}>Black (funil)</div>
                      </div>
                      <div style={styles.layerBox}>
                        <div
                          style={{
                            color: "#e2e8f0",
                            fontWeight: 800,
                            fontSize: 28,
                          }}
                        >
                          {stats.history.layerUniques.white}
                        </div>
                        <div style={styles.muted}>White (bloqueado)</div>
                      </div>
                    </div>
                  </Card>

                  <Card title="Checkout — 1 clique por pessoa">
                    <div style={styles.layerCards3}>
                      <div style={styles.layerBox}>
                        <div
                          style={{
                            color: "#f472b6",
                            fontWeight: 800,
                            fontSize: 28,
                          }}
                        >
                          {stats.history.checkoutUniques ??
                            stats.history.checkouts ??
                            0}
                        </div>
                        <div style={styles.muted}>Únicos</div>
                      </div>
                      {(
                        [
                          {
                            key: "37",
                            label: "$37 Full Access",
                            color: "#4ade80",
                            match: (p: {
                              key: string;
                              value: number | null;
                              label: string;
                            }) =>
                              p.key === "37" ||
                              p.key === "39" ||
                              p.key === "47" ||
                              p.key === "full" ||
                              p.key === "basic" ||
                              p.value === 37 ||
                              p.value === 39 ||
                              p.value === 47,
                          },
                          {
                            key: "backredirect",
                            label: "Backredirect $29",
                            color: "#38bdf8",
                            match: (p: {
                              key: string;
                              value: number | null;
                              label: string;
                            }) =>
                              p.key === "backredirect" ||
                              p.key === "29" ||
                              p.value === 29 ||
                              /backredirect/i.test(p.label || ""),
                          },
                        ] as const
                      ).map((cfg) => {
                        const plans =
                          stats.history.checkoutByPlan?.filter(cfg.match) ||
                          [];
                        const n = plans.reduce(
                          (sum, p) => sum + (p.uniquePeople ?? p.clicks ?? 0),
                          0
                        );
                        return (
                          <div key={cfg.key} style={styles.layerBox}>
                            <div
                              style={{
                                color: cfg.color,
                                fontWeight: 800,
                                fontSize: 28,
                              }}
                            >
                              {n}
                            </div>
                            <div
                              style={{
                                fontWeight: 700,
                                marginTop: 4,
                                fontSize: 13,
                              }}
                            >
                              {cfg.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </div>
              </section>

              {/* Bottom row: breakdowns lado a lado */}
              <section style={styles.grid2Top}>
                <Card title="Checkout — por dia e fonte">
                  <h3 style={{ ...styles.cardTitle, marginTop: 0, fontSize: 13 }}>
                    Por dia (únicos)
                  </h3>
                  {!stats.history.checkoutByDay?.length ? (
                    <Empty />
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Dia</th>
                            <th style={styles.th}>Pessoas</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.history.checkoutByDay.map((d) => (
                            <tr key={d.day}>
                              <td style={styles.tdMono}>{d.day}</td>
                              <td style={styles.td}>
                                <strong style={{ color: "#f472b6" }}>
                                  {d.uniquePeople ?? d.clicks}
                                </strong>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <h3
                    style={{ ...styles.cardTitle, marginTop: 18, fontSize: 13 }}
                  >
                    Por fonte (únicos)
                  </h3>
                  <p style={{ ...styles.muted, margin: "0 0 8px", fontSize: 11 }}>
                    Ex.: Instagram_Feed, Facebook_Mobile_Reels (Meta placement) —
                    não só utm_source (fb).
                  </p>
                  {!stats.history.checkoutBySource?.length ? (
                    <Empty />
                  ) : (
                    stats.history.checkoutBySource.map((s) => (
                      <BarRow
                        key={s.name}
                        label={s.name}
                        value={s.count}
                        max={stats.history.checkoutBySource![0]?.count || 1}
                        color="#f472b6"
                      />
                    ))
                  )}
                </Card>

                <Card title="Checkout — países e últimos">
                  <h3 style={{ ...styles.cardTitle, marginTop: 0, fontSize: 13 }}>
                    Ranking de países (únicos)
                  </h3>
                  {!stats.history.checkoutByCountry?.length ? (
                    <Empty />
                  ) : (
                    stats.history.checkoutByCountry.map((s, i) => (
                      <BarRow
                        key={s.code + i}
                        label={countryLabel(s.code)}
                        value={s.count}
                        max={stats.history.checkoutByCountry![0]?.count || 1}
                        color="#fb7185"
                      />
                    ))
                  )}

                  <h3
                    style={{ ...styles.cardTitle, marginTop: 18, fontSize: 13 }}
                  >
                    Últimos checkouts (1 por pessoa)
                  </h3>
                  {!stats.history.checkoutFeed?.length ? (
                    <Empty />
                  ) : (
                    <div style={styles.tableWrap}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Quando</th>
                            <th style={styles.th}>Visitor</th>
                            <th style={styles.th}>Checkout</th>
                            <th style={styles.th}>País</th>
                            <th style={styles.th}>Fonte</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.history.checkoutFeed.map((c) => (
                            <tr key={c.id}>
                              <td style={styles.tdMono}>{fmtTime(c.ts)}</td>
                              <td style={styles.tdMono}>{c.visitorId}</td>
                              <td style={styles.td}>
                                <strong
                                  style={{
                                    color:
                                      c.tier === "backredirect" ||
                                      c.value === 29 ||
                                      /backredirect/i.test(c.planLabel || "")
                                        ? "#38bdf8"
                                        : c.value === 37 ||
                                            c.value === 39 ||
                                            c.value === 47 ||
                                            c.tier === "full" ||
                                            c.tier === "basic"
                                          ? "#4ade80"
                                          : "#e2e8f0",
                                  }}
                                >
                                  {c.planLabel ||
                                    (c.tier === "backredirect" || c.value === 29
                                      ? "$29 Backredirect"
                                      : c.value === 37 ||
                                          c.value === 39 ||
                                          c.value === 47 ||
                                          c.tier === "full" ||
                                          c.tier === "basic"
                                        ? `$${c.value ?? 37} Full Access`
                                        : c.tier || "—")}
                                </strong>
                              </td>
                              <td style={styles.td} title={c.country || ""}>
                                {countryLabel(c.country)}
                              </td>
                              <td
                                style={styles.td}
                                title={
                                  c.placement ||
                                  c.source ||
                                  c.utmSource ||
                                  ""
                                }
                              >
                                {c.placement || c.source || c.utmSource || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
              </section>

              <section style={styles.grid2}>
                <Card title="Fontes de tráfego">
                  {stats.history.sources.length === 0 ? (
                    <Empty />
                  ) : (
                    stats.history.sources.map((s) => (
                      <BarRow
                        key={s.name}
                        label={s.name}
                        value={s.count}
                        max={stats.history.sources[0]?.count || 1}
                        color="#a78bfa"
                      />
                    ))
                  )}
                </Card>
                <Card title="Campanhas (utm_campaign) — black / humanos">
                  {!stats.history.campaigns?.length ? (
                    <Empty />
                  ) : (
                    stats.history.campaigns.map((s) => (
                      <BarRow
                        key={s.name}
                        label={s.name}
                        value={s.count}
                        max={stats.history.campaigns![0]?.count || 1}
                        color="#38bdf8"
                      />
                    ))
                  )}
                </Card>
              </section>

              <section style={styles.grid2}>
                <Card title="Países na black (únicos)">
                  {!stats.history.blackCountries?.length ? (
                    <Empty />
                  ) : (
                    stats.history.blackCountries.map((s, i) => (
                      <BarRow
                        key={s.code + i}
                        label={countryLabel(s.code)}
                        value={s.count}
                        max={stats.history.blackCountries![0]?.count || 1}
                        color="#4ade80"
                      />
                    ))
                  )}
                </Card>
                <Card title="Páginas de entrada">
                  {stats.history.landings.length === 0 ? (
                    <Empty />
                  ) : (
                    stats.history.landings.map((s) => (
                      <div key={s.name} style={styles.listRow}>
                        <span style={styles.tdEllipsis} title={s.name}>
                          {s.name}
                        </span>
                        <strong>{s.count}</strong>
                      </div>
                    ))
                  )}
                </Card>
              </section>

              <Card
                title={`Feed histórico (visitantes únicos)${
                  stats.history.feed?.length
                    ? ` · ${stats.history.feed.length} pessoas`
                    : ""
                }`}
              >
                <p style={{ ...styles.muted, margin: "0 0 12px", fontSize: 12 }}>
                  Uma linha por visitante único (última atividade). Checkouts e
                  funil contam só uniques — nada é duplicado.
                </p>
                <div style={styles.tableWrap}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>Quando</th>
                        <th style={styles.th}>Visitor</th>
                        <th style={styles.th}>Layer</th>
                        <th style={styles.th}>Tipo</th>
                        <th style={styles.th}>Etapa final</th>
                        <th style={styles.th}>Domínio</th>
                        <th style={styles.th}>IP</th>
                        <th style={styles.th}>País</th>
                        <th style={styles.th}>Dispositivo</th>
                        <th style={styles.th}>Bot?</th>
                        <th style={styles.th}>Param?</th>
                        <th style={styles.th}>Motivo</th>
                        <th style={styles.th}>Fonte</th>
                        <th style={styles.th}>Campanha</th>
                        <th style={styles.th}>Medium</th>
                        <th style={styles.th}>Página</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.history.feed.length === 0 ? (
                        <tr>
                          <td colSpan={16} style={styles.tdMuted}>
                            Sem eventos no período
                          </td>
                        </tr>
                      ) : (
                        stats.history.feed.map((e) => (
                          <tr key={e.id}>
                            <td style={styles.tdMono}>{fmtTime(e.ts)}</td>
                            <td style={styles.tdMono}>{e.visitorId}</td>
                            <td style={styles.td}>
                              <LayerBadge layer={e.layer} />
                            </td>
                            <td style={styles.td}>{e.type}</td>
                            <td style={styles.td}>
                              <strong>
                                {e.maxStageLabel || e.stageLabel}
                              </strong>
                            </td>
                            <td style={styles.tdMono}>{e.domain || "—"}</td>
                            <td style={styles.tdMono}>{e.ip || "—"}</td>
                            <td style={styles.td} title={e.country || ""}>
                              {countryLabel(e.country)}
                            </td>
                            <td style={styles.td}>{e.device || "—"}</td>
                            <td style={styles.td}>
                              {e.isBot === true
                                ? "Bot"
                                : e.isBot === false
                                  ? "Humano"
                                  : "—"}
                            </td>
                            <td style={styles.td}>
                              {e.hasParam === true
                                ? "Sim"
                                : e.hasParam === false
                                  ? "Não"
                                  : "—"}
                            </td>
                            <td style={{ ...styles.td, maxWidth: 180 }}>
                              {e.reason ? String(e.reason) : "—"}
                            </td>
                            <td style={styles.td}>{e.source || "—"}</td>
                            <td
                              style={{ ...styles.tdEllipsis, maxWidth: 240 }}
                              title={e.utmCampaign || ""}
                            >
                              {e.utmCampaign && e.utmCampaign !== "—"
                                ? e.utmCampaign
                                : "—"}
                            </td>
                            <td style={styles.td}>
                              {e.utmMedium && e.utmMedium !== "—"
                                ? e.utmMedium
                                : "—"}
                            </td>
                            <td style={styles.tdEllipsis} title={e.page}>
                              {e.page}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div style={styles.kpi}>
      <div style={{ ...styles.muted, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: accent, marginTop: 4 }}>
        {value}
      </div>
    </div>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.card}>
      <h2 style={styles.cardTitle}>{title}</h2>
      {children}
    </section>
  );
}

function Empty() {
  return <p style={styles.muted}>Sem dados ainda</p>;
}

/** Short labels for horizontal funnel columns (top of stream) */
const FUNNEL_SHORT: Record<string, string> = {
  entry: "Step 1",
  phone: "Step 2",
  scan: "Step 3",
  recovery: "Step 4",
  conversas: "Step 5",
  cta: "Step 6",
  checkout: "Checkout",
  chat: "Chat",
  landing: "Landing",
  dashboard: "Dash",
  white: "White",
  black: "Black",
};

/** Subtitle under step number (what the step is) */
const FUNNEL_SUB: Record<string, string> = {
  entry: "Gênero",
  phone: "Telefone",
  scan: "Acessando",
  recovery: "Cloud",
  conversas: "Conversas",
  cta: "Oferta",
  checkout: "Pagamento",
};

/**
 * Horizontal stream funnel (Meta-style).
 * Single SVG so labels / stream / counts share the same X axis (no letterbox misalignment).
 */
function FunnelStream({
  steps,
  maxUnique,
  compact = false,
}: {
  steps: {
    stage: string;
    label: string;
    unique: number;
    rateFromStart: number;
    rateFromPrev: number;
  }[];
  maxUnique: number;
  compact?: boolean;
}) {
  const n = Math.max(steps.length, 1);
  const W = 900;
  const padX = 12;
  const labelY = 14; // Step 1…6
  const subY = 28; // Gênero, Telefone, …
  const streamTop = 42;
  // Compact column vs full: keep solid body, not a flat ribbon
  const streamH = compact ? 160 : 180;
  const streamBot = streamTop + streamH;
  const mid = streamTop + streamH / 2;
  const countY = streamBot + 24;
  const prevY = streamBot + 40;
  const H = streamBot + 54; // total viewBox height — aspect-ratio matches this
  const maxHalf = streamH * 0.46;
  const topN = Math.max(maxUnique, 1);
  const chartLeft = padX;
  const chartRight = W - padX;
  const chartW = chartRight - chartLeft;

  const cols = steps.map((s, i) => {
    const x = chartLeft + ((i + 0.5) / n) * chartW;
    const ratio = s.unique / topN;
    const half =
      s.unique <= 0
        ? 3
        : Math.max(ratio * maxHalf, compact ? 16 : 14);
    return { ...s, x, half, i };
  });

  function smoothOpen(points: { x: number; y: number }[]): string {
    if (points.length === 0) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const first = cols[0] || { half: 3, x: chartLeft };
  const last = cols[cols.length - 1] || first;
  // Full width of chart area — edges match first/last stage thickness
  const topEdge = [
    { x: chartLeft, y: mid - first.half },
    ...cols.map((c) => ({ x: c.x, y: mid - c.half })),
    { x: chartRight, y: mid - last.half },
  ];
  const botEdge = [
    { x: chartLeft, y: mid + first.half },
    ...cols.map((c) => ({ x: c.x, y: mid + c.half })),
    { x: chartRight, y: mid + last.half },
  ];
  const bandPath = `${smoothOpen(topEdge)} ${smoothOpen(
    [...botEdge].reverse()
  ).replace(/^M/, "L")} Z`;

  const pctSize = n > 5 ? 15 : 18;

  return (
    <div style={styles.funnelStreamWrap}>
      <div
        style={{
          ...styles.funnelStreamChart,
          // Exact viewBox ratio → fills width with no side letterbox
          aspectRatio: `${W} / ${H}`,
        }}
      >
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: "block" }}
          role="img"
          aria-label="Funil de conversão por etapa"
        >
          <defs>
            <linearGradient id="zsFunnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#34d399" stopOpacity="0.92" />
              <stop offset="65%" stopColor="#2dd4bf" stopOpacity="0.9" />
              <stop offset="88%" stopColor="#a78bfa" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#f472b6" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="zsFunnelShine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.16" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.14" />
            </linearGradient>
          </defs>

          {/* Stage guides — full stream height */}
          {cols.map((c, i) =>
            i === 0 ? null : (
              <line
                key={`g-${c.stage}`}
                x1={chartLeft + (i / n) * chartW}
                y1={streamTop}
                x2={chartLeft + (i / n) * chartW}
                y2={streamBot}
                stroke="rgba(148,163,184,0.2)"
                strokeWidth={1}
              />
            )
          )}

          {/* Stream fills chart width edge-to-edge */}
          <path d={bandPath} fill="url(#zsFunnelGrad)" />
          <path d={bandPath} fill="url(#zsFunnelShine)" />

          {/* Stage labels (top): Step N + short name */}
          {cols.map((c) => (
            <g key={`lb-${c.stage}`}>
              <text
                x={c.x}
                y={labelY}
                textAnchor="middle"
                fill="#e2e8f0"
                fontSize={11}
                fontWeight={800}
                style={{
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                }}
              >
                {FUNNEL_SHORT[c.stage] || c.label}
              </text>
              <text
                x={c.x}
                y={subY}
                textAnchor="middle"
                fill="#94a3b8"
                fontSize={9}
                fontWeight={600}
                style={{
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                }}
              >
                {FUNNEL_SUB[c.stage] || ""}
              </text>
            </g>
          ))}

          {/* % in stream center */}
          {cols.map((c) => (
            <text
              key={`pct-${c.stage}`}
              x={c.x}
              y={mid + 6}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={pctSize}
              fontWeight={800}
              style={{
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {c.rateFromStart}%
            </text>
          ))}

          {/* Absolute uniques */}
          {cols.map((c) => (
            <text
              key={`n-${c.stage}`}
              x={c.x}
              y={countY}
              textAnchor="middle"
              fill="#e2e8f0"
              fontSize={14}
              fontWeight={800}
              style={{
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {c.unique}
            </text>
          ))}

          {/* prev / topo */}
          {cols.map((c) => (
            <text
              key={`p-${c.stage}`}
              x={c.x}
              y={prevY}
              textAnchor="middle"
              fill="#64748b"
              fontSize={10}
              fontWeight={600}
              style={{
                fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
              }}
            >
              {c.i === 0 ? "topo" : `${c.rateFromPrev}% prev`}
            </text>
          ))}
        </svg>
      </div>

      <p style={{ ...styles.muted, margin: "10px 0 0", fontSize: 11 }}>
        Pessoas únicas por etapa (cumulativo). % = desde o topo · prev = vs
        etapa anterior.
      </p>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={styles.funnelHead}>
        <span style={{ fontSize: 13 }}>{label}</span>
        <span style={styles.muted}>{value}</span>
      </div>
      <div style={styles.barTrack}>
        <div
          style={{
            ...styles.barFill,
            width: `${Math.max(pct, value ? 4 : 0)}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    minHeight: "100dvh",
    width: "100%",
    maxWidth: "none",
    boxSizing: "border-box",
    background: "#0b0f14",
    color: "#f1f5f9",
    padding: "20px clamp(16px, 3vw, 40px) 48px",
    margin: 0,
    fontFamily:
      "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
  },
  header: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },
  brandRow: { display: "flex", alignItems: "center", gap: 10 },
  liveDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 0 4px rgba(34,197,94,0.2)",
  },
  h1: { fontSize: 24, fontWeight: 800, letterSpacing: "-0.02em" },
  muted: { color: "#94a3b8", fontSize: 13 },
  err: { color: "#f87171", fontSize: 13, marginTop: 8 },
  loginCard: {
    maxWidth: 400,
    margin: "12vh auto",
    background: "#121821",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 28,
    textAlign: "center",
  },
  logoDot: {
    width: 40,
    height: 40,
    borderRadius: 12,
    margin: "0 auto 12px",
    background: "linear-gradient(135deg,#22c55e,#16a34a)",
  },
  input: {
    width: "100%",
    marginTop: 16,
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #334155",
    background: "#0b0f14",
    color: "#f8fafc",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  },
  btn: {
    width: "100%",
    marginTop: 12,
    padding: "12px 16px",
    borderRadius: 10,
    border: "none",
    background: "linear-gradient(135deg,#22c55e,#16a34a)",
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
  },
  ghostBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #334155",
    background: "transparent",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: 13,
  },
  installBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(34,197,94,0.45)",
    background: "rgba(34,197,94,0.12)",
    color: "#4ade80",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(2,6,12,0.72)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000,
  },
  modalCard: {
    width: "min(420px, 100%)",
    background: "#121821",
    border: "1px solid #1e293b",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
  },
  installSteps: {
    margin: 0,
    paddingLeft: 20,
    color: "#e2e8f0",
    fontSize: 14,
    lineHeight: 1.55,
    display: "grid",
    gap: 10,
  },
  kbd: {
    display: "inline-block",
    fontSize: 12,
    opacity: 0.85,
  },
  dangerBtn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid rgba(248,113,113,0.4)",
    background: "rgba(248,113,113,0.1)",
    color: "#fca5a5",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  tabs: {
    display: "flex",
    background: "#121821",
    borderRadius: 10,
    padding: 4,
    border: "1px solid #1e293b",
  },
  tab: {
    border: "none",
    background: "transparent",
    color: "#94a3b8",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 13,
  },
  tabActive: {
    border: "none",
    background: "#1e293b",
    color: "#f8fafc",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
    fontSize: 13,
  },
  filterBar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
    marginBottom: 16,
  },
  chip: {
    border: "1px solid #334155",
    background: "#121821",
    color: "#94a3b8",
    padding: "8px 12px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
  },
  chipActive: {
    border: "1px solid rgba(34,197,94,0.5)",
    background: "rgba(34,197,94,0.15)",
    color: "#4ade80",
    padding: "8px 12px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  },
  customDates: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    alignItems: "center",
  },
  dateInput: {
    background: "#121821",
    border: "1px solid #334155",
    color: "#e2e8f0",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 13,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  kpi: {
    background: "#121821",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: "14px 16px",
  },
  grid2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 12,
    marginBottom: 12,
  },
  /** Two equal columns side-by-side (desktop); stacks on narrow */
  grid2Top: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
    gap: 12,
    marginBottom: 12,
    alignItems: "stretch",
  },
  stackCol: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    minWidth: 0,
  },
  card: {
    background: "#121821",
    border: "1px solid #1e293b",
    borderRadius: 14,
    padding: 16,
    marginBottom: 0,
    height: "100%",
    boxSizing: "border-box" as const,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: "0 0 14px",
    color: "#e2e8f0",
  },
  barTrack: {
    height: 8,
    borderRadius: 999,
    background: "#1e293b",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width .3s ease",
  },
  funnelHead: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
    fontSize: 13,
  },
  funnelStreamWrap: {
    width: "100%",
    minWidth: 0,
  },
  funnelStreamChart: {
    width: "100%",
    // Fixed aspect so stream always fills the box edge-to-edge (no letterbox)
    aspectRatio: "900 / 254",
    borderRadius: 12,
    background: "linear-gradient(180deg,#0f141c 0%,#0b0f14 100%)",
    border: "1px solid #1e293b",
    overflow: "hidden",
    boxSizing: "border-box" as const,
  },
  tableWrap: { overflowX: "auto", WebkitOverflowScrolling: "touch" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left",
    padding: "8px 6px",
    color: "#64748b",
    fontWeight: 600,
    borderBottom: "1px solid #1e293b",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "8px 6px",
    borderBottom: "1px solid #1e293b",
    verticalAlign: "middle",
  },
  tdMono: {
    padding: "8px 6px",
    borderBottom: "1px solid #1e293b",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    color: "#94a3b8",
  },
  tdEllipsis: {
    padding: "8px 6px",
    borderBottom: "1px solid #1e293b",
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    fontSize: 12,
    color: "#94a3b8",
  },
  tdMuted: {
    padding: 16,
    textAlign: "center",
    color: "#64748b",
  },
  layerCards: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  layerCards3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },
  layerBox: {
    background: "#0b0f14",
    borderRadius: 12,
    padding: 16,
    border: "1px solid #1e293b",
    textAlign: "center",
  },
  listRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 0",
    borderBottom: "1px solid #1e293b",
    fontSize: 13,
  },
};
