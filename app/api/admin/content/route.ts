import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminRequest, isSameOriginRequest } from "@/lib/admin-auth";
import { saveSiteContent, getSiteContent } from "@/lib/site-content-store";
import { parseSiteContent } from "@/lib/site-content-validation";
import type { SiteContent } from "@/lib/site-content";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    return NextResponse.json(await getSiteContent(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load admin site content:", error);
    return NextResponse.json({ error: "Site content could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  }
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON content." }, { status: 400 });
  }

  let content: SiteContent;
  try {
    content = parseSiteContent(input);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Site content is invalid." },
      { status: 400 },
    );
  }

  try {
    const savedContent = await saveSiteContent(content);
    revalidatePath("/");
    return NextResponse.json(savedContent, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not save admin site content:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Site content could not be saved." },
      { status: error instanceof Error && error.message.includes("DATABASE_URL") ? 503 : 500 },
    );
  }
}