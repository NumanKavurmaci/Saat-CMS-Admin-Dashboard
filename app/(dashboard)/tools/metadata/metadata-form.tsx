"use client";

import { useActionState } from "react";
import { FileSearch, LoaderCircle, ShieldCheck } from "lucide-react";
import { resolveMetadataAction, type MetadataState } from "@/app/(dashboard)/tools/metadata/actions";

const initialState: MetadataState = { status: "idle" };

export function MetadataForm() {
  const [state, action, pending] = useActionState(resolveMetadataAction, initialState);

  return (
    <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
      <form action={action} className="panel h-fit rounded-2xl p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-white">Resolve Content</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">Inspect the final public metadata after Series, Season, and Episode inheritance.</p>
        <label className="mt-6 block"><span className="mb-2 block text-sm font-medium text-slate-300">Content ID</span><input className="field" name="contentId" defaultValue="episode-galactic-odyssey-s1e2" required /></label>
        <button className="primary-button mt-5 w-full" type="submit" disabled={pending}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSearch className="h-4 w-4" />}{pending ? "Resolving…" : "Resolve metadata"}</button>
      </form>
      <section className="panel min-h-[25rem] rounded-2xl p-5 sm:p-6" aria-live="polite">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold text-white">Resolved payload</h2><p className="mt-1 text-sm text-slate-500">Protected playback assets are intentionally excluded.</p></div><ShieldCheck className="h-5 w-5 text-blue-300" /></div>
        {state.status === "idle" && <div className="grid min-h-[18rem] place-items-center text-center"><div><FileSearch className="mx-auto h-8 w-8 text-slate-600" /><p className="mt-4 text-sm text-slate-500">Enter a seeded Content ID to inspect inheritance.</p></div></div>}
        {state.status === "error" && <div role="alert" className="mt-6 rounded-2xl border border-rose-400/15 bg-rose-400/[0.06] p-5"><p className="font-mono text-xs font-semibold text-rose-300">{state.errorCode}</p><p className="mt-2 text-sm leading-6 text-rose-100/70">{state.message}</p></div>}
        {state.status === "success" && state.data && <div className="mt-6"><div className="rounded-2xl border border-blue-400/15 bg-blue-400/[0.05] p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">{state.data.type}</p><h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">{state.data.title}</h3><p className="mt-2 font-mono text-xs text-slate-500">{state.data.contentId}</p></div><dl className="mt-4 grid gap-3 sm:grid-cols-2">{[["Parental rating", state.data.parentalRating ?? "Not set"],["Genre", state.data.genre ?? "Not set"],["Quality", state.data.quality ?? "Not set"],["Premium", state.data.isPremium === null ? "Not set" : state.data.isPremium ? "Yes" : "No"],["Blocked countries", state.data.geoBlockCountries.length ? state.data.geoBlockCountries.join(", ") : "None"]].map(([label, value]) => <div key={label} className="rounded-xl border border-[var(--border)] bg-[#0a1526] p-4"><dt className="text-[0.68rem] uppercase tracking-wider text-slate-600">{label}</dt><dd className="mt-2 text-sm font-medium text-slate-200">{value}</dd></div>)}</dl></div>}
      </section>
    </div>
  );
}
