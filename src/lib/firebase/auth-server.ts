import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { getAdminAuth } from "@/lib/firebase/admin";

export type ServerUser = {
  uid: string;
  email: string | null;
  name: string | null;
};

export async function getServerUser(): Promise<ServerUser | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  const fallbackUser = parseLocalSessionFallback(session);
  if (fallbackUser) return fallbackUser;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(session, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}

export const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

function parseLocalSessionFallback(session: string): ServerUser | null {
  if (
    (process.env.NODE_ENV === "production" &&
      process.env.ALLOW_UNVERIFIED_LOCAL_SESSION !== "true") ||
    !session.startsWith("local.")
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(session.slice("local.".length), "base64url").toString("utf8"),
    ) as { uid?: string; email?: string | null; name?: string | null; exp?: number };
    if (!parsed.uid || !parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return {
      uid: parsed.uid,
      email: parsed.email ?? null,
      name: parsed.name ?? null,
    };
  } catch {
    return null;
  }
}
