import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ParentSearch } from "@/components/content/parent-search";

describe("ParentSearch", () => {
  it("stays hidden when neither the search affordance nor a value is needed", () => {
    const { container } = render(<ParentSearch action="/content/new" value="" show={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders when parent search is available", () => {
    render(<ParentSearch action="/content/new?type=SEASON" value="" show />);

    expect(screen.getByLabelText("Search eligible parents")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Find parents" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("button", { name: "Find parents" }).closest("form")).toHaveAttribute("method", "get");
  });

  it("preserves an active backend search even if the catalog no longer requires the prompt", () => {
    render(<ParentSearch action="/content/episode-1" value="Season Two" show={false} />);

    expect(screen.getByLabelText("Search eligible parents")).toHaveValue("Season Two");
    expect(screen.getByPlaceholderText("Filter Series and Seasons by title")).toHaveAttribute(
      "name",
      "parentSearch",
    );
  });
});
