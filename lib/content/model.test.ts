import { describe, expect, it } from "vitest";
import { contentParentType, validateAndMapContent, type ContentFormValues } from "@/lib/content/model";

function values(overrides: Partial<ContentFormValues> = {}): ContentFormValues {
  return {
    type: "SERIES",
    title: "Galactic Odyssey",
    parentId: "",
    parentalRating: "",
    genre: "",
    quality: "",
    premium: "inherit",
    playbackUrl: "",
    geoBlockCountriesOverride: false,
    geoBlockCountries: "",
    ...overrides,
  };
}

describe("content hierarchy", () => {
  it.each([
    ["SERIES", null],
    ["MOVIE", null],
    ["SEASON", "SERIES"],
    ["EPISODE", "SEASON"],
  ] as const)("maps %s to parent type %s", (type, parentType) => {
    expect(contentParentType(type)).toBe(parentType);
  });

  it.each(["SEASON", "EPISODE"] as const)("requires a parent for %s", (type) => {
    const result = validateAndMapContent(values({ type }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.parentId).toBeDefined();
  });

  it.each(["SERIES", "MOVIE"] as const)("forces %s to a root record", (type) => {
    const result = validateAndMapContent(values({ type, parentId: "ignored-parent" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.parentId).toBeNull();
  });
});

describe("content mutation mapper", () => {
  it("keeps an explicit false premium override", () => {
    const result = validateAndMapContent(values({ premium: "no" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.isPremium).toBe(false);
  });

  it("maps blank scalar metadata to inheritance", () => {
    const result = validateAndMapContent(values());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload).toMatchObject({
      parentalRating: null,
      genre: null,
      quality: null,
      isPremium: null,
      playbackUrl: null,
    });
  });

  it("preserves an intentional empty geo override", () => {
    const result = validateAndMapContent(values({ geoBlockCountriesOverride: true, geoBlockCountries: "" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.geoBlockCountries).toEqual([]);
  });

  it("omits countries while inheriting geo rules", () => {
    const result = validateAndMapContent(values({ geoBlockCountries: "TR, DE" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload).not.toHaveProperty("geoBlockCountries");
  });

  it("uppercases and deduplicates country codes", () => {
    const result = validateAndMapContent(values({ geoBlockCountriesOverride: true, geoBlockCountries: "tr, DE tr" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.geoBlockCountries).toEqual(["TR", "DE"]);
  });

  it("rejects invalid title, quality, premium, and country values", () => {
    const result = validateAndMapContent(values({
      title: "   ",
      quality: "8K" as ContentFormValues["quality"],
      premium: "sometimes" as ContentFormValues["premium"],
      geoBlockCountriesOverride: true,
      geoBlockCountries: "TUR",
    }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toMatchObject({
      title: expect.any(String),
      quality: expect.any(String),
      premium: expect.any(String),
      geoBlockCountries: expect.any(String),
    });
  });
});
