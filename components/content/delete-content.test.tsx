import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeleteContent } from "@/components/content/delete-content";
import { deleteContentAction } from "@/lib/content/actions";

vi.mock("@/lib/content/actions", () => ({
  deleteContentAction: vi.fn(async () => ({ status: "idle" })),
}));

afterEach(cleanup);

describe("DeleteContent", () => {
  it("requires an explicit confirmation and cancel performs no action", () => {
    render(<DeleteContent id="episode-one" title="Final Episode" />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Final Episode");
    expect(screen.getByRole("dialog")).toHaveTextContent("never recursively delete");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(deleteContentAction).not.toHaveBeenCalled();
  });
});
