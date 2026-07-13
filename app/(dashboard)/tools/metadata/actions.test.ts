import { beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, saatCmsRequest: request };
});

import { resolveMetadataAction } from "@/app/(dashboard)/tools/metadata/actions";
import { SaatCmsApiError } from "@/lib/api";

function metadataRequest(contentId: string) {
  const formData = new FormData();
  formData.set("contentId", contentId);
  return formData;
}

const metadata = {
  contentId: "episode/one",
  type: "EPISODE" as const,
  title: "The First Episode",
  parentalRating: "PG-13",
  genre: "Science Fiction",
  quality: "HD" as const,
  isPremium: true,
  geoBlockCountries: ["US"],
};

describe("resolveMetadataAction", () => {
  beforeEach(() => {
    request.mockReset();
  });

  it("validates the Content ID before calling the API", async () => {
    await expect(resolveMetadataAction({ status: "idle" }, metadataRequest("  "))).resolves.toEqual({
      status: "error",
      errorCode: "CONTENT_ID_REQUIRED",
      message: "Enter a Content ID to resolve.",
    });
    expect(request).not.toHaveBeenCalled();
  });

  it("encodes the Content ID and returns public resolved metadata", async () => {
    request.mockResolvedValue({ data: metadata });

    await expect(resolveMetadataAction({ status: "idle" }, metadataRequest(" episode/one "))).resolves.toEqual({
      status: "success",
      data: metadata,
    });
    expect(request).toHaveBeenCalledWith("/api/v1/mw/content/episode%2Fone", {
      authenticated: false,
    });
  });

  it("preserves a structured API error for the resolver UI", async () => {
    request.mockRejectedValue(
      new SaatCmsApiError({
        status: 404,
        errorCode: "CONTENT_NOT_FOUND",
        message: "Content does not exist.",
        requestId: "request-404",
      }),
    );

    await expect(resolveMetadataAction({ status: "idle" }, metadataRequest("missing"))).resolves.toEqual({
      status: "error",
      errorCode: "CONTENT_NOT_FOUND",
      message: "Content does not exist.",
    });
  });

  it("uses a safe message for an unexpected failure", async () => {
    request.mockRejectedValue(new Error("internal detail"));

    await expect(resolveMetadataAction({ status: "idle" }, metadataRequest("episode-one"))).resolves.toEqual({
      status: "error",
      errorCode: "UNEXPECTED_ERROR",
      message: "Metadata could not be resolved.",
    });
  });
});
