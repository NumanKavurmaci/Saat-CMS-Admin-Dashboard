import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  authenticateDashboardAccount,
  getDashboardAccount,
  getDashboardAccounts,
  parseDashboardAccounts,
} from "@/lib/accounts";
import { resetServerEnvForTests } from "@/lib/env";

const originalEnv = { ...process.env };
const editorSecret = "editor-secret-with-at-least-32-chars";
const adminSecret = "admin-secret:with:colon-and-32-chars";

describe("dashboard accounts", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SAATCMS_API_BASE_URL: "https://example.test",
      CMS_API_KEYS: `reviewer:editor:${editorSecret},operator:admin:${adminSecret}`,
      DASHBOARD_SESSION_SECRET: "s".repeat(32),
    };
    resetServerEnvForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetServerEnvForTests();
  });

  it("parses editor and admin entries and preserves colons inside secrets", () => {
    expect(
      parseDashboardAccounts(
        ` reviewer : editor :${editorSecret},operator:admin:${adminSecret}`,
      ),
    ).toEqual([
      { actorId: "reviewer", role: "editor", secret: editorSecret },
      { actorId: "operator", role: "admin", secret: adminSecret },
    ]);
  });

  it("ignores malformed, unsupported, and short-secret entries", () => {
    const accounts = parseDashboardAccounts(
      `missing-fields,reader:reader:${"r".repeat(32)},short:admin:secret,valid:admin:${"v".repeat(32)}`,
    );

    expect(accounts).toEqual([
      { actorId: "valid", role: "admin", secret: "v".repeat(32) },
    ]);
  });

  it("rejects duplicate valid actor IDs", () => {
    expect(() =>
      parseDashboardAccounts(
        `same:editor:${"e".repeat(32)},same:admin:${"a".repeat(32)}`,
      ),
    ).toThrow("CMS_API_KEYS contains duplicate dashboard actor IDs.");
  });

  it("rejects a value with no usable dashboard accounts", () => {
    expect(() => parseDashboardAccounts("reader:reader:not-a-valid-dashboard-account")).toThrow(
      "CMS_API_KEYS has no dashboard editor or admin accounts.",
    );
  });

  it("loads and looks up configured accounts", () => {
    expect(getDashboardAccounts()).toHaveLength(2);
    expect(getDashboardAccount("operator")).toEqual({
      actorId: "operator",
      role: "admin",
      secret: adminSecret,
    });
    expect(getDashboardAccount("unknown")).toBeNull();
  });

  it("authenticates an exact actor and secret pair", async () => {
    await expect(authenticateDashboardAccount(" reviewer ", editorSecret)).resolves.toEqual({
      actorId: "reviewer",
      role: "editor",
      secret: editorSecret,
    });
  });

  it.each([
    ["wrong secret of the same length", "reviewer", "x".repeat(editorSecret.length)],
    ["wrong secret of another length", "reviewer", "wrong"],
    ["unknown actor", "unknown", editorSecret],
  ])("rejects a %s", async (_case, actorId, secret) => {
    await expect(authenticateDashboardAccount(actorId, secret)).resolves.toBeNull();
  });
});
