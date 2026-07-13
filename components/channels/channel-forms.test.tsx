import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const actions = vi.hoisted(() => ({
  createChannelAction: vi.fn(),
  updateChannelAction: vi.fn(),
  deleteChannelAction: vi.fn(),
}));

vi.mock("@/components/channels/actions", () => actions);

import { ChannelForm } from "@/components/channels/channel-form";
import { DeleteChannelForm } from "@/components/channels/delete-channel-form";
import type { LiveChannel } from "@/lib/types";

const channel: LiveChannel = {
  id: "channel-1",
  name: "Saat News",
  slug: "saat-news",
  createdAt: "2026-07-13T00:00:00.000Z",
  updatedAt: "2026-07-13T00:00:00.000Z",
};

describe("channel forms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    actions.createChannelAction.mockResolvedValue({ status: "idle" });
    actions.updateChannelAction.mockResolvedValue({ status: "idle" });
    actions.deleteChannelAction.mockResolvedValue({ status: "idle" });
  });

  it("preserves every submitted create field when the action returns an error", async () => {
    actions.createChannelAction.mockResolvedValueOnce({
      status: "error",
      errorCode: "CHANNEL_SLUG_ALREADY_EXISTS",
      message: "That channel slug is already in use.",
    });
    const { container } = render(<ChannelForm />);

    fireEvent.change(screen.getByLabelText("Channel name"), { target: { value: "Reviewer News" } });
    fireEvent.change(screen.getByLabelText(/^Slug/), { target: { value: "Reviewer News" } });
    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("CHANNEL_SLUG_ALREADY_EXISTS");
    expect(screen.getByLabelText("Channel name")).toHaveValue("Reviewer News");
    expect(screen.getByLabelText(/^Slug/)).toHaveValue("reviewer-news");
    const submitted = actions.createChannelAction.mock.calls[0][1] as FormData;
    expect(submitted.get("name")).toBe("Reviewer News");
    expect(submitted.get("slug")).toBe("reviewer-news");
  });

  it("forwards edit identity fields and offers a reload after a conflict", async () => {
    actions.updateChannelAction.mockResolvedValueOnce({
      status: "error",
      errorCode: "LIVE_CHANNEL_WRITE_CONFLICT",
      message: "Reload the latest channel.",
    });
    const { container } = render(<ChannelForm channel={channel} etag={'"channel-v2"'} />);

    fireEvent.change(screen.getByLabelText("Channel name"), { target: { value: "Saat News HD" } });
    fireEvent.submit(container.querySelector("form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent("LIVE_CHANNEL_WRITE_CONFLICT");
    expect(screen.getByLabelText("Channel name")).toHaveValue("Saat News HD");
    expect(screen.getByRole("link", { name: "Reload latest channel" })).toHaveAttribute("href", "/channels/channel-1");
    expect(container.querySelector('input[name="channelId"]')).toHaveValue("channel-1");
    expect(container.querySelector('input[name="etag"]')).toHaveValue('"channel-v2"');
    await waitFor(() => expect(actions.updateChannelAction).toHaveBeenCalledOnce());
    const submitted = actions.updateChannelAction.mock.calls[0][1] as FormData;
    expect(submitted.get("name")).toBe("Saat News HD");
  });

  it("enables destructive submission only for an exact slug confirmation", () => {
    render(<DeleteChannelForm channel={channel} />);
    const confirmation = screen.getByLabelText(/Type .*saat-news.* to confirm/);
    const button = screen.getByRole("button", { name: "Delete channel" });

    expect(button).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: "Saat-News" } });
    expect(button).toBeDisabled();
    fireEvent.change(confirmation, { target: { value: "saat-news" } });
    expect(button).toBeEnabled();
  });
});
