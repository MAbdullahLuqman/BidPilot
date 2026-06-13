"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FirebaseError } from "firebase/app";
import { ArrowRightIcon, Loader2Icon } from "lucide-react";

import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import { ROUTES } from "@/lib/constants";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

type Values = z.infer<typeof schema>;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { signIn, configured } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const next = params.get("next") ?? ROUTES.dashboard;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setServerError(null);
    if (!configured) {
      setServerError(
        "Firebase isn't configured yet. Add your NEXT_PUBLIC_FIREBASE_* values to .env.local and restart the dev server.",
      );
      return;
    }
    try {
      await signIn(values.email, values.password);
      router.push(next);
      router.refresh();
    } catch (err) {
      setServerError(formatFirebaseError(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <GoogleAuthButton next={next} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or sign in with email
        <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {serverError && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2">
        {isSubmitting ? (
          <>
            <Loader2Icon className="animate-spin" /> Signing in…
          </>
        ) : (
          <>
            Sign in <ArrowRightIcon />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        <Link href={ROUTES.forgotPassword} className="text-foreground underline-offset-4 hover:underline">
          Forgot password?
        </Link>
        <span className="px-2">·</span>
        New to BidPilot?{" "}
        <Link href={ROUTES.signup} className="text-foreground underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
      </form>
    </div>
  );
}

function formatFirebaseError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Email or password is incorrect.";
      case "auth/too-many-requests":
        return "Too many attempts. Try again in a few minutes.";
      case "auth/network-request-failed":
        return "Network error — check your connection and try again.";
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}
