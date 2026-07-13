import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetServerEnvForTests } from "@/lib/env";

const { getDashboardSession } = vi.hoisted(() => ({
  getDashboardSession: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ getDashboardSession }));

import { SaatCmsApiError, saatCmsRequest } from "@/lib/api";

const originalEnv = { ...process.env };

describe("saatCmsRequest", () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      SAATCMS_API_BASE_URL: "https://api.example.test/",
      CMS_API_KEYS: `reviewer:editor:${"e".repeat(32)}`,
      DASHBOARD_SESSION_SECRET: "s".repeat(32),
      SAATCMS_REQUEST_TIMEOUT_MS: "30000",
    };
    resetServerEnvForTests();
    getDashboardSession.mockReset();
    getDashboardSession.mockResolvedValue({
      kind: "account",
      actorId: "reviewer",
      role: "editor",
      secret: "cms-secret",
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
    resetServerEnvForTests();
  });

  it.each([
    "content",
    "//attacker.test/path",
    "/content/../secrets",
    "/content/%2e%2e/secrets",
    "/content\\..\\secrets",
  ])(
    "rejects unsafe relative path %s",
    async (path) => {
      await expect(saatCmsRequest(path)).rejects.toThrow(
        "SaatCMS API requests require a safe relative path.",
      );
    },
  );

  it("requires a dashboard session by default", async () => {
    getDashboardSession.mockResolvedValue(null);

    await expect(saatCmsRequest("/cms/content")).rejects.toMatchObject({
      name: "SaatCmsApiError",
      status: 401,
      errorCode: "DASHBOARD_SESSION_REQUIRED",
      requestId: null,
    });
  });

  it("rejects visitor CMS requests before calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    getDashboardSession.mockResolvedValue({
      kind: "visitor",
      actorId: "visitor",
      role: "visitor",
    });

    await expect(saatCmsRequest("/api/v1/cms/content")).rejects.toMatchObject({
      name: "SaatCmsApiError",
      status: 403,
      errorCode: "DASHBOARD_ACCOUNT_REQUIRED",
      requestId: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("builds an authenticated request and returns response metadata", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ items: [{ id: "content-1" }] }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ETag: '"version-2"',
          "X-Request-Id": "request-123",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(saatCmsRequest<{ items: Array<{ id: string }> }>("/cms/content?page=2")).resolves.toEqual({
      data: { items: [{ id: "content-1" }] },
      etag: '"version-2"',
      requestId: "request-123",
      status: 200,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.test/cms/content?page=2");
    expect(init).toMatchObject({ method: "GET", cache: "no-store" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const headers = init.headers as Headers;
    expect(headers.get("Accept")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer cms-secret");
  });

  it("serializes a body and includes conditional and custom headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "content-1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await saatCmsRequest("/cms/content", {
      method: "POST",
      body: { title: "Example" },
      ifMatch: '"version-1"',
      headers: { "X-Custom": "value" },
    });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.body).toBe(JSON.stringify({ title: "Example" }));
    const headers = init.headers as Headers;
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("If-Match")).toBe('"version-1"');
    expect(headers.get("X-Custom")).toBe("value");
  });

  it("can make an unauthenticated request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await saatCmsRequest("/health", { authenticated: false });

    expect(getDashboardSession).not.toHaveBeenCalled();
    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.has("Authorization")).toBe(false);
  });

  it("rejects caller-provided Authorization headers instead of forwarding them", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      saatCmsRequest("/health", {
        authenticated: false,
        headers: { authorization: "Bearer caller-controlled" },
      }),
    ).rejects.toThrow(
      "Authorization headers are managed by the dashboard API client.",
    );
    expect(getDashboardSession).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("limits unauthenticated requests to declared public routes", async () => {
    await expect(
      saatCmsRequest("/api/v1/cms/content", { authenticated: false }),
    ).rejects.toThrow(
      "Unauthenticated SaatCMS requests are limited to public middleware and health routes.",
    );
  });

  it("returns undefined data for a successful no-content response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));

    await expect(saatCmsRequest<void>("/cms/content/content-1", { method: "DELETE" })).resolves.toMatchObject({
      data: undefined,
      status: 204,
    });
  });

  it("normalizes a structured upstream error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errorCode: "CONTENT_NOT_FOUND", message: "Missing content." }), {
          status: 404,
          headers: { "Content-Type": "application/json", "X-Request-Id": "request-404" },
        }),
      ),
    );

    await expect(saatCmsRequest("/cms/content/missing")).rejects.toMatchObject({
      status: 404,
      errorCode: "CONTENT_NOT_FOUND",
      message: "Missing content.",
      requestId: "request-404",
    });
  });

  it("uses safe defaults when the upstream error is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("bad gateway", { status: 502 })));

    await expect(saatCmsRequest("/cms/content")).rejects.toMatchObject({
      status: 502,
      errorCode: "UPSTREAM_REQUEST_FAILED",
      message: "SaatCMS could not complete the request.",
    });
  });

  it("normalizes aborts and other network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("aborted", "AbortError")));
    await expect(saatCmsRequest("/health", { authenticated: false })).rejects.toMatchObject({
      status: 504,
      errorCode: "UPSTREAM_TIMEOUT",
    });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network failed")));
    await expect(saatCmsRequest("/health", { authenticated: false })).rejects.toEqual(
      expect.objectContaining<Partial<SaatCmsApiError>>({
        status: 503,
        errorCode: "UPSTREAM_UNAVAILABLE",
      }),
    );
  });

  it("aborts a request after the configured timeout", async () => {
    vi.useFakeTimers();
    process.env.SAATCMS_REQUEST_TIMEOUT_MS = "1000";
    resetServerEnvForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
      ),
    );

    const request = saatCmsRequest("/health", { authenticated: false });
    const rejection = expect(request).rejects.toMatchObject({
      status: 504,
      errorCode: "UPSTREAM_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(1_000);
    await rejection;
  });
});
