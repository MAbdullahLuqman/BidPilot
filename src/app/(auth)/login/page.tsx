import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in · BidPilot Pakistan",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl leading-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to continue drafting compliant proposals.
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
