import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/constants";
import { getAdminAuth } from "@/lib/firebase/admin";
import { SESSION_DURATION_MS } from "@/lib/firebase/auth-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let idToken: string | undefined;
  try {
    const body = (await req.json()) as { idToken?: string };
    idToken = body.idToken;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!idToken) {
    return NextResponse.json({ error: "missing_id_token" }, { status: 400 });
  }

  const localFallback = createLocalSessionFallback(idToken);
  if (localFallback) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, localFallback, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS / 1000,
      path: "/",
    });
    return NextResponse.json({ ok: true, mode: "local_fallback" });
  }

  try {
    const sessionCookie = await getAdminAuth().createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    });
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_MS / 1000,
      path: "/",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[auth/session] failed to mint session cookie", err);
    return NextResponse.json(
      { error: "session_creation_failed" },
      { status: 401 },
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}

function createLocalSessionFallback(idToken: string): string | null {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_UNVERIFIED_LOCAL_SESSION !== "true"
  ) {
    return null;
  }

  const payload = decodeJwtPayload(idToken);
  if (!payload?.sub && !payload?.user_id) return null;

  return `local.${Buffer.from(
    JSON.stringify({
      uid: payload.user_id ?? payload.sub,
      email: payload.email ?? null,
      name: payload.name ?? payload.email?.split("@")[0] ?? null,
      exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_MS / 1000,
    }),
    "utf8",
  ).toString("base64url")}`;
}

function decodeJwtPayload(token: string):
  | {
      sub?: string;
      user_id?: string;
      email?: string;
      name?: string;
    }
  | null {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}
