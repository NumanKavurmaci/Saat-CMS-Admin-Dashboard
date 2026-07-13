"use server";

import { saatCmsRequest, SaatCmsApiError } from "@/lib/api";
import type { ContentType, VideoQuality } from "@/lib/types";

export type ResolvedMetadata = {
  contentId: string;
  type: ContentType;
  title: string;
  parentalRating: string | null;
  genre: string | null;
  quality: VideoQuality | null;
  isPremium: boolean | null;
  geoBlockCountries: string[];
};

export type MetadataState = {
  status: "idle" | "success" | "error";
  data?: ResolvedMetadata;
  errorCode?: string;
  message?: string;
};

export async function resolveMetadataAction(_: MetadataState, formData: FormData): Promise<MetadataState> {
  const contentId = String(formData.get("contentId") ?? "").trim();
  if (!contentId) return { status: "error", errorCode: "CONTENT_ID_REQUIRED", message: "Enter a Content ID to resolve." };

  try {
    const result = await saatCmsRequest<ResolvedMetadata>(`/api/v1/mw/content/${encodeURIComponent(contentId)}`, { authenticated: false });
    return { status: "success", data: result.data };
  } catch (error) {
    if (error instanceof SaatCmsApiError) return { status: "error", errorCode: error.errorCode, message: error.message };
    return { status: "error", errorCode: "UNEXPECTED_ERROR", message: "Metadata could not be resolved." };
  }
}
