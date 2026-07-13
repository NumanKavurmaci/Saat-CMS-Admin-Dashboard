import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MetadataState } from "@/app/(dashboard)/tools/metadata/actions";

const actionState = vi.hoisted(() => ({
  state: { status: "idle" } as MetadataState,
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

vi.mock("@/app/(dashboard)/tools/metadata/actions", () => ({
  resolveMetadataAction: vi.fn(),
}));

import { MetadataForm } from "@/app/(dashboard)/tools/metadata/metadata-form";

describe("MetadataForm", () => {
  beforeEach(() => {
    actionState.state = { status: "idle" };
    actionState.pending = false;
    actionState.action.mockReset();
  });

  it("starts with a seeded Content ID and explains the empty result", () => {
    render(<MetadataForm />);

    expect(screen.getByLabelText("Content ID")).toHaveValue(
      "episode-galactic-odyssey-s1e2",
    );
    expect(screen.getByText("Enter a seeded Content ID to inspect inheritance.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Resolve metadata" })).toBeEnabled();
  });

  it("renders a resolver failure as an alert", () => {
    actionState.state = {
      status: "error",
      errorCode: "CONTENT_NOT_FOUND",
      message: "Content does not exist.",
    };

    render(<MetadataForm />);

    expect(screen.getByRole("alert")).toHaveTextContent("CONTENT_NOT_FOUND");
    expect(screen.getByRole("alert")).toHaveTextContent("Content does not exist.");
  });

  it("renders inherited metadata while keeping protected playback details absent", () => {
    actionState.state = {
      status: "success",
      data: {
        contentId: "episode-one",
        type: "EPISODE",
        title: "The First Episode",
        parentalRating: "PG-13",
        genre: "Science Fiction",
        quality: "HD",
        isPremium: true,
        geoBlockCountries: ["US", "CA"],
      },
    };

    render(<MetadataForm />);

    expect(screen.getByRole("heading", { name: "The First Episode" })).toBeVisible();
    expect(screen.getByText("PG-13")).toBeVisible();
    expect(screen.getByText("Science Fiction")).toBeVisible();
    expect(screen.getByText("US, CA")).toBeVisible();
    expect(screen.queryByText(/playback\.example/i)).not.toBeInTheDocument();
  });

  it("disables another resolution while a request is pending", () => {
    actionState.pending = true;

    render(<MetadataForm />);

    expect(screen.getByRole("button", { name: /Resolving/ })).toBeDisabled();
  });
});
