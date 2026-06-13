"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  BarChart3Icon,
  BriefcaseBusinessIcon,
  Building2Icon,
  CheckSquareIcon,
  ChevronDownIcon,
  ClipboardCheckIcon,
  ClipboardListIcon,
  FileTextIcon,
  FolderOpenIcon,
  GaugeIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  LibraryIcon,
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react";

import { SignOutButton } from "@/components/app/sign-out-button";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { useStoredWorkspaces } from "@/lib/client-storage";
import { useAuth } from "@/components/auth/auth-provider";
import { cn } from "@/lib/utils";
import { useState } from "react";

const globalNav = [
  { href: ROUTES.dashboard, label: "Dashboard", icon: LayoutDashboardIcon },
  { href: ROUTES.companySettings, label: "Company Settings", icon: Building2Icon },
  { href: ROUTES.companyProfile, label: "Website Analyzer", icon: BriefcaseBusinessIcon },
  { href: ROUTES.capabilityLibrary, label: "Capabilities", icon: LibraryIcon },
  { href: ROUTES.workspaces, label: "RFP Workspaces", icon: FileTextIcon },
  { href: ROUTES.governmentRfps, label: "Govt RFPs", icon: LandmarkIcon },
  { href: ROUTES.settings, label: "Settings", icon: SettingsIcon },
] as const;

const workspaceNav = (id: string) => [
  { href: `/workspaces/${id}`, label: "Overview", icon: LayoutDashboardIcon, exact: true },
  { href: `/workspaces/${id}/analysis`, label: "Analysis", icon: ClipboardListIcon },
  { href: `/workspaces/${id}/compliance`, label: "Compliance", icon: CheckSquareIcon },
  { href: `/workspaces/${id}/proposal`, label: "Proposal Studio", icon: SparklesIcon },
  { href: `/workspaces/${id}/win-score`, label: "Win Score", icon: TrophyIcon },
  { href: `/workspaces/${id}/gaps`, label: "Gap Analysis", icon: BarChart3Icon },
  { href: `/workspaces/${id}/readiness`, label: "Readiness", icon: ClipboardCheckIcon },
];

export function AppShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const { user } = useAuth();
  const workspaces = useStoredWorkspaces(user);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Detect if we are inside a workspace
  const wsIdFromPath = pathname.match(/^\/workspaces\/([^/]+)/)?.[1];
  const activeWsId = wsIdFromPath && wsIdFromPath !== "new" ? wsIdFromPath : null;
  const activeWorkspace = activeWsId ? workspaces.find((w) => w.id === activeWsId) : null;

  const wsNav = activeWsId ? workspaceNav(activeWsId) : null;

  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-72 overflow-y-auto border-r border-border/60 bg-card/35 px-4 py-5 lg:flex lg:flex-col">
        {/* Logo */}
        <Link href={ROUTES.dashboard} className="flex items-center gap-3 px-2">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-emerald-400 text-sm font-semibold text-emerald-950">
            BP
          </span>
          <div>
            <p className="text-sm font-medium leading-none">BidPilot Pakistan</p>
            <p className="mt-1 text-xs text-muted-foreground">Tender response engine</p>
          </div>
        </Link>

        {/* Workspace switcher */}
        <div className="mt-6 relative">
          <button
            type="button"
            onClick={() => setSwitcherOpen((o) => !o)}
            className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
          >
            <FolderOpenIcon className="size-4 shrink-0 text-emerald-400" />
            <span className="flex-1 truncate font-medium">
              {activeWorkspace ? activeWorkspace.title : "Select workspace"}
            </span>
            <ChevronDownIcon
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform", switcherOpen && "rotate-180")}
            />
          </button>

          {switcherOpen && (
            <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-border/70 bg-card shadow-lg">
              <div className="p-2">
                {workspaces.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-muted-foreground">No workspaces yet.</p>
                ) : (
                  workspaces.slice(0, 6).map((ws) => (
                    <Link
                      key={ws.id}
                      href={`/workspaces/${ws.id}`}
                      onClick={() => setSwitcherOpen(false)}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2 py-2 text-xs transition-colors hover:bg-muted/60",
                        ws.id === activeWsId && "bg-muted text-foreground",
                      )}
                    >
                      <FileTextIcon className="size-3.5 shrink-0 text-emerald-400" />
                      <span className="truncate">{ws.title}</span>
                    </Link>
                  ))
                )}
              </div>
              <div className="border-t border-border/60 p-2">
                <Link
                  href={ROUTES.workspaces}
                  onClick={() => setSwitcherOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                >
                  <FolderOpenIcon className="size-3.5" /> All workspaces
                </Link>
                <Link
                  href={ROUTES.newWorkspace}
                  onClick={() => setSwitcherOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-emerald-400 transition-colors hover:bg-muted/60"
                >
                  <PlusIcon className="size-3.5" /> New workspace
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Workspace-aware nav */}
        {wsNav ? (
          <nav className="mt-4 flex flex-col gap-0.5">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Workspace
            </p>
            {wsNav.map((item) => {
              const active = "exact" in item && item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                    active && "bg-muted text-foreground font-medium",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="my-2 h-px bg-border/60" />
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Global
            </p>
          </nav>
        ) : (
          <div className="mt-4">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Navigation
            </p>
          </div>
        )}

        {/* Global nav (always shown below workspace nav) */}
        <nav className={cn("flex flex-col gap-0.5", wsNav ? "" : "mt-0")}>
          {globalNav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== ROUTES.dashboard && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                  active && !wsNav && "bg-muted text-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-border/60 bg-background/90 px-4 backdrop-blur md:px-8">
          <div>
            {activeWorkspace ? (
              <>
                <p className="text-xs text-muted-foreground">Active workspace</p>
                <p className="max-w-xs truncate text-sm font-medium">{activeWorkspace.title}</p>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">Signed in as</p>
                <p className="text-sm font-medium">{userName}</p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm">
              <Link href={ROUTES.newWorkspace}>
                <PlusIcon />
                New RFP
              </Link>
            </Button>
            <SignOutButton />
          </div>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}
