import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarRange, Pencil, Plus, Radio, Search } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { ApiErrorCard } from "@/components/api-error-card";
import { saatCmsRequest } from "@/lib/api";
import type { LiveChannel, PageResponse } from "@/lib/types";

export const metadata: Metadata = { title: "Live Channels" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function value(input: string | string[] | undefined, fallback = "") {
  return typeof input === "string" ? input : fallback;
}

function pageHref(page: number, name: string, slug: string, pageSize: number) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (name) query.set("name", name);
  if (slug) query.set("slug", slug);
  return `/channels?${query}`;
}

export default async function ChannelsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const name = value(params.name).trim();
  const slug = value(params.slug).trim().toLowerCase();
  const page = Math.max(1, Number.parseInt(value(params.page, "1"), 10) || 1);
  const requestedPageSize = Number.parseInt(value(params.pageSize, "20"), 10) || 20;
  const pageSize = Math.min(100, Math.max(1, requestedPageSize));
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (name) query.set("name", name);
  if (slug) query.set("slug", slug);

  let result;
  try {
    result = await saatCmsRequest<PageResponse<LiveChannel>>(`/api/v1/cms/channels?${query}`);
  } catch (error) {
    return <div className="space-y-8"><PageHeading eyebrow="Linear television" title="Live channels" description="Create the channel identities that own EPG schedules." actions={<Link className="primary-button" href="/channels/new"><Plus className="h-4 w-4" />New channel</Link>} /><ApiErrorCard error={error} title="Channels could not be loaded" /></div>;
  }

  const hasPrevious = result.data.page > 1;
  const hasNext = result.data.page * result.data.pageSize < result.data.total;

  return (
    <div className="space-y-8">
      <PageHeading eyebrow="Linear television" title="Live channels" description="Create channel identities, edit their slugs, and open their EPG schedules." actions={<Link className="primary-button" href="/channels/new"><Plus className="h-4 w-4" />New channel</Link>} />
      {params.deleted === "true" && <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200">Channel and its complete schedule were deleted.</div>}
      <form className="panel grid gap-3 rounded-2xl p-4 sm:grid-cols-[1fr_1fr_auto]" method="get">
        <label className="relative"><span className="sr-only">Search channel names</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input className="field !pl-10" name="name" defaultValue={name} placeholder="Channel name" /></label>
        <label><span className="sr-only">Filter by slug</span><input className="field" name="slug" defaultValue={slug} placeholder="Slug" /></label>
        <button className="secondary-button" type="submit">Apply filters</button>
      </form>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {result.data.items.map((channel) => (
          <article key={channel.id} className="panel rounded-2xl p-5">
            <div className="flex items-start justify-between"><span className="rounded-xl border border-blue-400/15 bg-blue-400/8 p-2.5 text-blue-300"><Radio className="h-5 w-5" /></span><span className="text-xs text-slate-500">Updated {new Date(channel.updatedAt).toLocaleDateString()}</span></div>
            <h2 className="mt-5 text-lg font-semibold text-white">{channel.name}</h2><p className="mt-1 font-mono text-xs text-slate-500">/{channel.slug}</p>
            <div className="mt-5 flex gap-2 border-t border-[var(--border)] pt-4"><Link className="secondary-button flex-1" href={`/channels/${encodeURIComponent(channel.id)}`}><Pencil className="h-4 w-4" />Edit</Link><Link className="secondary-button flex-1" href={`/channels/${encodeURIComponent(channel.id)}/epg`}><CalendarRange className="h-4 w-4" />EPG</Link></div>
          </article>
        ))}
      </div>
      {result.data.items.length === 0 && <div className="panel rounded-2xl px-5 py-16 text-center text-sm text-slate-500">No channels match the current filters.</div>}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <p>{result.data.total} channel{result.data.total === 1 ? "" : "s"} · page {result.data.page}</p>
        <div className="flex gap-2">
          {hasPrevious ? <Link className="secondary-button" href={pageHref(result.data.page - 1, name, slug, pageSize)}><ArrowLeft className="h-4 w-4" />Previous</Link> : <span className="secondary-button pointer-events-none opacity-35"><ArrowLeft className="h-4 w-4" />Previous</span>}
          {hasNext ? <Link className="secondary-button" href={pageHref(result.data.page + 1, name, slug, pageSize)}>Next<ArrowRight className="h-4 w-4" /></Link> : <span className="secondary-button pointer-events-none opacity-35">Next<ArrowRight className="h-4 w-4" /></span>}
        </div>
      </div>
    </div>
  );
}
