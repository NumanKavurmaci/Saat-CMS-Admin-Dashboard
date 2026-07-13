export default function DashboardLoading() {
  return (
    <div aria-label="Loading dashboard" className="animate-pulse space-y-8">
      <div className="space-y-3 border-b border-[var(--border)] pb-7"><div className="h-3 w-32 rounded bg-slate-700/60" /><div className="h-10 w-full max-w-xl rounded-lg bg-slate-700/45" /><div className="h-4 w-full max-w-2xl rounded bg-slate-800" /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="panel h-36 rounded-2xl" />)}</div>
      <div className="panel h-72 rounded-2xl" />
    </div>
  );
}
