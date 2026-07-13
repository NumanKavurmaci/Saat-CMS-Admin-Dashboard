"use server";

import { saatCmsRequest, SaatCmsApiError } from "@/lib/api";
import type { PlaybackResponse } from "@/lib/types";

export type PlaybackState = {
  status: "idle" | "success" | "error";
  data?: PlaybackResponse;
  errorCode?: string;
  message?: string;
};

export async function testPlaybackAction(_: PlaybackState, formData: FormData): Promise<PlaybackState> {
  const contentId = String(formData.get("contentId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim().toUpperCase();
  const device = String(formData.get("device") ?? "");

  if (!contentId || !userId || !/^[A-Z]{2}$/.test(country) || !["Mobile", "SmartTV", "Web"].includes(device)) {
    return { status: "error", errorCode: "INVALID_TEST_INPUT", message: "Enter a Content ID, User ID, two-letter country, and supported device." };
  }

  try {
    const result = await saatCmsRequest<PlaybackResponse>(`/api/v1/mw/playback/${encodeURIComponent(contentId)}`, {
      authenticated: false,
      headers: { "X-User-Id": userId, "X-User-Country": country, "X-Device-Type": device },
    });
    return { status: "success", data: result.data };
  } catch (error) {
    if (error instanceof SaatCmsApiError) return { status: "error", errorCode: error.errorCode, message: error.message };
    return { status: "error", errorCode: "UNEXPECTED_ERROR", message: "Playback could not be tested." };
  }
}
