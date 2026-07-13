import { Check, Minus } from "lucide-react";
import type { CmsContent } from "@/lib/types";
import type { ResolvedContentMetadata } from "@/lib/content/model";

function Value({ children, inherited = false }: { children: React.ReactNode; inherited?: boolean }) {
  return children === null || children === undefined || children === ""
    ? <span className="inline-flex items-center gap-1.5 text-slate-600"><Minus className="h-3.5 w-3.5" /> {inherited ? "Inherit" : "Not resolved"}</span>
    : <span className="text-slate-200">{children}</span>;
}

export function MetadataPreview({ raw, resolved }: { raw: CmsContent; resolved: ResolvedContentMetadata }) {
  const rows: Array<[string, React.ReactNode, React.ReactNode]> = [
    ["Parental rating", raw.parentalRating, resolved.parentalRating],
    ["Genre", raw.genre, resolved.genre],
    ["Quality", raw.quality?.replace("_", " "), resolved.quality?.replace("_", " ")],
    ["Premium", raw.isPremium === null ? null : raw.isPremium ? "Yes" : "No", resolved.isPremium === null ? null : resolved.isPremium ? "Yes" : "No"],
    ["Geo-block countries", raw.geoBlockCountriesOverride ? raw.geoBlockCountries.join(", ") || "Empty override" : null, resolved.geoBlockCountries.join(", ") || "None"],
  ];
  return (
    <section className="panel overflow-hidden rounded-2xl">
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h2 className="font-semibold text-white">Raw overrides vs. resolved metadata</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">Resolved values come from the public metadata endpoint. Protected playback URLs remain CMS-only.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[38rem] text-left text-sm">
          <thead className="bg-[#0a1525] text-[0.68rem] uppercase tracking-[0.14em] text-slate-500"><tr><th className="px-5 py-3">Field</th><th className="px-5 py-3">This record</th><th className="px-5 py-3">Resolved</th></tr></thead>
          <tbody className="divide-y divide-[var(--border)]">
            {rows.map(([label, rawValue, resolvedValue]) => (
              <tr key={label}><th className="px-5 py-4 font-medium text-slate-400">{label}</th><td className="px-5 py-4"><Value inherited>{rawValue}</Value></td><td className="px-5 py-4"><span className="inline-flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-300" /><Value>{resolvedValue}</Value></span></td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
