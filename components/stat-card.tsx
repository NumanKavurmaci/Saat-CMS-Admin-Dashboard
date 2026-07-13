import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "blue",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  detail: string;
  tone?: "blue" | "green" | "amber" | "slate";
}) {
  const tones = {
    blue: "border-blue-400/15 bg-blue-400/8 text-blue-300",
    green: "border-emerald-400/15 bg-emerald-400/8 text-emerald-300",
    amber: "border-amber-400/15 bg-amber-400/8 text-amber-300",
    slate: "border-slate-400/15 bg-slate-400/8 text-slate-300",
  }[tone];

  return (
    <article className="panel rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-400">{label}</p>
        <span className={`rounded-lg border p-2 ${tones}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</div>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}
