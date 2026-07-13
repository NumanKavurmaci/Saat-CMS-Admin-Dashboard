import { Search } from "lucide-react";

export function ParentSearch({ action, value, show }: { action: string; value: string; show: boolean }) {
  if (!show && !value) return null;
  return (
    <form action={action} className="rounded-2xl border border-blue-400/15 bg-blue-400/[0.045] p-4" method="get">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label>
          <span className="mb-2 block text-sm font-medium text-blue-100">Search eligible parents</span>
          <span className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input className="field !pl-10" name="parentSearch" defaultValue={value} placeholder="Filter Series and Seasons by title" /></span>
        </label>
        <button className="secondary-button" type="submit">Find parents</button>
      </div>
      <p className="mt-2 text-xs leading-5 text-blue-100/50">The parent catalog exceeds 100 records. Search runs on the backend; exact parent IDs are always accepted.</p>
    </form>
  );
}
