import "server-only";
import { getDashboardSession } from "@/lib/session";
import { getServerEnv } from "@/lib/env";

export type ApiErrorShape = {
  status: number;
  errorCode: string;
  message: string;
  requestId: string | null;
};

export class SaatCmsApiError extends Error {
  readonly status: number;
  readonly errorCode: string;
  readonly requestId: string | null;

  constructor(error: ApiErrorShape) {
    super(error.message);
    this.name = "SaatCmsApiError";
    this.status = error.status;
    this.errorCode = error.errorCode;
    this.requestId = error.requestId;
  }
}

export type ApiResult<T> = {
  data: T;
  etag: string | null;
  requestId: string | null;
  status: number;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  ifMatch?: string | null;
  headers?: Record<string, string>;
  authenticated?: boolean;
};

export async function saatCmsRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  let pathname: string;
  try {
    pathname = decodeURIComponent(path.split(/[?#]/, 1)[0]);
  } catch {
    throw new Error("SaatCMS API requests require a safe relative path.");
  }

  const hasTraversal = pathname.split(/[\\/]/).some((segment) => segment === "." || segment === "..");
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\") || hasTraversal) {
    throw new Error("SaatCMS API requests require a safe relative path.");
  }

  const publicPath = pathname === "/" || pathname === "/health" || pathname === "/ready" || pathname.startsWith("/api/v1/mw/");
  if (options.authenticated === false && !publicPath) {
    throw new Error("Unauthenticated SaatCMS requests are limited to public middleware and health routes.");
  }

  const env = getServerEnv();
  const headers = new Headers({ Accept: "application/json", ...options.headers });

  if (options.authenticated !== false) {
    const account = await getDashboardSession();
    if (!account) {
      throw new SaatCmsApiError({
        status: 401,
        errorCode: "DASHBOARD_SESSION_REQUIRED",
        message: "Your dashboard session has expired. Sign in again.",
        requestId: null,
      });
    }
    headers.set("Authorization", `Bearer ${account.secret}`);
  }

  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (options.ifMatch) headers.set("If-Match", options.ifMatch);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.SAATCMS_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${env.SAATCMS_API_BASE_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
      signal: controller.signal,
    });
    const requestId = response.headers.get("X-Request-Id");

    if (!response.ok) {
      let body: { errorCode?: string; message?: string } = {};
      try {
        body = (await response.json()) as typeof body;
      } catch {
        body = {};
      }
      throw new SaatCmsApiError({
        status: response.status,
        errorCode: body.errorCode ?? "UPSTREAM_REQUEST_FAILED",
        message: body.message ?? "SaatCMS could not complete the request.",
        requestId,
      });
    }

    const data = response.status === 204 ? (undefined as T) : ((await response.json()) as T);
    return {
      data,
      etag: response.headers.get("ETag"),
      requestId,
      status: response.status,
    };
  } catch (error) {
    if (error instanceof SaatCmsApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new SaatCmsApiError({
        status: 504,
        errorCode: "UPSTREAM_TIMEOUT",
        message: "SaatCMS is taking longer than expected. Try again in a moment.",
        requestId: null,
      });
    }
    throw new SaatCmsApiError({
      status: 503,
      errorCode: "UPSTREAM_UNAVAILABLE",
      message: "The SaatCMS backend is currently unavailable.",
      requestId: null,
    });
  } finally {
    clearTimeout(timeout);
  }
}
