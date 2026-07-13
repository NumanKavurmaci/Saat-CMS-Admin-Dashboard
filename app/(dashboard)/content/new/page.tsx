import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApiErrorCard } from "@/components/api-error-card";
import { PageHeading } from "@/components/page-heading";
import { ContentForm } from "@/components/content/content-form";
import { ParentSearch } from "@/components/content/parent-search";
import { saatCmsRequest } from "@/lib/api";
import { formValuesFromContent } from "@/lib/content/model";
import type { CmsContent, PageResponse } from "@/lib/types";

export const metadata: Metadata = { title: "Create content" };

export default async function NewContentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const parentSearch = typeof params.parentSearch === "string" ? params.parentSearch.trim() : "";
  const suffix = parentSearch ? `&title=${encodeURIComponent(parentSearch)}` : "";
  let series;
  let seasons;
  try {
    [series, seasons] = await Promise.all([
      saatCmsRequest<PageResponse<CmsContent>>(`/api/v1/cms/content?type=SERIES&page=1&pageSize=100${suffix}`),
      saatCmsRequest<PageResponse<CmsContent>>(`/api/v1/cms/content?type=SEASON&page=1&pageSize=100${suffix}`),
    ]);
  } catch (error) {
    return <div className="space-y-8"><PageHeading eyebrow="Catalog" title="Create content" description="Add a new record to the SaatCMS hierarchy." /><ApiErrorCard error={error} title="Eligible parents could not be loaded" /></div>;
  }
  const parentCatalogIsLarge = series.data.total > 100 || seasons.data.total > 100;
  return (
    <div className="space-y-8">
      <PageHeading eyebrow="Catalog" title="Create content" description="Add a Series, Season, Episode, or Movie with explicit inheritance controls." actions={<Link className="secondary-button" href="/content"><ArrowLeft className="h-4 w-4" /> Content library</Link>} />
      <ParentSearch action="/content/new" value={parentSearch} show={parentCatalogIsLarge} />
      <ContentForm mode="create" initialValues={formValuesFromContent()} seriesParents={series.data.items} seasonParents={seasons.data.items} />
    </div>
  );
}
