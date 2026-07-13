"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="panel max-w-lg rounded-3xl p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-amber-400/15 bg-amber-400/8 text-amber-300"><AlertTriangle className="h-5 w-5" /></div>
        <h1 className="mt-5 text-2xl font-semibold text-white">This view could not be loaded</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">The dashboard protected your session and stopped at an unexpected response. Retry the view; no mutation was repeated.</p>
        <button className="primary-button mt-6" onClick={reset}><RotateCcw className="h-4 w-4" />Retry view</button>
      </div>
    </div>
  );
}
