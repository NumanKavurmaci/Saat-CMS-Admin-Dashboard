import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
  saatCmsRequest: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  saatCmsRequest: mocks.saatCmsRequest,
}));

import {
  createEpgAction,
  deleteEpgAction,
  updateEpgAction,
} from "@/components/epg/actions";
import { SaatCmsApiError } from "@/lib/api";

const idle = { status: "idle" as const };
const windowContext = {
  date: "2026-07-13",
  windowStart: "2026-07-12T21:00:00.000Z",
  windowEnd: "2026-07-13T21:00:00.000Z",
};

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

function programForm(overrides: Record<string, string> = {}) {
  return form({
    channelId: "channel-1",
    programName: "Morning News",
    startTime: "2026-07-13T06:00:00.000Z",
    endTime: "2026-07-13T07:00:00.000Z",
    ...windowContext,
    ...overrides,
  });
}

describe("EPG actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saatCmsRequest.mockResolvedValue({ data: {}, etag: null, requestId: null, status: 200 });
  });

  it.each([
    [{ programName: "  " }, "PROGRAM_NAME_REQUIRED"],
    [{ startTime: "2026-07-13 06:00", endTime: "2026-07-13T07:00:00.000Z" }, "INVALID_DATE_TIME_FORMAT"],
    [{ startTime: "2026-07-13T08:00:00.000Z", endTime: "2026-07-13T07:00:00.000Z" }, "INVALID_TIME_RANGE"],
    [{ startTime: "2026-07-13T07:00:00.000Z", endTime: "2026-07-13T07:00:00.000Z" }, "INVALID_TIME_RANGE"],
  ])("validates a program before creating it", async (overrides, errorCode) => {
    await expect(createEpgAction(idle, programForm(overrides))).resolves.toMatchObject({ errorCode });
    expect(mocks.saatCmsRequest).not.toHaveBeenCalled();
  });

  it("requires a channel even when the program fields are valid", async () => {
    await expect(createEpgAction(idle, programForm({ channelId: "" }))).resolves.toMatchObject({
      errorCode: "CHANNEL_REQUIRED",
    });
  });

  it("creates a program and returns to the exact schedule window", async () => {
    await createEpgAction(idle, programForm({ channelId: "channel/one", programName: "  Morning News  " }));

    expect(mocks.saatCmsRequest).toHaveBeenCalledWith(
      "/api/v1/cms/channels/channel%2Fone/epg",
      {
        method: "POST",
        body: {
          programName: "Morning News",
          startTime: "2026-07-13T06:00:00.000Z",
          endTime: "2026-07-13T07:00:00.000Z",
        },
      },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/channels/channel/one/epg");
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/channels/channel%2Fone/epg?date=2026-07-13&windowStart=2026-07-12T21%3A00%3A00.000Z&windowEnd=2026-07-13T21%3A00%3A00.000Z",
    );
  });

  it("preserves an overlap response and does not leave the form", async () => {
    mocks.saatCmsRequest.mockRejectedValueOnce(new SaatCmsApiError({
      status: 409,
      errorCode: "EPG_SCHEDULE_OVERLAP",
      message: "This program overlaps another schedule entry.",
      requestId: "request-overlap",
    }));

    await expect(createEpgAction(idle, programForm())).resolves.toEqual({
      status: "error",
      errorCode: "EPG_SCHEDULE_OVERLAP",
      message: "This program overlaps another schedule entry.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("requires identifiers and an ETag when updating", async () => {
    await expect(updateEpgAction(idle, programForm({
      programId: "program-1",
      etag: "",
    }))).resolves.toMatchObject({ errorCode: "STALE_PROGRAM" });
    expect(mocks.saatCmsRequest).not.toHaveBeenCalled();
  });

  it("does not send an update when none of the editable fields changed", async () => {
    await expect(updateEpgAction(idle, programForm({
      programId: "program-1",
      etag: "\"program-v1\"",
      initialProgramName: "Morning News",
      initialStartTime: "2026-07-13T06:00:00.000Z",
      initialEndTime: "2026-07-13T07:00:00.000Z",
    }))).resolves.toMatchObject({ errorCode: "NO_CHANGES" });
    expect(mocks.saatCmsRequest).not.toHaveBeenCalled();
  });

  it("sends only changed fields and forwards the current ETag", async () => {
    await updateEpgAction(idle, programForm({
      channelId: "channel/one",
      programId: "program/one",
      etag: "\"program-v2\"",
      programName: "Evening News",
      initialProgramName: "Morning News",
      initialStartTime: "2026-07-13T06:00:00.000Z",
      initialEndTime: "2026-07-13T07:00:00.000Z",
    }));

    expect(mocks.saatCmsRequest).toHaveBeenCalledWith(
      "/api/v1/cms/channels/channel%2Fone/epg/program%2Fone",
      {
        method: "PATCH",
        body: { programName: "Evening News" },
        ifMatch: "\"program-v2\"",
      },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/channels/channel/one/epg");
  });

  it("preserves a stale-write conflict for the edit form", async () => {
    mocks.saatCmsRequest.mockRejectedValueOnce(new SaatCmsApiError({
      status: 412,
      errorCode: "EPG_WRITE_CONFLICT",
      message: "The program changed while you were editing it.",
      requestId: "request-conflict",
    }));

    await expect(updateEpgAction(idle, programForm({
      programId: "program-1",
      etag: "\"old\"",
      programName: "Evening News",
      initialProgramName: "Morning News",
      initialStartTime: "2026-07-13T06:00:00.000Z",
      initialEndTime: "2026-07-13T07:00:00.000Z",
    }))).resolves.toMatchObject({
      errorCode: "EPG_WRITE_CONFLICT",
      message: "The program changed while you were editing it.",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("validates delete identifiers", async () => {
    await expect(deleteEpgAction(idle, form({ channelId: "channel-1" }))).resolves.toMatchObject({
      errorCode: "PROGRAM_REQUIRED",
    });
    expect(mocks.saatCmsRequest).not.toHaveBeenCalled();
  });

  it("deletes a program and preserves the selected schedule window", async () => {
    await deleteEpgAction(idle, form({
      channelId: "channel/one",
      programId: "program/one",
      ...windowContext,
    }));

    expect(mocks.saatCmsRequest).toHaveBeenCalledWith(
      "/api/v1/cms/channels/channel%2Fone/epg/program%2Fone",
      { method: "DELETE" },
    );
    expect(mocks.redirect).toHaveBeenCalledWith(
      "/channels/channel%2Fone/epg?date=2026-07-13&windowStart=2026-07-12T21%3A00%3A00.000Z&windowEnd=2026-07-13T21%3A00%3A00.000Z",
    );
  });
});
