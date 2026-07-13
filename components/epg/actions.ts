"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SaatCmsApiError, saatCmsRequest } from "@/lib/api";
import type { EpgProgram } from "@/lib/types";
import { isIsoInstant } from "@/components/epg/time";

export type EpgActionState = { status: "idle" | "error"; errorCode?: string; message?: string };

function failure(error: unknown): EpgActionState {
  if (error instanceof SaatCmsApiError) return { status: "error", errorCode: error.errorCode, message: error.message };
  return { status: "error", errorCode: "UNEXPECTED_ERROR", message: "The schedule operation could not be completed." };
}

function schedulePath(channelId: string, formData: FormData) {
  const query = new URLSearchParams();
  for (const key of ["date", "windowStart", "windowEnd"] as const) {
    const value = String(formData.get(key) ?? "");
    if (value) query.set(key, value);
  }
  return `/channels/${encodeURIComponent(channelId)}/epg${query.size ? `?${query}` : ""}`;
}

function readTimes(formData: FormData) {
  return { startTime: String(formData.get("startTime") ?? ""), endTime: String(formData.get("endTime") ?? "") };
}

function validate(programName: string, startTime: string, endTime: string): EpgActionState | null {
  if (!programName) return { status: "error", errorCode: "PROGRAM_NAME_REQUIRED", message: "Enter a program name." };
  if (!isIsoInstant(startTime) || !isIsoInstant(endTime)) return { status: "error", errorCode: "INVALID_DATE_TIME_FORMAT", message: "Enter valid start and end times." };
  if (Date.parse(startTime) >= Date.parse(endTime)) return { status: "error", errorCode: "INVALID_TIME_RANGE", message: "The end time must be later than the start time." };
  return null;
}

export async function createEpgAction(_: EpgActionState, formData: FormData): Promise<EpgActionState> {
  const channelId = String(formData.get("channelId") ?? "");
  const programName = String(formData.get("programName") ?? "").trim();
  const times = readTimes(formData);
  const invalid = validate(programName, times.startTime, times.endTime);
  if (!channelId) return { status: "error", errorCode: "CHANNEL_REQUIRED", message: "Reload the schedule and try again." };
  if (invalid) return invalid;

  try {
    await saatCmsRequest<EpgProgram>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}/epg`, { method: "POST", body: { programName, ...times } });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/channels/${channelId}/epg`);
  redirect(schedulePath(channelId, formData));
}

export async function updateEpgAction(_: EpgActionState, formData: FormData): Promise<EpgActionState> {
  const channelId = String(formData.get("channelId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  const etag = String(formData.get("etag") ?? "");
  const programName = String(formData.get("programName") ?? "").trim();
  const times = readTimes(formData);
  const invalid = validate(programName, times.startTime, times.endTime);
  if (invalid) return invalid;
  if (!channelId || !programId || !etag) return { status: "error", errorCode: "STALE_PROGRAM", message: "Reload the program to get its latest version." };

  const body: Partial<Pick<EpgProgram, "programName" | "startTime" | "endTime">> = {};
  if (programName !== String(formData.get("initialProgramName") ?? "")) body.programName = programName;
  if (times.startTime !== String(formData.get("initialStartTime") ?? "")) body.startTime = times.startTime;
  if (times.endTime !== String(formData.get("initialEndTime") ?? "")) body.endTime = times.endTime;
  if (!Object.keys(body).length) return { status: "error", errorCode: "NO_CHANGES", message: "Change at least one field before saving." };

  try {
    await saatCmsRequest<EpgProgram>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}/epg/${encodeURIComponent(programId)}`, { method: "PATCH", body, ifMatch: etag });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/channels/${channelId}/epg`);
  redirect(schedulePath(channelId, formData));
}

export async function deleteEpgAction(_: EpgActionState, formData: FormData): Promise<EpgActionState> {
  const channelId = String(formData.get("channelId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  if (!channelId || !programId) return { status: "error", errorCode: "PROGRAM_REQUIRED", message: "Reload the schedule and try again." };
  try {
    await saatCmsRequest<void>(`/api/v1/cms/channels/${encodeURIComponent(channelId)}/epg/${encodeURIComponent(programId)}`, { method: "DELETE" });
  } catch (error) {
    return failure(error);
  }
  revalidatePath(`/channels/${channelId}/epg`);
  redirect(schedulePath(channelId, formData));
}
