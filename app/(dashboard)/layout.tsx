import { AppShell } from "@/components/app-shell";
import { requireDashboardSession } from "@/lib/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const account = await requireDashboardSession();
  return (
    <AppShell actorId={account.actorId} role={account.role}>
      {children}
    </AppShell>
  );
}
