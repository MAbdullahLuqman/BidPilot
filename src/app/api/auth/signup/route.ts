import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getServerUser } from "@/lib/firebase/auth-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let name = user.name ?? "";
  try {
    const body = (await req.json()) as { name?: string };
    if (body.name && body.name.trim().length > 0) name = body.name.trim();
  } catch {
    // body is optional — fall back to the display name on the token.
  }

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.ALLOW_UNVERIFIED_LOCAL_SESSION === "true"
  ) {
    return NextResponse.json({ ok: true, mode: "local_profile" });
  }

  try {
    const db = getAdminDb();
    const userRef = db.collection("users").doc(user.uid);
    const snapshot = await userRef.get();
    if (snapshot.exists) {
      await userRef.update({
        name,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await userRef.set({
        name,
        email: user.email ?? null,
        companyId: null,
        role: "owner",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (err) {
    if (process.env.NODE_ENV === "production") {
      throw err;
    }
    console.warn("[auth/signup] skipped Firestore profile write in local dev", err);
  }

  return NextResponse.json({ ok: true });
}
