import type { Metadata } from "next";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create account · BidPilot Pakistan",
};

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl leading-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">
          Start with your company. We&apos;ll build a capability profile from your
          website in the next step.
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
