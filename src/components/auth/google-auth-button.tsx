"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { ROUTES } from "@/lib/constants";

export function GoogleAuthButton({ next = ROUTES.dashboard }: { next?: string }) {
  const router = useRouter();
  const { signInWithGoogle, configured } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGoogle() {
    setError(null);
    if (!configured) {
      setError("Firebase is not configured yet.");
      return;
    }
    setLoading(true);
    try {
      await signInWithGoogle();
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" size="lg" className="w-full" onClick={handleGoogle} disabled={loading}>
        {loading ? <Loader2Icon className="animate-spin" /> : <GoogleMark />}
        Continue with Google
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <span className="flex size-4 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-foreground">
      G
    </span>
  );
}

function formatFirebaseError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/popup-closed-by-user":
        return "Google sign-in was cancelled.";
      case "auth/unauthorized-domain":
        return "This domain is not authorized in Firebase Authentication settings.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : "Google sign-in failed.";
}
