// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerEnvForTests } from "@/lib/env";

const cookieHarness = vi.hoisted(() => {
  const values = new Map<string, string>();
  return {
    values,
    set: vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
      void options;
      return values.set(name, value);
    }),
    get: vi.fn((name: string) => {
      const value = values.get(name);
      return value === undefined ? undefined : { value };
    }),
    delete: vi.fn((name: string) => values.delete(name)),
    redirect: vi.fn(() => {
      throw new Error("NEXT_REDIRECT");
    }),
  };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: cookieHarness.set,
    get: cookieHarness.get,
    delete: cookieHarness.delete,
  })),
}));

vi.mock("next/navigation", () => ({ redirect: cookieHarness.redirect }));

import {
  clearDashboardSession,
  createDashboardSession,
  createVisitorDashboardSession,
  getDashboardSession,
  requireDashboardAccountSession,
  requireDashboardSession,
} from "@/lib/session";

const originalEnv = { ...process.env };
const secret = "editor-secret-with-at-least-32-chars";

function decodeCookiePayload(value: string): string {
  const [encoded] = value.split(".");
  const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
}

describe("dashboard sessions", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      SAATCMS_API_BASE_URL: "https://example.test",
      CMS_API_KEYS: `reviewer:editor:${secret}`,
      DASHBOARD_SESSION_SECRET: "session-signing-secret-at-least-32-chars",
    };
    resetServerEnvForTests();
    cookieHarness.values.clear();
    cookieHarness.set.mockClear();
    cookieHarness.get.mockClear();
    cookieHarness.delete.mockClear();
    cookieHarness.redirect.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = { ...originalEnv };
    resetServerEnvForTests();
  });

  it("round-trips a signed session without storing the account secret in its payload", async () => {
    await createDashboardSession("reviewer");

    expect(cookieHarness.set).toHaveBeenCalledOnce();
    const [name, value, options] = cookieHarness.set.mock.calls[0];
    expect(name).toBe("saatcms_dashboard_session");
    expect(value).toMatch(/^[\w-]+\.[\w-]+$/);
    const payload = decodeCookiePayload(value);
    expect(payload).toContain('"kind":"account"');
    expect(payload).toContain('"actorId":"reviewer"');
    expect(payload).not.toContain(secret);
    expect(options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
    await expect(getDashboardSession()).resolves.toEqual({
      kind: "account",
      actorId: "reviewer",
      role: "editor",
      secret,
    });
  });

  it("round-trips a signed visitor session without storing an account identity or secret", async () => {
    await createVisitorDashboardSession();

    expect(cookieHarness.set).toHaveBeenCalledOnce();
    const [, value, options] = cookieHarness.set.mock.calls[0];
    expect(value).toMatch(/^[\w-]+\.[\w-]+$/);
    const payload = decodeCookiePayload(value);
    expect(payload).toContain('"kind":"visitor"');
    expect(payload).not.toContain("reviewer");
    expect(payload).not.toContain(secret);
    expect(options).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
    });
    await expect(getDashboardSession()).resolves.toEqual({
      kind: "visitor",
      actorId: "visitor",
      role: "visitor",
    });
  });

  it("rejects a tampered session", async () => {
    await createDashboardSession("reviewer");
    const current = cookieHarness.values.get("saatcms_dashboard_session")!;
    const [payload, signed] = current.split(".");
    cookieHarness.values.set(
      "saatcms_dashboard_session",
      `${payload}.${signed.startsWith("a") ? "b" : "a"}${signed.slice(1)}`,
    );

    await expect(getDashboardSession()).resolves.toBeNull();
  });

  it("rejects an expired session", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-13T10:00:00Z"));
    await createDashboardSession("reviewer");
    vi.setSystemTime(new Date("2026-07-13T19:00:00Z"));

    await expect(getDashboardSession()).resolves.toBeNull();
  });

  it("invalidates a session when its account is removed from configuration", async () => {
    await createDashboardSession("reviewer");
    process.env.CMS_API_KEYS = `replacement:admin:${"a".repeat(32)}`;
    resetServerEnvForTests();

    await expect(getDashboardSession()).resolves.toBeNull();
  });

  it("clears the session cookie", async () => {
    await createDashboardSession("reviewer");
    await clearDashboardSession();

    expect(cookieHarness.delete).toHaveBeenCalledWith("saatcms_dashboard_session");
    await expect(getDashboardSession()).resolves.toBeNull();
  });

  it("returns an account for a valid required session and redirects otherwise", async () => {
    await createDashboardSession("reviewer");
    await expect(requireDashboardSession()).resolves.toMatchObject({ actorId: "reviewer" });

    cookieHarness.values.clear();
    await expect(requireDashboardSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(cookieHarness.redirect).toHaveBeenCalledWith("/login");
  });

  it("allows either session through the dashboard guard but requires an account for CMS routes", async () => {
    await createVisitorDashboardSession();

    await expect(requireDashboardSession()).resolves.toMatchObject({ kind: "visitor" });
    await expect(requireDashboardAccountSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(cookieHarness.redirect).toHaveBeenCalledWith(
      "/dashboard?notice=cms-account-required",
    );

    cookieHarness.redirect.mockClear();
    await createDashboardSession("reviewer");

    await expect(requireDashboardAccountSession()).resolves.toMatchObject({
      kind: "account",
      actorId: "reviewer",
      role: "editor",
    });
    expect(cookieHarness.redirect).not.toHaveBeenCalled();
  });
});
