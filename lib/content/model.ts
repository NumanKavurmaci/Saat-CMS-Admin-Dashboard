import type { CmsContent, ContentType, VideoQuality } from "@/lib/types";

export type ResolvedContentMetadata = {
  contentId: string;
  type: ContentType;
  title: string;
  parentalRating: string | null;
  genre: string | null;
  quality: VideoQuality | null;
  isPremium: boolean | null;
  geoBlockCountries: string[];
};

export type ContentParentOption = Pick<CmsContent, "id" | "title" | "type">;

export type ContentFormValues = {
  type: ContentType;
  title: string;
  parentId: string;
  parentalRating: string;
  genre: string;
  quality: "" | VideoQuality;
  premium: "inherit" | "yes" | "no";
  playbackUrl: string;
  geoBlockCountriesOverride: boolean;
  geoBlockCountries: string;
};

export type ContentFormErrors = Partial<Record<keyof ContentFormValues | "form", string>>;

export type ContentMutationState = {
  status: "idle" | "error";
  errors?: ContentFormErrors;
  errorCode?: string;
  requestId?: string | null;
  conflict?: boolean;
};

export type ContentMutationPayload = {
  title: string;
  parentId: string | null;
  parentalRating: string | null;
  genre: string | null;
  quality: VideoQuality | null;
  isPremium: boolean | null;
  playbackUrl: string | null;
  geoBlockCountriesOverride: boolean;
  geoBlockCountries?: string[];
};

export const contentTypes: ContentType[] = ["SERIES", "SEASON", "EPISODE", "MOVIE"];
export const videoQualities: VideoQuality[] = ["SD", "HD", "UHD_4K"];

export function formValuesFromContent(content?: CmsContent): ContentFormValues {
  return {
    type: content?.type ?? "SERIES",
    title: content?.title ?? "",
    parentId: content?.parentId ?? "",
    parentalRating: content?.parentalRating ?? "",
    genre: content?.genre ?? "",
    quality: content?.quality ?? "",
    premium: content?.isPremium === null || content?.isPremium === undefined
      ? "inherit"
      : content.isPremium
        ? "yes"
        : "no",
    playbackUrl: content?.playbackUrl ?? "",
    geoBlockCountriesOverride: content?.geoBlockCountriesOverride ?? false,
    geoBlockCountries: content?.geoBlockCountries.join(", ") ?? "",
  };
}

export function readContentFormData(formData: FormData): ContentFormValues {
  return {
    type: String(formData.get("type") ?? "") as ContentType,
    title: String(formData.get("title") ?? ""),
    parentId: String(formData.get("parentId") ?? ""),
    parentalRating: String(formData.get("parentalRating") ?? ""),
    genre: String(formData.get("genre") ?? ""),
    quality: String(formData.get("quality") ?? "") as ContentFormValues["quality"],
    premium: String(formData.get("premium") ?? "inherit") as ContentFormValues["premium"],
    playbackUrl: String(formData.get("playbackUrl") ?? ""),
    geoBlockCountriesOverride: formData.get("geoBlockCountriesOverride") === "on",
    geoBlockCountries: String(formData.get("geoBlockCountries") ?? ""),
  };
}

function nullableText(value: string): string | null {
  const normalized = value.trim();
  return normalized || null;
}

export function validateAndMapContent(values: ContentFormValues):
  | { ok: true; payload: ContentMutationPayload }
  | { ok: false; errors: ContentFormErrors } {
  const errors: ContentFormErrors = {};
  const title = values.title.trim();
  const parentId = values.parentId.trim();

  if (!contentTypes.includes(values.type)) errors.type = "Choose a supported content type.";
  if (!title) errors.title = "Title is required.";
  if (!videoQualities.includes(values.quality as VideoQuality) && values.quality !== "") {
    errors.quality = "Choose a supported quality or inherit it.";
  }
  if (!["inherit", "yes", "no"].includes(values.premium)) {
    errors.premium = "Choose inherit, yes, or no.";
  }

  if (values.type === "SEASON" && !parentId) errors.parentId = "A Season must have a Series parent.";
  if (values.type === "EPISODE" && !parentId) errors.parentId = "An Episode must have a Season parent.";

  const countries = Array.from(new Set(
    values.geoBlockCountries
      .split(/[\s,]+/)
      .map((country) => country.trim().toUpperCase())
      .filter(Boolean),
  ));
  if (values.geoBlockCountriesOverride) {
    const invalidCountries = countries.filter((country) => !/^[A-Z]{2}$/.test(country));
    if (invalidCountries.length > 0) {
      errors.geoBlockCountries = `Use two-letter country codes. Invalid: ${invalidCountries.join(", ")}.`;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const payload: ContentMutationPayload = {
    title,
    parentId: values.type === "SEASON" || values.type === "EPISODE" ? parentId : null,
    parentalRating: nullableText(values.parentalRating),
    genre: nullableText(values.genre),
    quality: values.quality || null,
    isPremium: values.premium === "inherit" ? null : values.premium === "yes",
    playbackUrl: nullableText(values.playbackUrl),
    geoBlockCountriesOverride: values.geoBlockCountriesOverride,
  };
  if (values.geoBlockCountriesOverride) payload.geoBlockCountries = countries;

  return { ok: true, payload };
}

export function contentParentType(type: ContentType): ContentType | null {
  if (type === "SEASON") return "SERIES";
  if (type === "EPISODE") return "SEASON";
  return null;
}
