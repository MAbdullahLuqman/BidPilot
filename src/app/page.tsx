import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  GaugeIcon,
  LibraryIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE, ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: APP_NAME,
};

export default function LandingPage() {
  return (
    <div className="relative isolate min-h-svh overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20%] h-[680px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute right-[-10%] top-[40%] h-[420px] w-[420px] rounded-full bg-sky-500/10 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--foreground) 1px, transparent 1px), linear-gradient(to bottom, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <Header />

      <main className="mx-auto flex max-w-6xl flex-col gap-32 px-6 pb-32 pt-20 md:px-10">
        <Hero />
        <Features />
        <Workflow />
        <CtaBlock />
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 pt-6 md:px-10">
      <Link href={ROUTES.home} className="flex items-center gap-2 font-medium">
        <BrandMark className="size-7" />
        <span className="text-sm tracking-tight">{APP_NAME}</span>
      </Link>
      <nav className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href={ROUTES.login}>Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={ROUTES.signup}>
            Get started
            <ArrowRightIcon />
          </Link>
        </Button>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur">
        <SparklesIcon className="size-3 text-emerald-400" />
        AI-powered bid response engine
      </span>
      <h1 className="font-heading text-4xl leading-[1.05] tracking-tight md:text-6xl">
        {APP_TAGLINE}
      </h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
        BidPilot reads your RFP, maps every requirement to your team&apos;s real
        capabilities, and produces an evidence-backed proposal draft in your house
        style — with a defensible GO/NO-GO call.
      </p>
      <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href={ROUTES.signup}>
            Start free
            <ArrowRightIcon />
          </Link>
        </Button>
        <Button asChild variant="ghost" size="lg">
          <Link href={ROUTES.login}>I already have an account</Link>
        </Button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Built for Pakistani software houses, agencies, contractors, and service providers.
      </p>
    </section>
  );
}

const features = [
  {
    icon: ShieldCheckIcon,
    title: "Compliance checklist",
    body: "Every mandatory clause is mapped to PASS / PARTIAL / FAIL with the evidence behind it.",
  },
  {
    icon: LibraryIcon,
    title: "Capability matching",
    body: "We build a library from your website, profile, and past wins — then match it to the tender.",
  },
  {
    icon: GaugeIcon,
    title: "Win probability",
    body: "A defensible score with top strengths, top risks, and a GO / NO-GO recommendation.",
  },
] as const;

function Features() {
  return (
    <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 md:grid-cols-3">
      {features.map((feature) => (
        <div
          key={feature.title}
          className="group relative flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-6 backdrop-blur transition-colors hover:bg-card/70"
        >
          <feature.icon className="size-5 text-emerald-400" />
          <h3 className="font-heading text-base">{feature.title}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
        </div>
      ))}
    </section>
  );
}

const steps = [
  {
    label: "01",
    title: "Sign up & add your company",
    body: "Drop in your website URL. BidPilot scrapes the visible pages and builds a draft capability library.",
  },
  {
    label: "02",
    title: "Upload an RFP",
    body: "PDF, DOCX, or pasted text. We extract requirements, eligibility, evaluation weights, and deadlines.",
  },
  {
    label: "03",
    title: "Match capabilities",
    body: "Every requirement is matched to evidence. Gaps are flagged with suggested actions.",
  },
  {
    label: "04",
    title: "Generate the proposal",
    body: "Editable section-by-section draft in your house style. Win probability + GO/NO-GO included.",
  },
] as const;

function Workflow() {
  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-10 max-w-xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-emerald-400/80">
          How it works
        </p>
        <h2 className="mt-3 font-heading text-2xl leading-tight md:text-3xl">
          From tender PDF to defensible bid — in four steps.
        </h2>
      </div>
      <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {steps.map((step) => (
          <li
            key={step.label}
            className="flex gap-4 rounded-xl border border-border/60 bg-card/40 p-6"
          >
            <span className="font-mono text-xs text-emerald-400">{step.label}</span>
            <div className="space-y-1.5">
              <h3 className="font-heading text-base leading-tight">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

const guarantees = [
  "No fabricated certifications, clients, or project values.",
  "Sample proposals shape style only — never copied verbatim.",
  "Every claim is traceable to a source you uploaded.",
];

function CtaBlock() {
  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-border/60 bg-card/50 p-8 md:p-10">
        <h2 className="font-heading text-2xl leading-tight md:text-3xl">
          Stop rewriting the same proposal at midnight.
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          BidPilot is grounded by your data — not a generic AI essay.
        </p>
        <ul className="mt-6 space-y-2 text-sm">
          {guarantees.map((g) => (
            <li key={g} className="flex items-start gap-2 text-muted-foreground">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              <span>{g}</span>
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row">
          <Button asChild size="lg">
            <Link href={ROUTES.signup}>
              Create my account
              <ArrowRightIcon />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href={ROUTES.login}>Sign in</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 border-t border-border/40 px-6 py-8 text-xs text-muted-foreground md:flex-row md:px-10">
      <div className="flex items-center gap-2">
        <BrandMark className="size-5" />
        <span>{APP_NAME}</span>
      </div>
      <span>Hackathon build · {new Date().getFullYear()}</span>
    </footer>
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
