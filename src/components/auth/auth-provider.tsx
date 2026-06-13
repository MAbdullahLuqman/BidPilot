"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
  signInWithPopup,
  updateProfile,
  type User,
} from "firebase/auth";
import { firebaseConfigured, getClientAuth } from "@/lib/firebase/client";

type AuthState = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (name: string, email: string, password: string) => Promise<User>;
  signInWithGoogle: () => Promise<User>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) {
      return;
    }
    const unsubscribe = onAuthStateChanged(getClientAuth(), (next) => {
      setUser(next);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      configured: firebaseConfigured,
      signIn: async (email, password) => {
        const cred = await signInWithEmailAndPassword(
          getClientAuth(),
          email,
          password,
        );
        await createServerSession(cred.user);
        return cred.user;
      },
      signUp: async (name, email, password) => {
        const cred = await createUserWithEmailAndPassword(
          getClientAuth(),
          email,
          password,
        );
        await updateProfile(cred.user, { displayName: name });
        await createServerSession(cred.user);
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name }),
        });
        if (!res.ok) {
          throw new Error("Failed to create user profile");
        }
        return cred.user;
      },
      signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const cred = await signInWithPopup(getClientAuth(), provider);
        await createServerSession(cred.user);
        await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: cred.user.displayName ?? cred.user.email?.split("@")[0] ?? "Google user",
          }),
        });
        return cred.user;
      },
      sendPasswordReset: async (email) => {
        await sendPasswordResetEmail(getClientAuth(), email);
      },
      signOut: async () => {
        await fetch("/api/auth/session", { method: "DELETE" });
        await firebaseSignOut(getClientAuth());
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function createServerSession(user: User) {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    throw new Error("Failed to create server session");
  }
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
