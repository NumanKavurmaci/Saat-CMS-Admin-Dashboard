import type { Metadata } from "next";
import { Activity, Database, Globe2 } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { StatCard } from "@/components/stat-card";
import { ApiErrorCard } from "@/components/api-error-card";
import { StatusPill } from "@/components/status-pill";
import { saatCmsRequest } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import type { ServiceHealth, ServiceReadiness } from "@/lib/types";

export const metadata: Metadata = { title: "System" };

export default async function SystemPage() {
  const [health, readiness] = await Promise.allSettled([saatCmsRequest<ServiceHealth>("/health", { authenticated: false }), saatCmsRequest<ServiceReadiness>("/ready", { authenticated: false })]);
  const env = getServerEnv();
  return <div className="space-y-8"><PageHeading eyebrow="Operations" title="System status" description="Direct signals from the deployed middleware and its PostgreSQL readiness gate." /><div className="grid gap-4 md:grid-cols-3"><StatCard icon={Activity} label="Service" value={<StatusPill status={health.status === "fulfilled" ? "healthy" : "degraded"} label={health.status === "fulfilled" ? "Operational" : "Unavailable"} />} detail="GET /health" tone={health.status === "fulfilled" ? "green" : "amber"} /><StatCard icon={Database} label="Database" value={<StatusPill status={readiness.status === "fulfilled" ? "healthy" : "degraded"} label={readiness.status === "fulfilled" ? "Ready" : "Not ready"} />} detail="GET /ready" tone={readiness.status === "fulfilled" ? "green" : "amber"} /><StatCard icon={Globe2} label="Backend origin" value={<span className="text-lg">Render</span>} detail={new URL(env.SAATCMS_API_BASE_URL).host} tone="slate" /></div>{health.status === "rejected" && <ApiErrorCard error={health.reason} title="Liveness check failed" />}{readiness.status === "rejected" && <ApiErrorCard error={readiness.reason} title="Readiness check failed" />}</div>;
}
