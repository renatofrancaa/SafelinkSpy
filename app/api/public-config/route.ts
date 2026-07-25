import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Public client config (no secrets).
 * Set NEXT_PUBLIC_CLARITY_ID or CLARITY_PROJECT_ID in Vercel env.
 */
export async function GET() {
  const clarityId = (
    process.env.NEXT_PUBLIC_CLARITY_ID ||
    process.env.CLARITY_PROJECT_ID ||
    ""
  ).trim();

  return NextResponse.json(
    {
      clarityId,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}
