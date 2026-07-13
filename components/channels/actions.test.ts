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
  createChannelAction,
  deleteChannelAction,
  updateChannelAction,
} from "@/components/channels/actions";
import { SaatCmsApiError } from "@/lib/api";

const idle = { status: "idle" as const };

function form(values: Record<string, string>) {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
}

describe("channel actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.saatCmsRequest.mockResolvedValue({
      data: { id: "channel-1" },
      etag: null,
      requestId: null,
      status: 200,
    });
  });

  it.each([
    [{ name: "  ", slug: "saat-news" }, "NAME_REQUIRED"],
    [{ name: "Saat News", slug: "Saat News" }, "INVALID_SLUG"],
    [{ name: "Saat News", slug: "double--hyphen" }, "INVALID_SLUG"],
  ])("validates channel fields before creating", async (values, errorCode) => {
    await expect(createChannelAction(idle, form(values))).resolves.toMatchObject({
      status: "error",
      errorCode,
    });
    expect(mocks.saatCmsRequest).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("normalizes fields, creates a channel, and redirects to its detail", async () => {
    mocks.saatCmsRequest.mockResolvedValueOnce({ data: { id: "channel/one" } });

    await createChannelAction(idle, form({ name: "  Saat News  ", slug: "SAAT-NEWS" }));

    expect(mocks.saatCmsRequest).toHaveBeenCalledWith("/api/v1/cms/channels", {
      method: "POST",
      body: { name: "Saat News", slug: "saat-news" },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/channels");
    expect(mocks.redirect).toHaveBeenCalledWith("/channels/channel%2Fone");
  });

  it("requires the current channel identifier and ETag before updating", async () => {
    await expect(updateChannelAction(idle, form({
      channelId: "channel-1",
      etag: "",
      name: "Saat News",
      slug: "saat-news",
    }))).resolves.toMatchObject({ errorCode: "STALE_CHANNEL" });
    expect(mocks.saatCmsRequest).not.toHaveBeenCalled();
  });

  it("forwards the ETag and refreshes both channel views after an update", async () => {
    await updateChannelAction(idle, form({
      channelId: "channel/one",
      etag: "\"channel-v3\"",
      name: "Saat News HD",
      slug: "saat-news-hd",
    }));

    expect(mocks.saatCmsRequest).toHaveBeenCalledWith(
      "/api/v1/cms/channels/channel%2Fone",
      {
        method: "PATCH",
        body: { name: "Saat News HD", slug: "saat-news-hd" },
        ifMatch: "\"channel-v3\"",
      },
    );
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/channels");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/channels/channel/one");
    expect(mocks.redirect).toHaveBeenCalledWith("/channels/channel%2Fone?saved=true");
  });

  it("preserves a backend write-conflict error for the form", async () => {
    mocks.saatCmsRequest.mockRejectedValueOnce(new SaatCmsApiError({
      status: 412,
      errorCode: "LIVE_CHANNEL_WRITE_CONFLICT",
      message: "The channel changed while you were editing it.",
      requestId: "request-conflict",
    }));

    await expect(updateChannelAction(idle, form({
      channelId: "channel-1",
      etag: "\"old\"",
      name: "Edited name",
      slug: "edited-name",
    }))).resolves.toEqual({
      status: "error",
      errorCode: "LIVE_CHANNEL_WRITE_CONFLICT",
      message: "The channel changed while you were editing it.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("requires the exact slug before deleting", async () => {
    await expect(deleteChannelAction(idle, form({
      channelId: "channel-1",
      slug: "saat-news",
      confirmation: "Saat News",
    }))).resolves.toMatchObject({ errorCode: "CONFIRMATION_REQUIRED" });
    expect(mocks.saatCmsRequest).not.toHaveBeenCalled();
  });

  it("uses the explicit cascade confirmation flag when deleting", async () => {
    await deleteChannelAction(idle, form({
      channelId: "channel/one",
      slug: "saat-news",
      confirmation: "saat-news",
    }));

    expect(mocks.saatCmsRequest).toHaveBeenCalledWith(
      "/api/v1/cms/channels/channel%2Fone?confirm=true",
      { method: "DELETE" },
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/channels");
    expect(mocks.redirect).toHaveBeenCalledWith("/channels?deleted=true");
  });
});
