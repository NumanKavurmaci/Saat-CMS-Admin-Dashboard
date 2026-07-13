import { AlertTriangle } from "lucide-react";
import { SaatCmsApiError } from "@/lib/api";

export function ApiErrorCard({ error, title = "Data unavailable" }: { error: unknown; title?: string }) {
  const normalized = error instanceof SaatCmsApiError
    ? error
    : new SaatCmsApiError({ status: 500, errorCode: "UNEXPECTED_ERROR", message: "The dashboard could not load this data.", requestId: null });

  return (
    <div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.06] p-5">
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <p className="font-semibold text-amber-100">{title}</p>
          <p className="mt-1 text-sm leading-6 text-amber-100/65">{normalized.message}</p>
          <p className="mt-2 font-mono text-[0.68rem] uppercase tracking-wider text-amber-300/65">{normalized.errorCode} · HTTP {normalized.status}</p>
        </div>
      </div>
    </div>
  );
}
