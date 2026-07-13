"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SaatCmsApiError, saatCmsRequest } from "@/lib/api";
import type { LiveChannel } from "@/lib/types";

export type ChannelActionState = {
  status: "idle" | "error";
  errorCode?: string;
  message?: string;
};

function failure(error: unknown): ChannelActionState {
  if (error instanceof SaatCmsApiError) {
    return { status: "error", errorCode: error.errorCode, message: error.message };
  }
  return { status: "error", errorCode: "UNEXPECTED_ERROR", message: "The channel operation could not be completed." };
}

function channelFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
  };
}

function validate(name: string, slug: string): ChannelActionState | null {
  if (!name) return { status: "error", errorCode: "NAME_REQUIRED", message: "Enter a channel name." };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { status: "error", errorCode: "INVALID_SLUG", message: "Use lowercase letters, numbers, and single hyphens between words." };
  }
  return null;
}

export async function createChannelAction(_: ChannelActionState, formData: FormData): Promise<ChannelActionState> {
  const fields = channelFields(formData);
  const invalid = validate(fields.name, fields.slug);
  if (invalid) return invalid;

  let channel: LiveChannel;
  try {
    channel = (await saatCmsRequest<LiveChannel>("/api/v1/cms/channels", { method: "POST", body: fields })).data;
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/channels");
  redirect(`/channels/${encodeURIComponent(channel.id)}`);
}

export async function updateChannelAction(_: ChannelActionState, formData: FormData): Promise<ChannelActionState> {
  const channelId = String(formData.get("channelId") ?? "");
  const etag = String(formData.get("etag") ?? "");
  const fields = channelFields(formData);
  const invalid = validate(fields.name, fields.slug);
  if (invalid) return invalid;
  if (!channelId || !etag) return { status: "error", errorCode: "STALE_CHANNEL", message: "Reload the channel to get its latest version." };

  try {
    await saatCmsRequest<LiveChannel>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}`, {
      method: "PATCH",
      body: fields,
      ifMatch: etag,
    });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/channels");
  revalidatePath(`/channels/${channelId}`);
  redirect(`/channels/${encodeURIComponent(channelId)}?saved=true`);
}

export async function deleteChannelAction(_: ChannelActionState, formData: FormData): Promise<ChannelActionState> {
  const channelId = String(formData.get("channelId") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  if (!channelId || confirmation !== slug) {
    return { status: "error", errorCode: "CONFIRMATION_REQUIRED", message: "Type the exact channel slug before deleting it." };
  }

  try {
    await saatCmsRequest<void>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}?confirm=true`, { method: "DELETE" });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/channels");
  redirect("/channels?deleted=true");
}
