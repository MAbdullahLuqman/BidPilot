"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FirebaseError } from "firebase/app";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth/auth-provider";
import { ROUTES } from "@/lib/constants";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
});

type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const { sendPasswordReset, configured } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  async function onSubmit(values: Values) {
    setMessage(null);
    setError(null);
    if (!configured) {
      setError("Firebase is not configured yet.");
      return;
    }
    try {
      await sendPasswordReset(values.email);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      setError(formatFirebaseError(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Work email</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" {...register("email")} />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>
      {message && (
        <p className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-300">
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? <Loader2Icon className="animate-spin" /> : <CheckCircle2Icon />}
        Send reset link
      </Button>
      <Link href={ROUTES.login} className="text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}

function formatFirebaseError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/user-not-found":
        return "No account exists for that email.";
      case "auth/invalid-email":
        return "Enter a valid email address.";
      default:
        return err.message;
    }
  }
  return err instanceof Error ? err.message : "Could not send reset email.";
}
