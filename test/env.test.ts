import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getServerEnv, resetServerEnvForTests } from "@/lib/env";

const originalEnv = { ...process.env };

function configureValidEnv() {
  process.env.SAATCMS_API_BASE_URL = "https://example.test/";
  process.env.CMS_API_KEYS = `reviewer:editor:${"e".repeat(32)}`;
  process.env.DASHBOARD_SESSION_SECRET = "s".repeat(32);
  delete process.env.SAATCMS_REQUEST_TIMEOUT_MS;
}

describe("getServerEnv", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    configureValidEnv();
    resetServerEnvForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetServerEnvForTests();
  });

  it("parses the server configuration, applies the timeout default, and removes a trailing slash", () => {
    expect(getServerEnv()).toEqual({
      SAATCMS_API_BASE_URL: "https://example.test",
      CMS_API_KEYS: `reviewer:editor:${"e".repeat(32)}`,
      DASHBOARD_SESSION_SECRET: "s".repeat(32),
      SAATCMS_REQUEST_TIMEOUT_MS: 30_000,
    });
  });

  it("coerces an explicitly configured timeout", () => {
    process.env.SAATCMS_REQUEST_TIMEOUT_MS = "45000";

    expect(getServerEnv().SAATCMS_REQUEST_TIMEOUT_MS).toBe(45_000);
  });

  it("returns its cached value until the test reset helper is called", () => {
    const first = getServerEnv();
    process.env.SAATCMS_API_BASE_URL = "https://changed.example.test";

    expect(getServerEnv()).toBe(first);
    expect(getServerEnv().SAATCMS_API_BASE_URL).toBe("https://example.test");

    resetServerEnvForTests();
    expect(getServerEnv().SAATCMS_API_BASE_URL).toBe("https://changed.example.test");
  });

  it.each([
    ["missing API URL", "SAATCMS_API_BASE_URL", undefined],
    ["non-HTTP API URL", "SAATCMS_API_BASE_URL", "ftp://example.test"],
    ["empty CMS accounts", "CMS_API_KEYS", ""],
    ["short session secret", "DASHBOARD_SESSION_SECRET", "too-short"],
    ["too-short timeout", "SAATCMS_REQUEST_TIMEOUT_MS", "999"],
    ["too-long timeout", "SAATCMS_REQUEST_TIMEOUT_MS", "120001"],
  ])("rejects a configuration with %s", (_case, key, value) => {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;

    expect(() => getServerEnv()).toThrow(
      "SaatCMS dashboard server environment is not configured correctly.",
    );
  });
});
