import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { ApiErrorCard } from "@/components/api-error-card";
import { ChannelForm } from "@/components/channels/channel-form";
import { DeleteChannelForm } from "@/components/channels/delete-channel-form";
import { saatCmsRequest } from "@/lib/api";
import type { LiveChannel } from "@/lib/types";

export const metadata: Metadata = { title: "Channel Detail" };

export default async function ChannelDetailPage({ params, searchParams }: { params: Promise<{ channelId: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { channelId } = await params;
  let result;
  try {
    result = await saatCmsRequest<LiveChannel>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}`);
  } catch (error) {
    return <div className="space-y-8"><PageHeading eyebrow="Live channels" title="Channel detail" description="Edit the channel identity or open its program schedule." /><ApiErrorCard error={error} title="Channel could not be loaded" /></div>;
  }
  const query = await searchParams;
  return (
    <div className="space-y-8">
      <PageHeading eyebrow="Live channels" title={result.data.name} description={`/${result.data.slug} · ${result.data.id}`} actions={<Link className="primary-button" href={`/channels/${encodeURIComponent(channelId)}/epg`}><CalendarRange className="h-4 w-4" />Open EPG</Link>} />
      {query.saved === "true" && <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4 text-sm text-emerald-200">Channel changes saved.</div>}
      <ChannelForm channel={result.data} etag={result.etag} />
      <DeleteChannelForm channel={result.data} />
    </div>
  );
}
