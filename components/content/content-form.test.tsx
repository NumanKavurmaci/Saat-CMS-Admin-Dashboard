import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContentForm } from "@/components/content/content-form";
import { formValuesFromContent } from "@/lib/content/model";

vi.mock("@/lib/content/actions", () => ({
  createContentAction: vi.fn(async () => ({ status: "idle" })),
  updateContentAction: vi.fn(async () => ({ status: "idle" })),
}));

afterEach(cleanup);

const parents = {
  seriesParents: [{ id: "series-one", title: "Series One", type: "SERIES" as const }],
  seasonParents: [{ id: "season-one", title: "Season One", type: "SEASON" as const }],
};

describe("ContentForm", () => {
  it("shows the compatible parent input and clears it when type changes", () => {
    render(<ContentForm mode="create" initialValues={formValuesFromContent()} {...parents} />);
    const type = screen.getByLabelText("Content type");

    fireEvent.change(type, { target: { value: "SEASON" } });
    const parent = screen.getByLabelText("Series parent");
    fireEvent.change(parent, { target: { value: "series-one" } });
    expect(parent).toHaveValue("series-one");

    fireEvent.change(type, { target: { value: "EPISODE" } });
    expect(screen.getByLabelText("Season parent")).toHaveValue("");

    fireEvent.change(type, { target: { value: "MOVIE" } });
    expect(screen.queryByLabelText(/parent$/)).not.toBeInTheDocument();
  });

  it("reveals a country input while preserving an intentional empty override", () => {
    render(<ContentForm mode="create" initialValues={formValuesFromContent()} {...parents} />);
    const override = screen.getByLabelText("Override geo-block countries here");
    expect(screen.queryByLabelText("Blocked countries")).not.toBeInTheDocument();
    fireEvent.click(override);
    expect(screen.getByLabelText("Blocked countries")).toHaveValue("");
  });

  it("keeps content type immutable on edit", () => {
    const initial = formValuesFromContent({
      id: "movie-one",
      type: "MOVIE",
      title: "Movie One",
      parentId: null,
      parentalRating: null,
      genre: null,
      quality: null,
      isPremium: null,
      playbackUrl: null,
      geoBlockCountriesOverride: false,
      geoBlockCountries: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const { container } = render(<ContentForm mode="edit" initialValues={initial} contentId="movie-one" etag={'"etag"'} {...parents} />);
    expect(screen.getByLabelText("Content type")).toHaveTextContent("MOVIE");
    expect(container.querySelector('input[name="type"]')).toHaveValue("MOVIE");
    expect(container.querySelector('input[name="etag"]')).toHaveValue('"etag"');
  });

  it("returns to the content library when editing is cancelled", () => {
    render(<ContentForm mode="edit" initialValues={formValuesFromContent()} contentId="movie-one" {...parents} />);
    expect(screen.getByRole("link", { name: "Cancel" })).toHaveAttribute("href", "/content");
  });
});
