import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  checkAdminCredentials,
  createAdminSession,
  isAdminRequest,
  isHttpsRequest,
  isSameOriginRequest,
} from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authenticated = isAdminRequest(request);
  return NextResponse.json({ authenticated }, {
    status: authenticated ? 200 : 401,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid login request." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("email" in body) ||
    !("password" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  try {
    if (!checkAdminCredentials(body.email, body.password)) {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    const response = NextResponse.json({ authenticated: true });
    response.cookies.set(ADMIN_SESSION_COOKIE, createAdminSession(), {
      httpOnly: true,
      sameSite: "strict",
      secure: isHttpsRequest(request),
      path: "/",
      maxAge: ADMIN_SESSION_MAX_AGE,
    });
    return response;
  } catch (error) {
    console.error("Admin login configuration error:", error);
    return NextResponse.json({ error: "Admin login is not configured on the server." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  }

  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: isHttpsRequest(request),
    path: "/",
    maxAge: 0,
  });
  return response;
}