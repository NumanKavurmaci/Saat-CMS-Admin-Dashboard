import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clapperboard, Eye, Plus, Search } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { ApiErrorCard } from "@/components/api-error-card";
import { saatCmsRequest } from "@/lib/api";
import { contentTypes } from "@/lib/content/model";
import type { CmsContent, ContentType, PageResponse } from "@/lib/types";

export const metadata: Metadata = { title: "Content" };

function positiveInteger(value: string | string[] | undefined, fallback: number, maximum: number): number {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return parsed >= 1 && parsed <= maximum ? parsed : fallback;
}

function listHref(query: URLSearchParams, page: number): string {
  const next = new URLSearchParams(query);
  next.set("page", String(page));
  return `/content?${next.toString()}`;
}

export default async function ContentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const title = typeof params.title === "string" ? params.title.trim() : "";
  const parentId = typeof params.parentId === "string" ? params.parentId.trim() : "";
  const type = typeof params.type === "string" && contentTypes.includes(params.type as ContentType) ? params.type as ContentType : "";
  const page = positiveInteger(params.page, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = positiveInteger(params.pageSize, 20, 100);
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (title) query.set("title", title);
  if (type) query.set("type", type);
  if (parentId) query.set("parentId", parentId);

  let result;
  try {
    result = await saatCmsRequest<PageResponse<CmsContent>>(`/api/v1/cms/content?${query}`);
  } catch (error) {
    return <div className="space-y-8"><PageHeading eyebrow="Catalog" title="Content library" description="Manage the hierarchy and inheritance-aware metadata stored by SaatCMS." actions={<Link className="primary-button" href="/content/new"><Plus className="h-4 w-4" /> Create content</Link>} /><ApiErrorCard error={error} title="Content could not be loaded" /></div>;
  }

  const lastPage = Math.max(1, Math.ceil(result.data.total / result.data.pageSize));
  return (
    <div className="space-y-8">
      <PageHeading eyebrow="Catalog" title="Content library" description="Manage the hierarchy and inheritance-aware metadata stored by SaatCMS." actions={<Link className="primary-button" href="/content/new"><Plus className="h-4 w-4" /> Create content</Link>} />
      {params.deleted === "true" && <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">The leaf content record was deleted.</div>}
      <form className="panel grid gap-3 rounded-2xl p-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)_7rem_auto]" method="get">
        <label className="relative"><span className="sr-only">Search by title</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input className="field !pl-10" name="title" defaultValue={title} placeholder="Search titles" /></label>
        <label><span className="sr-only">Content type</span><select className="field" name="type" defaultValue={type}>{["", ...contentTypes].map((value) => <option key={value || "all"} value={value}>{value || "All content types"}</option>)}</select></label>
        <label><span className="sr-only">Parent ID</span><input className="field font-mono text-sm" name="parentId" defaultValue={parentId} placeholder="Parent ID" /></label>
        <label><span className="sr-only">Page size</span><select className="field" name="pageSize" defaultValue={String(pageSize)}><option value="10">10 / page</option><option value="20">20 / page</option><option value="50">50 / page</option><option value="100">100 / page</option></select></label>
        <button className="secondary-button" type="submit">Apply filters</button>
      </form>
      <div className="panel overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4"><div><h2 className="font-semibold text-white">Catalog records</h2><p className="mt-1 text-xs text-slate-500">{result.data.total} total items · page {result.data.page} of {lastPage}</p></div><Clapperboard className="h-5 w-5 text-blue-300" /></div>
        {result.data.items.length === 0 ? <div className="px-5 py-16 text-center"><p className="text-sm text-slate-400">No content matches the current filters.</p><Link className="secondary-button mt-4" href="/content">Clear filters</Link></div> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[62rem] text-left"><thead className="bg-[#0a1525] text-[0.68rem] uppercase tracking-[0.16em] text-slate-500"><tr><th className="px-5 py-3 font-semibold">Title</th><th className="px-5 py-3 font-semibold">Type</th><th className="px-5 py-3 font-semibold">Parent</th><th className="px-5 py-3 font-semibold">Quality</th><th className="px-5 py-3 font-semibold">Premium</th><th className="px-5 py-3 font-semibold">Updated</th><th className="px-5 py-3 font-semibold"><span className="sr-only">Actions</span></th></tr></thead><tbody className="divide-y divide-[var(--border)]">{result.data.items.map((item) => <tr key={item.id} className="text-sm transition hover:bg-white/[0.025]"><td className="px-5 py-4"><Link className="font-medium text-slate-100 hover:text-blue-200" href={`/content/${encodeURIComponent(item.id)}`}>{item.title}</Link><p className="mt-1 font-mono text-[0.68rem] text-slate-600">{item.id}</p></td><td className="px-5 py-4"><span className="rounded-md border border-blue-400/15 bg-blue-400/8 px-2 py-1 text-xs font-semibold text-blue-200">{item.type}</span></td><td className="px-5 py-4 font-mono text-xs text-slate-500">{item.parentId ?? "Root"}</td><td className="px-5 py-4 text-slate-300">{item.quality?.replace("_", " ") ?? <span className="text-slate-600">Inherit</span>}</td><td className="px-5 py-4 text-slate-400">{item.isPremium === null ? "Inherit" : item.isPremium ? "Yes" : "No"}</td><td className="px-5 py-4 text-slate-500"><time dateTime={item.updatedAt}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.updatedAt))}</time></td><td className="px-5 py-4"><Link className="secondary-button !min-h-0 !px-2.5 !py-2" href={`/content/${encodeURIComponent(item.id)}`}><Eye className="h-4 w-4" /> View</Link></td></tr>)}</tbody></table></div>
        )}
        {result.data.total > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4 text-sm text-slate-500"><p>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, result.data.total)} of {result.data.total}</p><div className="flex gap-2">{page > 1 ? <Link className="secondary-button" href={listHref(query, page - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Link> : <span className="secondary-button pointer-events-none opacity-40"><ChevronLeft className="h-4 w-4" /> Previous</span>}{page < lastPage ? <Link className="secondary-button" href={listHref(query, page + 1)}>Next <ChevronRight className="h-4 w-4" /></Link> : <span className="secondary-button pointer-events-none opacity-40">Next <ChevronRight className="h-4 w-4" /></span>}</div></div>}
      </div>
    </div>
  );
}
