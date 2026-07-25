import { NextRequest, NextResponse } from "next/server";
import { detectAdSource } from "@/utils/detectSource";

export async function POST(req: NextRequest) {
  try {
    const { ref, ua } = await req.json();
    const headers = new Headers();
    if (ref) headers.set("referer", ref);
    if (ua) headers.set("user-agent", ua);

    const source = detectAdSource(headers);
    const response = NextResponse.json({ success: true, source });
    response.cookies.set({
      name: "source_hint",
      value: source,
      path: "/",
      maxAge: 60 * 60 * 24,
      httpOnly: false,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
