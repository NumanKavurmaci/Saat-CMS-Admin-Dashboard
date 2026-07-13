"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  CalendarRange,
  ChevronDown,
  Clapperboard,
  Database,
  FileSearch,
  Gauge,
  LogOut,
  Menu,
  PlayCircle,
  Radio,
  X,
} from "lucide-react";
import { useState } from "react";
import { BrandMark } from "@/components/brand-mark";
import { logoutAction } from "@/app/login/actions";

const navigation = [
  { href: "/dashboard", label: "Overview", icon: Gauge },
  { href: "/content", label: "Content", icon: Clapperboard },
  { href: "/channels", label: "Live Channels", icon: Radio },
  { href: "/epg", label: "EPG Schedule", icon: CalendarRange },
  { href: "/tools/metadata", label: "Metadata Resolver", icon: FileSearch },
  { href: "/tools/playback", label: "Playback Tester", icon: PlayCircle },
  { href: "/system", label: "System", icon: Database },
];

export function AppShell({
  actorId,
  role,
  children,
}: {
  actorId: string;
  role: "editor" | "admin";
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside
        className={`${mobileOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--border)] bg-[#081221]/98 px-4 py-5 backdrop-blur transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
      >
        <div className="flex items-center justify-between px-2">
          <BrandMark />
          <button className="rounded-lg p-2 text-slate-400 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-8 px-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Workspace
        </div>
        <nav className="mt-3 space-y-1" aria-label="Primary navigation">
          {navigation.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${active ? "border border-blue-400/20 bg-blue-500/12 text-white shadow-[inset_3px_0_0_#4e8cff]" : "border border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100"}`}
              >
                <Icon aria-hidden="true" className={`h-[1.1rem] w-[1.1rem] ${active ? "text-blue-300" : "text-slate-500"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto rounded-xl border border-[var(--border)] bg-[#0d192b] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <Activity className="h-3.5 w-3.5" />
            Secure server session
          </div>
          <p className="mt-1.5 text-xs leading-5 text-slate-500">CMS credentials stay outside the browser.</p>
        </div>
      </aside>

      {mobileOpen && <button className="fixed inset-0 z-40 bg-black/55 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center border-b border-[var(--border)] bg-[#07101f]/88 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <button className="mr-3 rounded-lg p-2 text-slate-300 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <p className="text-xs text-slate-500">Operations workspace</p>
            <p className="text-sm font-semibold text-slate-100">SaatCMS Middleware Core</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-100">{actorId}</p>
              <p className="text-xs capitalize text-slate-500">{role} access</p>
            </div>
            <form action={logoutAction}>
              <button className="secondary-button !min-h-9 !rounded-full !px-3" type="submit" aria-label="Sign out">
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </form>
            <ChevronDown className="hidden h-4 w-4 text-slate-600 sm:block" />
          </div>
        </header>
        <main id="main-content" className="mx-auto w-full max-w-[96rem] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
