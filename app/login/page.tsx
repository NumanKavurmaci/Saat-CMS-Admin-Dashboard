import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, Database, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { getDashboardSession } from "@/lib/session";
import { LoginForm } from "@/app/login/login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getDashboardSession()) redirect("/dashboard");

  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(28rem,0.9fr)]">
      <section className="relative hidden overflow-hidden border-r border-[var(--border)] lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_22%,rgba(78,140,255,.17),transparent_25rem)]" />
        <div className="relative"><BrandMark /></div>
        <div className="relative max-w-2xl">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.25em] text-blue-300">OTT operations, resolved</p>
          <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.045em] text-white xl:text-6xl">
            One clear surface for content, channels, and playback.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-400">
            Manage inherited metadata and live schedules with the same rules that protect the SaatCMS middleware.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {[
              [ShieldCheck, "Server-only", "Credential handling"],
              [Activity, "Live", "Health visibility"],
              [Database, "PostgreSQL", "Readiness aware"],
            ].map(([Icon, title, copy]) => {
              const FeatureIcon = Icon as typeof ShieldCheck;
              return (
                <div key={String(title)} className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                  <FeatureIcon className="h-5 w-5 text-blue-300" />
                  <p className="mt-5 text-sm font-semibold text-slate-100">{String(title)}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{String(copy)}</p>
                </div>
              );
            })}
          </div>
        </div>
        <p className="relative text-xs text-slate-600">Saat Teknoloji · Middleware administration</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden"><BrandMark /></div>
          <div className="panel rounded-3xl p-6 sm:p-8">
            <div className="inline-flex rounded-full border border-blue-400/15 bg-blue-400/8 px-3 py-1 text-xs font-medium text-blue-200">Secure workspace</div>
            <h2 className="mt-5 text-3xl font-semibold tracking-[-0.035em] text-white">Welcome back</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">Sign in to manage CMS resources, or continue as a visitor to explore public middleware tools.</p>
            <LoginForm />
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-slate-600">
            CMS keys are verified only on the server; visitor requests use no bearer credential.
          </p>
        </div>
      </section>
    </main>
  );
}
