import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-1 items-center justify-center bg-background px-6">
      <div className="max-w-md space-y-6 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-400/80">
          404
        </p>
        <h1 className="font-heading text-3xl leading-tight">
          We couldn&apos;t find that page.
        </h1>
        <p className="text-sm text-muted-foreground">
          It may have moved, or it never existed. Try heading back to your dashboard.
        </p>
        <div className="flex justify-center">
          <Button asChild>
            <Link href={ROUTES.home}>Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
