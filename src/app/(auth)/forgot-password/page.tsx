import type { Metadata } from "next";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset password · BidPilot Pakistan",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl leading-tight">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Enter your work email and Firebase will send a secure reset link.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
