"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  name: z.string().min(2, "Tell us your name."),
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

type Values = z.infer<typeof schema>;

export function SignupForm() {
  const router = useRouter();
  const { signUp, configured } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);

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
      await signUp(values.name, values.email, values.password);
      router.push(ROUTES.onboarding);
      router.refresh();
    } catch (err) {
      setServerError(formatFirebaseError(err));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <GoogleAuthButton next={ROUTES.onboarding} />
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or create with email
        <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          autoComplete="name"
          placeholder="Asad Khan"
          aria-invalid={!!errors.name}
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive">{errors.name.message}</p>
        )}
      </div>

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
          autoComplete="new-password"
          placeholder="At least 8 characters"
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
            <Loader2Icon className="animate-spin" /> Creating account…
          </>
        ) : (
          <>
            Create account <ArrowRightIcon />
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Already have an account?{" "}
        <Link href={ROUTES.login} className="text-foreground underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
      </form>
    </div>
  );
}

function formatFirebaseError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists. Try signing in instead.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      case "auth/weak-password":
        return "Password is too weak — use at least 8 characters.";
      case "auth/network-request-failed":
        return "Network error — check your connection and try again.";
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}
