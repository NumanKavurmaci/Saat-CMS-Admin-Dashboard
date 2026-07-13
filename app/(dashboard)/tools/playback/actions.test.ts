import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, saatCmsRequest: request };
});

import { testPlaybackAction } from "@/app/(dashboard)/tools/playback/actions";
import { SaatCmsApiError } from "@/lib/api";

function playbackRequest(overrides: Record<string, string> = {}) {
  const values = {
    contentId: "episode/one",
    userId: "reviewer-001",
    country: "tr",
    device: "Web",
    ...overrides,
  };
  const formData = new FormData();
  Object.entries(values).forEach(([key, value]) => formData.set(key, value));
  return formData;
}

const playback = {
  contentId: "episode/one",
  requestContext: {
    userId: "reviewer-001",
    userCountry: "TR",
    deviceType: "Web" as const,
  },
  playback: { playbackUrl: "https://media.example.test/episode-one.m3u8" },
  metadata: {
    type: "EPISODE" as const,
    title: "The First Episode",
    parentalRating: "PG-13",
    genre: "Science Fiction",
    quality: "HD" as const,
    isPremium: false,
    geoBlockCountries: [],
  },
};

describe("testPlaybackAction", () => {
  beforeEach(() => {
    request.mockReset();
  });

  it.each([
    ["contentId", ""],
    ["userId", "   "],
    ["country", "TUR"],
    ["country", "1A"],
    ["device", "Console"],
  ])("rejects an invalid %s without making a playback request", async (field, value) => {
    await expect(
      testPlaybackAction({ status: "idle" }, playbackRequest({ [field]: value })),
    ).resolves.toEqual({
      status: "error",
      errorCode: "INVALID_TEST_INPUT",
      message: "Enter a Content ID, User ID, two-letter country, and supported device.",
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("normalizes request context and returns allowed playback data", async () => {
    request.mockResolvedValue({ data: playback });

    await expect(
      testPlaybackAction(
        { status: "idle" },
        playbackRequest({ contentId: " episode/one ", userId: " reviewer-001 ", country: " tr " }),
      ),
    ).resolves.toEqual({ status: "success", data: playback });
    expect(request).toHaveBeenCalledWith("/api/v1/mw/playback/episode%2Fone", {
      authenticated: false,
      headers: {
        "X-User-Id": "reviewer-001",
        "X-User-Country": "TR",
        "X-Device-Type": "Web",
      },
    });
  });

  it("returns a blocked playback decision without fabricating success data", async () => {
    request.mockRejectedValue(
      new SaatCmsApiError({
        status: 403,
        errorCode: "GEO_BLOCKED",
        message: "Playback is unavailable in this country.",
        requestId: "request-403",
      }),
    );

    await expect(testPlaybackAction({ status: "idle" }, playbackRequest())).resolves.toEqual({
      status: "error",
      errorCode: "GEO_BLOCKED",
      message: "Playback is unavailable in this country.",
    });
  });

  it("uses a safe error for an unexpected failure", async () => {
    request.mockRejectedValue(new Error("internal detail"));

    await expect(testPlaybackAction({ status: "idle" }, playbackRequest())).resolves.toEqual({
      status: "error",
      errorCode: "UNEXPECTED_ERROR",
      message: "Playback could not be tested.",
    });
  });
});
