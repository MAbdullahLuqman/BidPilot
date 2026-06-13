import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app/app-shell";
import { ROUTES } from "@/lib/constants";
import { getServerUser } from "@/lib/firebase/auth-server";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const user = await getServerUser();

  if (!user) {
    redirect(ROUTES.login);
  }

  return <AppShell userName={user.name ?? user.email ?? "BidPilot user"}>{children}</AppShell>;
}
