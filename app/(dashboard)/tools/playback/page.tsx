import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { PlaybackForm } from "@/app/(dashboard)/tools/playback/playback-form";

export const metadata: Metadata = { title: "Playback Tester" };

export default function PlaybackPage() {
  return <div className="space-y-8"><PageHeading eyebrow="Middleware tools" title="Playback gatekeeper" description="Exercise geofencing and premium-device rules without exposing protected asset data on failed requests." /><PlaybackForm /></div>;
}
