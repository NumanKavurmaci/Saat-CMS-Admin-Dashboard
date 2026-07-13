import { requireDashboardAccountSession } from "@/lib/session";

export default async function CmsLayout({ children }: { children: React.ReactNode }) {
  await requireDashboardAccountSession();
  return children;
}
