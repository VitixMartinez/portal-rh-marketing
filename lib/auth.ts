/**
 * Auth utilities using Web Crypto API (compatible with Edge Runtime).
 * Password hashing still uses Node.js crypto (scrypt) — only called
 * from API routes, never from middleware.
 */
import { cookies } from "next/headers";

const SECRET = process.env.AUTH_SECRET || "change-this-secret-in-production";
const COOKIE  = "hr-session";
const TTL     = 60 * 60 * 8; // 8 hours

/* ── Base64url helpers (no Buffer — works in Edge) ───────────────────── */

function b64urlEncode(data: Uint8Array | string): string {
  const bytes =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data;
  let bin = "";
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(s: string): string {
  const padded = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad    = padded.length % 4;
  return atob(pad ? padded + "=".repeat(4 - pad) : padded);
}

function b64urlToBytes(s: string): Uint8Array {
  return Uint8Array.from(b64urlDecode(s), c => c.charCodeAt(0));
}

/* ── HMAC-SHA256 (Web Crypto — works in Edge Runtime) ────────────────── */

async function getHmacKey(usage: "sign" | "verify") {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

async function hmacSign(message: string): Promise<string> {
  const key = await getHmacKey("sign");
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return b64urlEncode(new Uint8Array(sig));
}

async function hmacVerify(message: string, sig: string): Promise<boolean> {
  const key = await getHmacKey("verify");
  return crypto.subtle.verify("HMAC", key, b64urlToBytes(sig), new TextEncoder().encode(message));
}

/* ── JWT ──────────────────────────────────────────────────────────────── */

export interface SessionPayload {
  userId:     string;
  email:      string;
  name:       string;
  role:       "OWNER_ADMIN" | "MANAGER" | "EMPLOYEE";
  companyId:  string;
  employeeId: string | null;
  exp:        number;
  iat:        number;
}

export async function signToken(
  payload: Omit<SessionPayload, "exp" | "iat">,
): Promise<string> {
  const now  = Math.floor(Date.now() / 1000);
  const full = { ...payload, iat: now, exp: now + TTL };
  const header = b64urlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body   = b64urlEncode(JSON.stringify(full));
  const sig    = await hmacSign(`${header}.${body}`);
  return `${header}.${body}.${sig}`;
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const valid = await hmacVerify(`${header}.${body}`, sig);
    if (!valid) return null;
    const payload = JSON.parse(b64urlDecode(body)) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

/* ── Password hashing (Node.js crypto — API routes only, NOT middleware) */

export function hashPassword(password: string): string {
  // Dynamic require so this code path is never bundled for Edge
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { scryptSync, randomBytes } = require("crypto");
  const salt = randomBytes(16).toString("hex") as string;
  const hash = (scryptSync(password, salt, 64) as Buffer).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { scryptSync, timingSafeEqual } = require("crypto");
    const [salt, hash] = stored.split(":");
    const hashBuf  = Buffer.from(hash, "hex");
    const inputBuf = scryptSync(password, salt, 64) as Buffer;
    return timingSafeEqual(hashBuf, inputBuf) as boolean;
  } catch {
    return false;
  }
}

/* ── Cookie helpers (server-side, async) ─────────────────────────────── */

export async function setSessionCookie(
  payload: Omit<SessionPayload, "exp" | "iat">,
) {
  const token       = await signToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge:   TTL,
    path:     "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token       = cookieStore.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/* ── Role helpers ─────────────────────────────────────────────────────── */

export function isAdmin(role: string) {
  return role === "OWNER_ADMIN" || role === "MANAGER";
}
export function isEmployee(role: string) {
  return role === "EMPLOYEE";
}
