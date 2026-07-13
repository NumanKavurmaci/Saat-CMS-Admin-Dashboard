import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, Radio } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { ApiErrorCard } from "@/components/api-error-card";
import { saatCmsRequest } from "@/lib/api";
import type { LiveChannel, PageResponse } from "@/lib/types";

export const metadata: Metadata = { title: "EPG Schedule" };

export default async function EpgPage() {
  let result;
  try {
    result = await saatCmsRequest<PageResponse<LiveChannel>>("/api/v1/cms/channels?page=1&pageSize=100");
  } catch (error) {
    return <div className="space-y-8"><PageHeading eyebrow="Programming" title="EPG schedule" description="Choose a channel to manage its chronological day schedule." /><ApiErrorCard error={error} title="Channels could not be loaded" /></div>;
  }
  return <div className="space-y-8">
    <PageHeading eyebrow="Programming" title="EPG schedule" description="Choose a channel to manage its chronological day schedule." />
    {result.data.items.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{result.data.items.map((channel) => <Link key={channel.id} className="panel group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-blue-400/30" href={`/channels/${encodeURIComponent(channel.id)}/epg`}><div className="flex items-center justify-between"><span className="rounded-xl border border-blue-400/15 bg-blue-400/8 p-2.5 text-blue-300"><Radio className="h-5 w-5" /></span><CalendarRange className="h-5 w-5 text-slate-600 transition group-hover:text-blue-300" /></div><h2 className="mt-5 font-semibold text-white">{channel.name}</h2><p className="mt-1 font-mono text-xs text-slate-500">/{channel.slug}</p></Link>)}</div> : <div className="panel rounded-2xl px-6 py-16 text-center"><CalendarRange className="mx-auto h-8 w-8 text-blue-300" /><h2 className="mt-5 text-lg font-semibold text-white">Create a channel first</h2><p className="mt-2 text-sm text-slate-500">Every EPG schedule belongs to one live channel.</p><Link className="primary-button mt-5" href="/channels/new">New channel</Link></div>}
  </div>;
}
