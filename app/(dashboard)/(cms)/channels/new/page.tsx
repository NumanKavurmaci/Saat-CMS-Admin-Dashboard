import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { ChannelForm } from "@/components/channels/channel-form";

export const metadata: Metadata = { title: "New Channel" };

export default function NewChannelPage() {
  return <div className="space-y-8"><PageHeading eyebrow="Live channels" title="Create a channel" description="Choose the stable name and URL-safe slug that will own this channel’s schedule." /><ChannelForm /></div>;
}
