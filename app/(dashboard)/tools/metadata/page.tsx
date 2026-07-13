import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { MetadataForm } from "@/app/(dashboard)/tools/metadata/metadata-form";

export const metadata: Metadata = { title: "Metadata Resolver" };

export default function MetadataPage() {
  return <div className="space-y-8"><PageHeading eyebrow="Middleware tools" title="Metadata resolver" description="Trace the public result of inheritance without exposing CMS-only playback data." /><MetadataForm /></div>;
}
