import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigationHarness = vi.hoisted(() => ({
  pathname: "/dashboard",
  logout: vi.fn(async () => undefined),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => navigationHarness.pathname),
}));

vi.mock("@/app/login/actions", () => ({
  logoutAction: navigationHarness.logout,
}));

import { AppShell } from "@/components/app-shell";

describe("AppShell", () => {
  beforeEach(() => {
    navigationHarness.pathname = "/dashboard";
    navigationHarness.logout.mockClear();
  });

  it("renders account context, every workspace destination, and page content", () => {
    render(
      <AppShell actorId="reviewer" role="editor">
        <h1>Dashboard content</h1>
      </AppShell>,
    );

    expect(screen.getByText("reviewer")).toBeVisible();
    expect(screen.getByText("editor access")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Dashboard content" })).toBeVisible();

    const expectedLinks = [
      ["Overview", "/dashboard"],
      ["Content", "/content"],
      ["Live Channels", "/channels"],
      ["EPG Schedule", "/epg"],
      ["Metadata Resolver", "/tools/metadata"],
      ["Playback Tester", "/tools/playback"],
      ["System", "/system"],
    ];
    for (const [name, href] of expectedLinks) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });

  it("marks nested destinations active without treating Overview as a prefix", () => {
    navigationHarness.pathname = "/channels/channel-one";

    render(
      <AppShell actorId="admin" role="admin">
        <div>Channel detail</div>
      </AppShell>,
    );

    expect(screen.getByRole("link", { name: "Live Channels" })).toHaveClass("text-white");
    expect(screen.getByRole("link", { name: "Overview" })).toHaveClass("text-slate-400");
  });

  it("opens and closes mobile navigation controls", () => {
    render(
      <AppShell actorId="reviewer" role="editor">
        <div>Dashboard content</div>
      </AppShell>,
    );

    const navigation = screen.getByRole("navigation", { name: "Primary navigation" }).closest("aside");
    expect(navigation).toHaveClass("-translate-x-full");

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(navigation).toHaveClass("translate-x-0");
    expect(screen.getByRole("button", { name: "Close navigation overlay" })).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    expect(navigation).toHaveClass("-translate-x-full");
    expect(screen.queryByRole("button", { name: "Close navigation overlay" })).not.toBeInTheDocument();
  });

  it("submits the server logout action from the account menu", async () => {
    render(
      <AppShell actorId="reviewer" role="editor">
        <div>Dashboard content</div>
      </AppShell>,
    );

    fireEvent.submit(screen.getByRole("button", { name: "Sign out" }).closest("form")!);

    await waitFor(() => expect(navigationHarness.logout).toHaveBeenCalledOnce());
  });

  it("shows only public navigation and visitor-safe account copy in visitor mode", () => {
    render(
      <AppShell actorId="visitor" role="visitor">
        <h1>Public dashboard</h1>
      </AppShell>,
    );

    expect(screen.getByText("Visitor")).toBeVisible();
    expect(screen.getByText("public access")).toBeVisible();
    expect(screen.getByText("Public visitor session")).toBeVisible();
    expect(
      screen.getByText("Public requests never include a CMS bearer credential."),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeVisible();

    expect(screen.queryByRole("link", { name: "Content" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Live Channels" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "EPG Schedule" })).not.toBeInTheDocument();

    for (const name of ["Overview", "Metadata Resolver", "Playback Tester", "System"]) {
      expect(screen.getByRole("link", { name })).toBeVisible();
    }
  });
});
