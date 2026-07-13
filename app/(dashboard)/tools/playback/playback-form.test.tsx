import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlaybackState } from "@/app/(dashboard)/tools/playback/actions";

const actionState = vi.hoisted(() => ({
  state: { status: "idle" } as PlaybackState,
  action: vi.fn(),
  pending: false,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    useActionState: vi.fn(() => [actionState.state, actionState.action, actionState.pending]),
  };
});

vi.mock("@/app/(dashboard)/tools/playback/actions", () => ({
  testPlaybackAction: vi.fn(),
}));

import { PlaybackForm } from "@/app/(dashboard)/tools/playback/playback-form";

const protectedUrl = "https://media.example.test/protected/episode-one.m3u8";

const allowedPlayback = {
  contentId: "episode-one",
  requestContext: {
    userId: "reviewer-001",
    userCountry: "TR",
    deviceType: "Web" as const,
  },
  playback: { playbackUrl: protectedUrl },
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

describe("PlaybackForm", () => {
  beforeEach(() => {
    actionState.state = { status: "idle" };
    actionState.pending = false;
    actionState.action.mockReset();
  });

  it("collects the full playback context with supported device options", () => {
    render(<PlaybackForm />);

    expect(screen.getByLabelText("Content ID")).toHaveValue(
      "episode-galactic-odyssey-s1e2",
    );
    expect(screen.getByLabelText("User ID")).toHaveValue("reviewer-001");
    expect(screen.getByLabelText("Country")).toHaveValue("TR");
    expect(screen.getByLabelText("Device")).toHaveValue("Web");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Web",
      "SmartTV",
      "Mobile",
    ]);
  });

  it("never renders a protected URL for a blocked playback decision", () => {
    actionState.state = {
      status: "error",
      errorCode: "GEO_BLOCKED",
      message: "Playback is unavailable in this country.",
      data: allowedPlayback,
    };

    render(<PlaybackForm />);

    expect(screen.getByText("GEO_BLOCKED")).toBeVisible();
    expect(screen.getByText("No playback URL or protected asset details were returned.")).toBeVisible();
    expect(screen.queryByText(protectedUrl)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(protectedUrl);
  });

  it("renders the protected URL and request metadata only after authorization succeeds", () => {
    actionState.state = { status: "success", data: allowedPlayback };

    render(<PlaybackForm />);

    expect(screen.getByText("Playback allowed")).toBeVisible();
    expect(screen.getByText(protectedUrl)).toBeVisible();
    expect(screen.getByText("The First Episode")).toBeVisible();
    expect(screen.getByText("TR")).toBeVisible();
    expect(screen.getAllByText("Web")).toHaveLength(2);
  });

  it("prevents duplicate authorization requests while one is pending", () => {
    actionState.pending = true;

    render(<PlaybackForm />);

    expect(screen.getByRole("button", { name: /Running checks/ })).toBeDisabled();
  });
});
