import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Clapperboard,
  Database,
  FileSearch,
  PlayCircle,
  Radio,
  ServerCog,
  ShieldCheck,
} from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import { ApiErrorCard } from "@/components/api-error-card";
import { saatCmsRequest } from "@/lib/api";
import { requireDashboardSession } from "@/lib/session";
import type {
  CmsContent,
  LiveChannel,
  PageResponse,
  ServiceHealth,
  ServiceReadiness,
} from "@/lib/types";

export const metadata: Metadata = { title: "Overview" };

type DashboardPageProps = {
  searchParams?: Promise<{ notice?: string | string[] }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps = {}) {
  const session = await requireDashboardSession();
  const visitor = session.kind === "visitor";
  const query = await searchParams;

  const [health, readiness] = await Promise.allSettled([
    saatCmsRequest<ServiceHealth>("/health", { authenticated: false }),
    saatCmsRequest<ServiceReadiness>("/ready", { authenticated: false }),
  ]);
  const cmsTotals = visitor
    ? null
    : await Promise.allSettled([
        saatCmsRequest<PageResponse<CmsContent>>("/api/v1/cms/content?page=1&pageSize=1"),
        saatCmsRequest<PageResponse<LiveChannel>>("/api/v1/cms/channels?page=1&pageSize=1"),
      ]);
  const content = cmsTotals?.[0];
  const channels = cmsTotals?.[1];

  const healthOk = health.status === "fulfilled" && health.value.data.status === "ok";
  const ready = readiness.status === "fulfilled" && readiness.value.data.status === "ready";
  const workspaceItems = visitor
    ? [
        {
          href: "/tools/metadata",
          number: "01",
          title: "Resolve metadata",
          copy: "Inspect inherited middleware metadata through the public resolver.",
          icon: FileSearch,
        },
        {
          href: "/tools/playback",
          number: "02",
          title: "Test playback",
          copy: "Exercise country and device decisions without a CMS bearer.",
          icon: PlayCircle,
        },
        {
          href: "/system",
          number: "03",
          title: "Check the system",
          copy: "Review public liveness and database readiness signals.",
          icon: ServerCog,
        },
      ]
    : [
        {
          href: "/content",
          number: "01",
          title: "Shape the catalog",
          copy: "Review hierarchy, overrides, and protected asset data.",
          icon: Clapperboard,
        },
        {
          href: "/channels",
          number: "02",
          title: "Organize live TV",
          copy: "Keep channel identities and schedules easy to inspect.",
          icon: Radio,
        },
        {
          href: "/tools/playback",
          number: "03",
          title: "Verify delivery",
          copy: "Exercise country and device rules before playback.",
          icon: PlayCircle,
        },
      ];

  return (
    <div className="space-y-8">
      {visitor && query?.notice === "cms-account-required" && (
        <div role="status" className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.07] px-5 py-4 text-sm text-amber-100">
          Content, Channel, and EPG management require an editor or admin account. Sign in to continue.
        </div>
      )}

      <PageHeading
        eyebrow={visitor ? "Visitor overview" : "Control center"}
        title={visitor ? "Explore the public middleware surface." : "Good operations start with clear signals."}
        description={
          visitor
            ? "Visitor mode uses only public health, metadata, and playback endpoints. No CMS bearer credential is attached."
            : "Monitor the middleware boundary, keep editorial data organized, and test entitlement decisions from one secure workspace."
        }
        actions={
          <Link className="primary-button" href="/tools/playback">
            <PlayCircle className="h-4 w-4" />
            Test playback
          </Link>
        }
      />

      <section
        aria-label="System summary"
        className={`grid gap-4 sm:grid-cols-2 ${visitor ? "xl:max-w-4xl" : "xl:grid-cols-4"}`}
      >
        <StatCard
          icon={Activity}
          label="Backend service"
          value={<StatusPill status={healthOk ? "healthy" : "degraded"} label={healthOk ? "Operational" : "Unavailable"} />}
          detail="Live process health from the deployed middleware."
          tone={healthOk ? "green" : "amber"}
        />
        <StatCard
          icon={Database}
          label="Database readiness"
          value={<StatusPill status={ready ? "healthy" : "degraded"} label={ready ? "Ready" : "Not ready"} />}
          detail="PostgreSQL connectivity and migration state."
          tone={ready ? "green" : "amber"}
        />
        {!visitor && content && (
          <StatCard
            icon={Clapperboard}
            label="Content records"
            value={content.status === "fulfilled" ? content.value.data.total : "—"}
            detail="Series, seasons, episodes, and movies."
          />
        )}
        {!visitor && channels && (
          <StatCard
            icon={Radio}
            label="Live channels"
            value={channels.status === "fulfilled" ? channels.value.data.total : "—"}
            detail="Linear channels available for EPG scheduling."
            tone="slate"
          />
        )}
      </section>

      {!visitor && content && channels && (content.status === "rejected" || channels.status === "rejected") && (
        <ApiErrorCard
          error={content.status === "rejected" ? content.reason : channels.status === "rejected" ? channels.reason : null}
          title="CMS totals need a valid environment key"
        />
      )}

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="panel rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace map</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {visitor ? "Public tools available to visitors" : "Move from metadata to delivery"}
              </h2>
            </div>
            <ShieldCheck className="h-5 w-5 text-blue-300" />
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {workspaceItems.map((item) => {
              const ItemIcon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group rounded-xl border border-[var(--border)] bg-[#0a1526] p-4 transition hover:-translate-y-0.5 hover:border-blue-400/30"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-blue-300">
                    <span>{item.number}</span>
                    <ItemIcon className="h-4 w-4" />
                  </div>
                  <h3 className="mt-6 font-semibold text-slate-100">{item.title}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{item.copy}</p>
                  <ArrowUpRight className="mt-4 h-4 w-4 text-slate-600 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-300" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className="panel rounded-2xl p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Security boundary</p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            {visitor ? "No CMS credential is used" : "Credentials stay server-side"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {visitor
              ? "Visitor requests are explicitly limited to the backend public allowlist and never receive an Authorization header."
              : "The dashboard resolves your environment-managed actor on every request and attaches its bearer key only from the server runtime."}
          </p>
          <div className="mt-6 space-y-3 text-sm text-slate-300">
            {(visitor
              ? [
                  "Signed visitor session with no account secret",
                  "CMS routes hidden and server-blocked",
                  "Health and middleware requests only",
                ]
              : [
                  "Signed, eight-hour HttpOnly session",
                  "No browser storage or public environment key",
                  "Backend remains the authorization authority",
                ]
            ).map((item) => (
              <div key={item} className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
