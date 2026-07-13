import { beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
  authenticate: vi.fn(),
  clearSession: vi.fn(),
  createSession: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("@/lib/accounts", () => ({
  authenticateDashboardAccount: harness.authenticate,
}));

vi.mock("@/lib/session", () => ({
  clearDashboardSession: harness.clearSession,
  createDashboardSession: harness.createSession,
}));

vi.mock("next/navigation", () => ({ redirect: harness.redirect }));

import { loginAction, logoutAction } from "@/app/login/actions";

function credentials(actorId = "reviewer", secret = "editor-secret") {
  const formData = new FormData();
  formData.set("actorId", actorId);
  formData.set("secret", secret);
  return formData;
}

describe("dashboard authentication actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a safe configuration error when account lookup fails", async () => {
    harness.authenticate.mockRejectedValue(new Error("environment detail"));

    await expect(loginAction({ error: null }, credentials())).resolves.toEqual({
      error: "Dashboard authentication is not configured yet.",
    });
    expect(harness.createSession).not.toHaveBeenCalled();
    expect(harness.redirect).not.toHaveBeenCalled();
  });

  it("rejects invalid credentials without creating a session", async () => {
    harness.authenticate.mockResolvedValue(null);

    await expect(loginAction({ error: null }, credentials())).resolves.toEqual({
      error: "The supplied credentials are not valid.",
    });
    expect(harness.authenticate).toHaveBeenCalledWith("reviewer", "editor-secret");
    expect(harness.createSession).not.toHaveBeenCalled();
  });

  it("creates a session for a valid account and redirects to the dashboard", async () => {
    harness.authenticate.mockResolvedValue({
      actorId: "reviewer",
      role: "editor",
      secret: "editor-secret",
    });

    await expect(loginAction({ error: null }, credentials())).rejects.toThrow("NEXT_REDIRECT");
    expect(harness.createSession).toHaveBeenCalledWith("reviewer");
    expect(harness.redirect).toHaveBeenCalledWith("/dashboard");
  });

  it("clears the current session before redirecting on logout", async () => {
    await expect(logoutAction()).rejects.toThrow("NEXT_REDIRECT");

    expect(harness.clearSession).toHaveBeenCalledOnce();
    expect(harness.redirect).toHaveBeenCalledWith("/login");
    expect(harness.clearSession.mock.invocationCallOrder[0]).toBeLessThan(
      harness.redirect.mock.invocationCallOrder[0],
    );
  });
});
