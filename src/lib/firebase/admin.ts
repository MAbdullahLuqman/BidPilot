import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth as getAdminAuthInstance, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

type ServiceAccount = {
  project_id: string;
  client_email: string;
  private_key: string;
};

function decodeServiceAccount(): ServiceAccount | null {
  const raw = process.env.FIREBASE_ADMIN_SDK_JSON;
  if (!raw) return null;

  let decoded = raw;
  // The env var should be base64-encoded JSON, but accept raw JSON too.
  if (!raw.trim().startsWith("{")) {
    try {
      decoded = Buffer.from(raw, "base64").toString("utf8");
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(decoded) as ServiceAccount;
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
      return null;
    }
    // Newlines in the private key are commonly escaped.
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    return parsed;
  } catch {
    return null;
  }
}

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  const sa = decodeServiceAccount();
  if (!sa) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_ADMIN_SDK_JSON (base64-encoded service account JSON) in .env.local.",
    );
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    }),
    projectId: sa.project_id,
  });
  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAdminAuthInstance(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export const adminConfigured = Boolean(process.env.FIREBASE_ADMIN_SDK_JSON);
