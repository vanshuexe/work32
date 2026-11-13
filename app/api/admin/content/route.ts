import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { isAdminRequest, isSameOriginRequest } from "@/lib/admin-auth";
import { saveSiteContent, getSiteContent } from "@/lib/site-content-store";
import { parseSiteContent } from "@/lib/site-content-validation";
import type { SiteContent } from "@/lib/site-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function describeLoadError(error: unknown): { message: string; status: number } {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (code === "P2021" || code === "P2022") {
    return {
      message: "Database tables are not set up yet. Run `npm run db:push` and retry.",
      status: 503,
    };
  }
  if (
    code === "P1001" ||
    code === "P1002" ||
    code === "P1003" ||
    code === "P1017" ||
    code === "P2024" ||
    message.includes("can't reach database server") ||
    message.includes("max clients reached") ||
    message.includes("connection")
  ) {
    return {
      message: "Database connection failed while loading site content. Please retry in a moment.",
      status: 503,
    };
  }
  return { message: "Site content could not be loaded.", status: 500 };
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  try {
    return NextResponse.json(await getSiteContent(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Could not load admin site content:", error);
    const details = describeLoadError(error);
    return NextResponse.json({ error: details.message }, { status: details.status });
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