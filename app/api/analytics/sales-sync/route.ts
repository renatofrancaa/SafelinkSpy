import { NextRequest, NextResponse } from "next/server";
import { syncPerfectPayToday } from "@/lib/analytics/perfectpaySync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.DASHBOARD_SECRET || "1234";
  const header = req.headers.get("x-dashboard-secret") || "";
  const q = req.nextUrl.searchParams.get("key") || "";
  return header === secret || q === secret;
}

/**
 * Sync PerfectPay sales for **today only** (America/Sao_Paulo).
 * POST /api/analytics/sales-sync
 * Header: x-dashboard-secret
 *
 * Env: PERFECTPAY_API_TOKEN = Bearer token da API PerfectPay
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.PERFECTPAY_API_TOKEN) {
    return NextResponse.json(
      {
        ok: false,
        error: "PERFECTPAY_API_TOKEN missing",
        hint: "Add PERFECTPAY_API_TOKEN in Vercel env (Bearer token from PerfectPay API).",
      },
      { status: 400 }
    );
  }

  const result = await syncPerfectPayToday();
  return NextResponse.json({
    ...result,
    message: result.ok
      ? `Sync ${result.day}: ${result.imported} novas, ${result.deduped} já existiam, ${result.skipped} ignoradas.`
      : result.errors[0] || "sync failed",
  });
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    configured: !!process.env.PERFECTPAY_API_TOKEN,
    scope: "today_only",
    timezone: "America/Sao_Paulo",
    hint: "POST this endpoint to import PerfectPay sales from today only.",
  });
}
