import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Clock3, ExternalLink, Fingerprint, FolderTree } from "lucide-react";
import { ApiErrorCard } from "@/components/api-error-card";
import { ContentForm } from "@/components/content/content-form";
import { DeleteContent } from "@/components/content/delete-content";
import { MetadataPreview } from "@/components/content/metadata-preview";
import { ParentSearch } from "@/components/content/parent-search";
import { PageHeading } from "@/components/page-heading";
import { saatCmsRequest } from "@/lib/api";
import { formValuesFromContent, type ResolvedContentMetadata } from "@/lib/content/model";
import type { CmsContent, PageResponse } from "@/lib/types";

export const metadata: Metadata = { title: "Content detail" };

export default async function ContentDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  const queryParams = await searchParams;
  const parentSearch = typeof queryParams.parentSearch === "string" ? queryParams.parentSearch.trim() : "";
  const encodedId = encodeURIComponent(id);
  const suffix = parentSearch ? `&title=${encodeURIComponent(parentSearch)}` : "";
  const [contentResult, resolvedResult, seriesResult, seasonsResult] = await Promise.allSettled([
    saatCmsRequest<CmsContent>(`/api/v1/cms/content/${encodedId}`),
    saatCmsRequest<ResolvedContentMetadata>(`/api/v1/mw/content/${encodedId}`, { authenticated: false }),
    saatCmsRequest<PageResponse<CmsContent>>(`/api/v1/cms/content?type=SERIES&page=1&pageSize=100${suffix}`),
    saatCmsRequest<PageResponse<CmsContent>>(`/api/v1/cms/content?type=SEASON&page=1&pageSize=100${suffix}`),
  ]);

  if (contentResult.status === "rejected") {
    return <div className="space-y-8"><PageHeading eyebrow="Catalog" title="Content unavailable" description="The requested CMS record could not be loaded." actions={<Link className="secondary-button" href="/content"><ArrowLeft className="h-4 w-4" /> Content library</Link>} /><ApiErrorCard error={contentResult.reason} title="Content could not be loaded" /></div>;
  }
  const content = contentResult.value.data;
  const series = seriesResult.status === "fulfilled" ? seriesResult.value.data : { items: [], page: 1, pageSize: 100, total: 0 };
  const seasons = seasonsResult.status === "fulfilled" ? seasonsResult.value.data : { items: [], page: 1, pageSize: 100, total: 0 };
  const parentCatalogIsLarge = series.total > 100 || seasons.total > 100;

  return (
    <div className="space-y-8">
      <PageHeading eyebrow={content.type} title={content.title} description="Review raw CMS values, compare resolved metadata, and safely update this record." actions={<><Link className="secondary-button" href="/content"><ArrowLeft className="h-4 w-4" /> Content library</Link><DeleteContent id={content.id} title={content.title} /></>} />
      {(queryParams.saved === "created" || queryParams.saved === "updated") && <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">Content {queryParams.saved === "created" ? "created" : "updated"} successfully. The form now reflects the latest backend version.</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] bg-[#0a1526] p-4"><Fingerprint className="h-4 w-4 text-blue-300" /><p className="mt-3 text-[0.68rem] uppercase tracking-wider text-slate-600">Content ID</p><p className="mt-1 break-all font-mono text-xs text-slate-300">{content.id}</p></div>
        <div className="rounded-xl border border-[var(--border)] bg-[#0a1526] p-4"><FolderTree className="h-4 w-4 text-blue-300" /><p className="mt-3 text-[0.68rem] uppercase tracking-wider text-slate-600">Parent</p><p className="mt-1 break-all font-mono text-xs text-slate-300">{content.parentId ?? "Root record"}</p></div>
        <div className="rounded-xl border border-[var(--border)] bg-[#0a1526] p-4"><Clock3 className="h-4 w-4 text-blue-300" /><p className="mt-3 text-[0.68rem] uppercase tracking-wider text-slate-600">Updated</p><p className="mt-1 text-xs text-slate-300"><time dateTime={content.updatedAt}>{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(content.updatedAt))}</time></p></div>
        <div className="rounded-xl border border-[var(--border)] bg-[#0a1526] p-4"><ExternalLink className="h-4 w-4 text-blue-300" /><p className="mt-3 text-[0.68rem] uppercase tracking-wider text-slate-600">Playback asset</p><p className="mt-1 truncate font-mono text-xs text-slate-300" title={content.playbackUrl ?? undefined}>{content.playbackUrl ?? "Inherited / not set"}</p></div>
      </section>

      {resolvedResult.status === "fulfilled" ? <MetadataPreview raw={content} resolved={resolvedResult.value.data} /> : <ApiErrorCard error={resolvedResult.reason} title="Resolved metadata preview could not be loaded" />}
      {(seriesResult.status === "rejected" || seasonsResult.status === "rejected") && <ApiErrorCard error={seriesResult.status === "rejected" ? seriesResult.reason : seasonsResult.status === "rejected" ? seasonsResult.reason : null} title="Some parent choices could not be loaded; exact parent IDs still work" />}
      <ParentSearch action={`/content/${encodedId}`} value={parentSearch} show={parentCatalogIsLarge} />
      <ContentForm mode="edit" initialValues={formValuesFromContent(content)} contentId={content.id} etag={contentResult.value.etag} seriesParents={series.items} seasonParents={seasons.items} />
    </div>
  );
}
