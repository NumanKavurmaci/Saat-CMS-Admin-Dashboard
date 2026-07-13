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
  createContentAction,
  deleteContentAction,
  updateContentAction,
} from "@/lib/content/actions";
import { SaatCmsApiError } from "@/lib/api";

const idle = { status: "idle" as const };

function form(values: Record<string, string> = {}) {
  const data = new FormData();
  Object.entries({
    type: "SERIES",
    title: "Galactic Odyssey",
    parentId: "",
    parentalRating: "",
    genre: "",
    quality: "",
    premium: "inherit",
    playbackUrl: "",
    geoBlockCountries: "",
    ...values,
  }).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("content actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saatCmsRequest.mockResolvedValue({
      data: { id: "content-1" },
      etag: null,
      requestId: null,
      status: 200,
    });
  });

  it("returns validation errors before creating content", async () => {
    await expect(createContentAction(idle, form({ title: "  " }))).resolves.toMatchObject({
      status: "error",
      errorCode: "INVALID_CONTENT_INPUT",
      errors: { title: expect.any(String) },
    });
    expect(mocks.saatCmsRequest).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("creates mapped content and redirects to its encoded detail URL", async () => {
    mocks.saatCmsRequest.mockResolvedValueOnce({ data: { id: "series/one" } });
    const data = form({
      title: "  Galactic Odyssey  ",
      premium: "no",
      quality: "UHD_4K",
      geoBlockCountriesOverride: "on",
      geoBlockCountries: "tr, DE",
    });

    await createContentAction(idle, data);

    expect(mocks.saatCmsRequest).toHaveBeenCalledWith("/api/v1/cms/content", {
      method: "POST",
      body: {
        type: "SERIES",
        title: "Galactic Odyssey",
        parentId: null,
        parentalRating: null,
        genre: null,
        quality: "UHD_4K",
        isPremium: false,
        playbackUrl: null,
        geoBlockCountriesOverride: true,
        geoBlockCountries: ["TR", "DE"],
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/content");
    expect(mocks.redirect).toHaveBeenCalledWith("/content/series%2Fone?saved=created");
  });

  it("rejects an update without a content identifier", async () => {
    await expect(updateContentAction(idle, form({ id: "" }))).resolves.toMatchObject({
      status: "error",
      errorCode: "INVALID_CONTENT_ID",
    });
    expect(mocks.saatCmsRequest).not.toHaveBeenCalled();
  });

  it("updates mapped content with its ETag and refreshes both content views", async () => {
    await updateContentAction(idle, form({
      id: "episode/one",
      etag: "\"content-v3\"",
      type: "EPISODE",
      title: "Finale",
      parentId: "season-1",
    }));

    expect(mocks.saatCmsRequest).toHaveBeenCalledWith(
      "/api/v1/cms/content/episode%2Fone",
      expect.objectContaining({
        method: "PATCH",
        ifMatch: "\"content-v3\"",
        body: expect.objectContaining({ title: "Finale", parentId: "season-1" }),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/content");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/content/episode/one");
    expect(mocks.redirect).toHaveBeenCalledWith("/content/episode%2Fone?saved=updated");
  });

  it("preserves conflict details returned by the backend", async () => {
    mocks.saatCmsRequest.mockRejectedValueOnce(new SaatCmsApiError({
      status: 412,
      errorCode: "CONTENT_WRITE_CONFLICT",
      message: "This content changed while you were editing it.",
      requestId: "request-conflict",
    }));

    await expect(updateContentAction(idle, form({
      id: "content-1",
      etag: "\"old\"",
    }))).resolves.toEqual({
      status: "error",
      errorCode: "CONTENT_WRITE_CONFLICT",
      requestId: "request-conflict",
      conflict: true,
      errors: { form: "This content changed while you were editing it." },
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation before deleting", async () => {
    await expect(deleteContentAction(idle, form({ id: "content-1" }))).resolves.toMatchObject({
      status: "error",
      errorCode: "DELETE_CONFIRMATION_REQUIRED",
    });
    expect(mocks.saatCmsRequest).not.toHaveBeenCalled();
  });

  it("explains that parent records cannot be recursively deleted", async () => {
    mocks.saatCmsRequest.mockRejectedValueOnce(new SaatCmsApiError({
      status: 409,
      errorCode: "CONTENT_HAS_CHILDREN",
      message: "Content has children.",
      requestId: "request-children",
    }));

    await expect(deleteContentAction(idle, form({
      id: "series-1",
      confirm: "yes",
    }))).resolves.toMatchObject({
      errorCode: "CONTENT_HAS_CHILDREN",
      requestId: "request-children",
      errors: { form: expect.stringContaining("recursive deletion is not available") },
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("deletes a confirmed leaf and returns to the content catalog", async () => {
    await deleteContentAction(idle, form({ id: "episode/one", confirm: "yes" }));

    expect(mocks.saatCmsRequest).toHaveBeenCalledWith(
      "/api/v1/cms/content/episode%2Fone",
      { method: "DELETE" },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/content");
    expect(mocks.redirect).toHaveBeenCalledWith("/content?deleted=true");
  });

  it("normalizes unexpected failures without leaking their message", async () => {
    mocks.saatCmsRequest.mockRejectedValueOnce(new Error("database password"));

    await expect(createContentAction(idle, form())).resolves.toMatchObject({
      errorCode: "UNEXPECTED_ERROR",
      errors: { form: "The dashboard could not complete this content request." },
    });
  });
});
