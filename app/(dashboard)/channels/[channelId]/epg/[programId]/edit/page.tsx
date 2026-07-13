import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { ApiErrorCard } from "@/components/api-error-card";
import { EpgForm } from "@/components/epg/epg-form";
import { isDateKey, isIsoInstant, utcDayWindow } from "@/components/epg/time";
import { saatCmsRequest } from "@/lib/api";
import type { EpgProgram, LiveChannel } from "@/lib/types";

export const metadata: Metadata = { title: "Edit EPG Program" };

export default async function EditEpgProgramPage({ params, searchParams }: { params: Promise<{ channelId: string; programId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { channelId, programId } = await params;
  const query = await searchParams;
  const raw = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  const date = isDateKey(raw("date")) ? raw("date") : new Date().toISOString().slice(0, 10);
  const fallback = utcDayWindow(date);
  const window = { date, windowStart: isIsoInstant(raw("windowStart")) ? raw("windowStart") : fallback.windowStart, windowEnd: isIsoInstant(raw("windowEnd")) ? raw("windowEnd") : fallback.windowEnd };
  const [channelResult, programResult] = await Promise.allSettled([
    saatCmsRequest<LiveChannel>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}`),
    saatCmsRequest<EpgProgram>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}/epg/${encodeURIComponent(programId)}`),
  ]);
  if (channelResult.status === "rejected" || programResult.status === "rejected") return <div className="space-y-8"><PageHeading eyebrow="Programming" title="Edit program" description="Update this schedule entry using its latest version." /><ApiErrorCard error={channelResult.status === "rejected" ? channelResult.reason : programResult.status === "rejected" ? programResult.reason : null} title="Program could not be loaded" /></div>;
  return <div className="space-y-8"><PageHeading eyebrow={channelResult.value.data.name} title={`Edit ${programResult.value.data.programName}`} description="Times are displayed in your local timezone and submitted as exact UTC instants." /><EpgForm channelId={channelId} program={programResult.value.data} etag={programResult.value.etag} window={window} /></div>;
}
