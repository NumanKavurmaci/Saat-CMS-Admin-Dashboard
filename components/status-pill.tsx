import { CircleCheck, CircleX, LoaderCircle } from "lucide-react";

type Status = "healthy" | "degraded" | "checking";

export function StatusPill({ status, label }: { status: Status; label: string }) {
  const styles = {
    healthy: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    degraded: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    checking: "border-slate-400/20 bg-slate-400/10 text-slate-300",
  }[status];
  const Icon = status === "healthy" ? CircleCheck : status === "degraded" ? CircleX : LoaderCircle;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}>
      <Icon aria-hidden="true" className={`h-3.5 w-3.5 ${status === "checking" ? "animate-spin" : ""}`} />
      {label}
    </span>
  );
}
