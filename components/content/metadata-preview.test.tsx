import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetadataPreview } from "@/components/content/metadata-preview";
import type { ResolvedContentMetadata } from "@/lib/content/model";
import type { CmsContent } from "@/lib/types";

function raw(overrides: Partial<CmsContent> = {}): CmsContent {
  return {
    id: "episode-1",
    type: "EPISODE",
    title: "Finale",
    parentId: "season-1",
    parentalRating: null,
    genre: null,
    quality: null,
    isPremium: null,
    playbackUrl: null,
    geoBlockCountriesOverride: false,
    geoBlockCountries: [],
    createdAt: "2026-07-13T10:00:00.000Z",
    updatedAt: "2026-07-13T10:00:00.000Z",
    ...overrides,
  };
}

function resolved(overrides: Partial<ResolvedContentMetadata> = {}): ResolvedContentMetadata {
  return {
    contentId: "episode-1",
    type: "EPISODE",
    title: "Finale",
    parentalRating: "PG-13",
    genre: "Drama",
    quality: "UHD_4K",
    isPremium: false,
    geoBlockCountries: ["TR", "DE"],
    ...overrides,
  };
}

function row(label: string) {
  return within(screen.getByRole("row", { name: new RegExp(label, "i") }));
}

describe("MetadataPreview", () => {
  it("distinguishes inherited raw fields from resolved values", () => {
    render(<MetadataPreview raw={raw()} resolved={resolved()} />);

    expect(row("Parental rating").getByText("Inherit")).toBeInTheDocument();
    expect(row("Parental rating").getByText("PG-13")).toBeInTheDocument();
    expect(row("Quality").getByText("UHD 4K")).toBeInTheDocument();
    expect(row("Premium").getByText("No")).toBeInTheDocument();
    expect(row("Geo-block countries").getByText("TR, DE")).toBeInTheDocument();
  });

  it("shows explicit false and empty geo overrides as record-level choices", () => {
    render(<MetadataPreview
      raw={raw({
        parentalRating: "18+",
        quality: "HD",
        isPremium: false,
        geoBlockCountriesOverride: true,
        geoBlockCountries: [],
      })}
      resolved={resolved({ parentalRating: null, geoBlockCountries: [] })}
    />);

    expect(row("Parental rating").getByText("18+")).toBeInTheDocument();
    expect(row("Parental rating").getByText("Not resolved")).toBeInTheDocument();
    expect(row("Premium").getAllByText("No")).toHaveLength(2);
    expect(row("Geo-block countries").getByText("Empty override")).toBeInTheDocument();
    expect(row("Geo-block countries").getByText("None")).toBeInTheDocument();
  });
});
