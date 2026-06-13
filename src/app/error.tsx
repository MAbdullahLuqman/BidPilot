"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-background px-6">
      <div className="max-w-md space-y-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-destructive">
          Unexpected error
        </p>
        <h1 className="font-heading text-3xl leading-tight">
          Something went sideways.
        </h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "An unexpected error occurred. Try again."}
        </p>
        <div className="flex justify-center">
          <Button onClick={() => reset()}>Try again</Button>
        </div>
      </div>
    </div>
  );
}
