import Link from "next/link";
import type { ReactNode } from "react";
import { APP_NAME, APP_TAGLINE, ROUTES } from "@/lib/constants";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-svh flex-1 overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-32 -top-32 h-[480px] w-[480px] rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute right-[-10%] top-[40%] h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Link href={ROUTES.home} className="flex items-center gap-2 font-medium">
          <BrandMark className="size-7" />
          <span className="text-sm tracking-tight">{APP_NAME}</span>
        </Link>
        <Link
          href={ROUTES.home}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to site
        </Link>
      </header>

      <main className="grid min-h-[calc(100svh-72px)] grid-cols-1 lg:grid-cols-2">
        <section className="relative flex items-center justify-center px-6 py-12 md:px-12">
          <div className="w-full max-w-sm">{children}</div>
        </section>

        <aside className="relative hidden items-center justify-center border-l border-border/60 px-12 py-12 lg:flex">
          <div className="max-w-md space-y-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-400/80">
              Built for Pakistani bidders
            </p>
            <h2 className="font-heading text-3xl leading-tight text-foreground">
              {APP_TAGLINE}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Upload an RFP. We extract every requirement, map it to your team&apos;s
              evidence, draft a compliant proposal in your house style, and tell you
              whether to bid — with reasoning you can defend.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <Bullet>Auto-generated compliance checklist</Bullet>
              <Bullet>Evidence-backed capability matching</Bullet>
              <Bullet>Win-probability score with GO / NO-GO</Bullet>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-400" />
      <span>{children}</span>
    </li>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 text-[11px] font-semibold text-emerald-950 ${className ?? ""}`}
      aria-hidden
    >
      BP
    </span>
  );
}
