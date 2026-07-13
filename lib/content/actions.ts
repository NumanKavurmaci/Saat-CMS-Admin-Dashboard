"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saatCmsRequest, SaatCmsApiError } from "@/lib/api";
import type { CmsContent } from "@/lib/types";
import {
  readContentFormData,
  validateAndMapContent,
  type ContentMutationState,
} from "@/lib/content/model";

const unexpectedError: ContentMutationState = {
  status: "error",
  errorCode: "UNEXPECTED_ERROR",
  errors: { form: "The dashboard could not complete this content request." },
};

function apiErrorState(error: unknown): ContentMutationState {
  if (!(error instanceof SaatCmsApiError)) return unexpectedError;
  const hasChildren = error.errorCode === "CONTENT_HAS_CHILDREN";
  return {
    status: "error",
    errorCode: error.errorCode,
    requestId: error.requestId,
    conflict: error.errorCode === "CONTENT_WRITE_CONFLICT",
    errors: {
      form: hasChildren
        ? "This item has children. Remove or move every child before deleting it; recursive deletion is not available."
        : error.message,
    },
  };
}

export async function createContentAction(
  _previous: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const values = readContentFormData(formData);
  const mapped = validateAndMapContent(values);
  if (!mapped.ok) return { status: "error", errors: mapped.errors, errorCode: "INVALID_CONTENT_INPUT" };

  let created: CmsContent;
  try {
    const result = await saatCmsRequest<CmsContent>("/api/v1/cms/content", {
      method: "POST",
      body: { type: values.type, ...mapped.payload },
    });
    created = result.data;
  } catch (error) {
    return apiErrorState(error);
  }

  revalidatePath("/content");
  redirect(`/content/${encodeURIComponent(created.id)}?saved=created`);
}

export async function updateContentAction(
  _previous: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const id = String(formData.get("id") ?? "").trim();
  const etag = String(formData.get("etag") ?? "").trim();
  if (!id) return { ...unexpectedError, errorCode: "INVALID_CONTENT_ID" };

  const values = readContentFormData(formData);
  const mapped = validateAndMapContent(values);
  if (!mapped.ok) return { status: "error", errors: mapped.errors, errorCode: "INVALID_CONTENT_INPUT" };

  try {
    await saatCmsRequest<CmsContent>(`/api/v1/cms/content/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: mapped.payload,
      ifMatch: etag || null,
    });
  } catch (error) {
    return apiErrorState(error);
  }

  revalidatePath("/content");
  revalidatePath(`/content/${id}`);
  redirect(`/content/${encodeURIComponent(id)}?saved=updated`);
}

export async function deleteContentAction(
  _previous: ContentMutationState,
  formData: FormData,
): Promise<ContentMutationState> {
  const id = String(formData.get("id") ?? "").trim();
  const confirmed = formData.get("confirm") === "yes";
  if (!id || !confirmed) {
    return {
      status: "error",
      errorCode: "DELETE_CONFIRMATION_REQUIRED",
      errors: { form: "Confirm this leaf deletion before continuing." },
    };
  }

  try {
    await saatCmsRequest<void>(`/api/v1/cms/content/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    return apiErrorState(error);
  }

  revalidatePath("/content");
  redirect("/content?deleted=true");
}
