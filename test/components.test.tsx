import { render, screen } from "@testing-library/react";
import { Activity } from "lucide-react";
import { describe, expect, it } from "vitest";
import { ApiErrorCard } from "@/components/api-error-card";
import { BrandMark } from "@/components/brand-mark";
import { PageHeading } from "@/components/page-heading";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import { SaatCmsApiError } from "@/lib/api";

describe("foundation presentational components", () => {
  it.each([
    ["healthy", "API healthy"],
    ["degraded", "API degraded"],
    ["checking", "Checking API"],
  ] as const)("renders the %s status", (status, label) => {
    render(<StatusPill status={status} label={label} />);

    expect(screen.getByText(label)).toBeVisible();
  });

  it("renders a stat card's value and supporting copy", () => {
    render(
      <StatCard
        icon={Activity}
        label="Live channels"
        value={12}
        detail="Available in the catalog"
        tone="green"
      />,
    );

    expect(screen.getByText("Live channels")).toBeVisible();
    expect(screen.getByText("12")).toBeVisible();
    expect(screen.getByText("Available in the catalog")).toBeVisible();
  });

  it("renders a page heading with optional context and actions", () => {
    render(
      <PageHeading
        eyebrow="Catalog"
        title="Content"
        description="Manage the catalog."
        actions={<button type="button">Create content</button>}
      />,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Content" })).toBeVisible();
    expect(screen.getByText("Catalog")).toBeVisible();
    expect(screen.getByText("Manage the catalog.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Create content" })).toBeEnabled();
  });

  it("hides brand copy in compact mode", () => {
    const { rerender } = render(<BrandMark />);
    expect(screen.getByText("Saat Teknoloji")).toBeVisible();
    expect(screen.getByText("SaatCMS Control")).toBeVisible();

    rerender(<BrandMark compact />);
    expect(screen.queryByText("Saat Teknoloji")).not.toBeInTheDocument();
    expect(screen.queryByText("SaatCMS Control")).not.toBeInTheDocument();
  });

  it("renders normalized API error details", () => {
    const error = new SaatCmsApiError({
      status: 409,
      errorCode: "VERSION_CONFLICT",
      message: "The record changed.",
      requestId: "request-409",
    });

    render(<ApiErrorCard error={error} title="Save failed" />);

    expect(screen.getByText("Save failed")).toBeVisible();
    expect(screen.getByText("The record changed.")).toBeVisible();
    expect(screen.getByText(/VERSION_CONFLICT/)).toHaveTextContent("HTTP 409");
  });

  it("uses a safe fallback for an unexpected error", () => {
    render(<ApiErrorCard error={new Error("sensitive detail")} />);

    expect(screen.getByText("Data unavailable")).toBeVisible();
    expect(screen.getByText("The dashboard could not load this data.")).toBeVisible();
    expect(screen.queryByText("sensitive detail")).not.toBeInTheDocument();
  });
});
