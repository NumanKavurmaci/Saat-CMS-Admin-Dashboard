import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { ApiErrorCard } from "@/components/api-error-card";
import { EpgForm } from "@/components/epg/epg-form";
import { isDateKey, isIsoInstant, utcDayWindow } from "@/components/epg/time";
import { saatCmsRequest } from "@/lib/api";
import type { LiveChannel } from "@/lib/types";

export const metadata: Metadata = { title: "Add EPG Program" };

export default async function NewEpgProgramPage({ params, searchParams }: { params: Promise<{ channelId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { channelId } = await params;
  const query = await searchParams;
  const raw = (key: string) => typeof query[key] === "string" ? query[key] as string : "";
  const date = isDateKey(raw("date")) ? raw("date") : new Date().toISOString().slice(0, 10);
  const fallback = utcDayWindow(date);
  const window = { date, windowStart: isIsoInstant(raw("windowStart")) ? raw("windowStart") : fallback.windowStart, windowEnd: isIsoInstant(raw("windowEnd")) ? raw("windowEnd") : fallback.windowEnd };
  let channel;
  try { channel = (await saatCmsRequest<LiveChannel>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}`)).data; }
  catch (error) { return <div className="space-y-8"><PageHeading eyebrow="Programming" title="Add program" description="Create an overlap-safe entry in this schedule." /><ApiErrorCard error={error} title="Channel could not be loaded" /></div>; }
  return <div className="space-y-8"><PageHeading eyebrow={channel.name} title="Add program" description="Enter local wall-clock times; the dashboard will submit exact UTC instants." /><EpgForm channelId={channelId} window={window} /></div>;
}
