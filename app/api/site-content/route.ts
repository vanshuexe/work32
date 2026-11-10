import { NextResponse } from "next/server";
import { getSiteContent } from "@/lib/site-content-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json(await getSiteContent(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Could not load public site content:", error);
    return NextResponse.json({ error: "Site content is temporarily unavailable." }, { status: 500 });
  }
}