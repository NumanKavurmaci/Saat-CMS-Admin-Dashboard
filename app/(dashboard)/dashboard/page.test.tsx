import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  request: vi.fn(),
  requireSession: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ saatCmsRequest: harness.request }));
vi.mock("@/lib/session", () => ({
  requireDashboardSession: harness.requireSession,
}));

import DashboardPage from "@/app/(dashboard)/dashboard/page";

describe("DashboardPage visitor overview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.requireSession.mockResolvedValue({
      kind: "visitor",
      actorId: "visitor",
      role: "visitor",
    });
    harness.request.mockImplementation(async (path: string) => ({
      data: { status: path === "/ready" ? "ready" : "ok" },
      etag: null,
      requestId: null,
      status: 200,
    }));
  });

  it("uses only public health endpoints and renders no protected totals or links", async () => {
    render(await DashboardPage());

    expect(harness.request).toHaveBeenCalledTimes(2);
    expect(harness.request).toHaveBeenNthCalledWith(1, "/health", {
      authenticated: false,
    });
    expect(harness.request).toHaveBeenNthCalledWith(2, "/ready", {
      authenticated: false,
    });

    expect(
      screen.getByRole("heading", { name: "Explore the public middleware surface." }),
    ).toBeVisible();
    expect(screen.getByText("No CMS credential is used")).toBeVisible();
    expect(screen.queryByText("Content records")).not.toBeInTheDocument();
    expect(screen.queryByText("Live channels")).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/content"]')).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/channels"]')).not.toBeInTheDocument();
    expect(document.querySelector('a[href="/epg"]')).not.toBeInTheDocument();

    expect(document.querySelector('a[href="/tools/metadata"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/tools/playback"]')).toBeInTheDocument();
    expect(document.querySelector('a[href="/system"]')).toBeInTheDocument();
  });
});
