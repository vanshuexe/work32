import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "stressout_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

function sessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set to at least 32 characters.");
  }
  return secret;
}

function signature(expiresAt: string): string {
  return createHmac("sha256", sessionSecret()).update(expiresAt).digest("hex");
}

function constantTimeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function checkAdminCredentials(email: string, password: string): boolean {
  const configuredEmail = process.env.ADMIN_EMAIL;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredEmail || !configuredPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be configured.");
  }

  return (
    constantTimeEqual(email.trim().toLowerCase(), configuredEmail.trim().toLowerCase()) &&
    constantTimeEqual(password, configuredPassword)
  );
}

export function createAdminSession(): string {
  const expiresAt = String(Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE);
  return `${expiresAt}.${signature(expiresAt)}`;
}

export function isAdminRequest(request: Request): boolean {
  const cookie = request.headers.get("cookie") ?? "";
  const token = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);
  if (!token) return false;

  const [expiresAt, suppliedSignature] = token.split(".");
  if (!expiresAt || !/^\d+$/.test(expiresAt) || !suppliedSignature) return false;
  if (Number(expiresAt) <= Math.floor(Date.now() / 1000)) return false;

  try {
    return constantTimeEqual(suppliedSignature, signature(expiresAt));
  } catch {
    return false;
  }
}

export function isHttpsRequest(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (forwardedProto) return forwardedProto === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originUrl = new URL(origin);
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const host = forwardedHost || request.headers.get("host") || new URL(request.url).host;
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProtocol || new URL(request.url).protocol.slice(0, -1);
    return originUrl.host.toLowerCase() === host.toLowerCase() && originUrl.protocol === `${protocol}:`;
  } catch {
    return false;
  }
}
