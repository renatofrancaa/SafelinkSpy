import { NextRequest, NextResponse } from "next/server";
import { clearHistory } from "@/lib/analytics/store";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.DASHBOARD_SECRET || "1234";
  const header = req.headers.get("x-dashboard-secret") || "";
  return header === secret;
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    await clearHistory();
    return NextResponse.json({ ok: true, cleared: true });
  } catch (e) {
    console.error("reset error", e);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
