import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { ApiErrorCard } from "@/components/api-error-card";
import { EpgNavigation } from "@/components/epg/epg-navigation";
import { EpgSchedule } from "@/components/epg/epg-schedule";
import { isDateKey, isIsoInstant, utcDayWindow } from "@/components/epg/time";
import { saatCmsRequest } from "@/lib/api";
import type { EpgProgram, LiveChannel, PageResponse } from "@/lib/types";

export const metadata: Metadata = { title: "Channel EPG" };
type Query = Record<string, string | string[] | undefined>;
const text = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

function windowContext(params: Query) {
  const candidateDate = text(params.date);
  const date = isDateKey(candidateDate) ? candidateDate : new Date().toISOString().slice(0, 10);
  const candidateStart = text(params.windowStart);
  const candidateEnd = text(params.windowEnd);
  if (isIsoInstant(candidateStart) && isIsoInstant(candidateEnd) && Date.parse(candidateStart) < Date.parse(candidateEnd)) return { date, windowStart: candidateStart, windowEnd: candidateEnd };
  return { date, ...utcDayWindow(date) };
}

export default async function ChannelEpgPage({ params, searchParams }: { params: Promise<{ channelId: string }>; searchParams: Promise<Query> }) {
  const { channelId } = await params;
  const query = await searchParams;
  const window = windowContext(query);
  const page = Math.max(1, Number.parseInt(text(query.page), 10) || 1);
  const scheduleQuery = new URLSearchParams({ windowStart: window.windowStart, windowEnd: window.windowEnd, page: String(page), pageSize: "100" });
  const [channelResult, channelsResult, scheduleResult] = await Promise.allSettled([
    saatCmsRequest<LiveChannel>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}`),
    saatCmsRequest<PageResponse<LiveChannel>>("/api/v1/cms/channels?page=1&pageSize=100"),
    saatCmsRequest<PageResponse<EpgProgram>>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}/epg?${scheduleQuery}`),
  ]);
  if (channelResult.status === "rejected" || scheduleResult.status === "rejected") {
    return <div className="space-y-8"><PageHeading eyebrow="Programming" title="EPG schedule" description="Inspect and edit one channel’s UTC-backed day schedule." /><ApiErrorCard error={channelResult.status === "rejected" ? channelResult.reason : scheduleResult.status === "rejected" ? scheduleResult.reason : null} title="Schedule could not be loaded" /></div>;
  }
  const channels = channelsResult.status === "fulfilled" ? channelsResult.value.data.items : [channelResult.value.data];
  const formQuery = new URLSearchParams(window);
  const totalPages = Math.ceil(scheduleResult.value.data.total / 100);
  return <div className="space-y-8">
    <PageHeading eyebrow="Programming" title={`${channelResult.value.data.name} schedule`} description={`Programs intersecting ${window.date}. Times are shown locally with UTC values retained for verification.`} actions={<Link className="primary-button" href={`/channels/${encodeURIComponent(channelId)}/epg/new?${formQuery}`}><Plus className="h-4 w-4" />Add program</Link>} />
    <EpgNavigation channels={channels} channelId={channelId} {...window} />
    <EpgSchedule programs={scheduleResult.value.data.items} channelId={channelId} window={window} />
    {totalPages > 1 && <div className="flex items-center justify-between text-sm text-slate-500"><p>{scheduleResult.value.data.total} programs · page {page} of {totalPages}</p><div className="flex gap-2">{page > 1 && <Link className="secondary-button" href={`?${new URLSearchParams({ ...window, page: String(page - 1) })}`}>Previous</Link>}{page < totalPages && <Link className="secondary-button" href={`?${new URLSearchParams({ ...window, page: String(page + 1) })}`}>Next</Link>}</div></div>}
  </div>;
}
