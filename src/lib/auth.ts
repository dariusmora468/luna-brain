// ============================================================
// luna Brain — Simple Password Auth
// ============================================================

import { cookies } from "next/headers";
import { createHash } from "crypto";

const SESSION_COOKIE = "luna-brain-session";
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

/**
 * Verify if the current request has a valid session
 */
export async function verifySession(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionToken) return false;

  const expectedHash = hashPassword(process.env.DASHBOARD_PASSWORD!);
  return sessionToken === expectedHash;
}

/**
 * Attempt to create a session with the given password
 */
export async function createSession(password: string): Promise<boolean> {
  if (password !== process.env.DASHBOARD_PASSWORD) {
    return false;
  }

  const cookieStore = await cookies();
  const hash = hashPassword(password);

  cookieStore.set(SESSION_COOKIE, hash, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  return true;
}

/**
 * Clear the session cookie
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
