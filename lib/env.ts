import "server-only";
import { z } from "zod";

const envSchema = z.object({
  SAATCMS_API_BASE_URL: z
    .string()
    .url()
    .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
      message: "SAATCMS_API_BASE_URL must use HTTP or HTTPS",
    }),
  CMS_API_KEYS: z.string().min(1),
  DASHBOARD_SESSION_SECRET: z.string().min(32),
  SAATCMS_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
});

export type ServerEnv = z.infer<typeof envSchema>;

let cachedEnv: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse({
    SAATCMS_API_BASE_URL: process.env.SAATCMS_API_BASE_URL,
    CMS_API_KEYS: process.env.CMS_API_KEYS,
    DASHBOARD_SESSION_SECRET: process.env.DASHBOARD_SESSION_SECRET,
    SAATCMS_REQUEST_TIMEOUT_MS: process.env.SAATCMS_REQUEST_TIMEOUT_MS ?? "30000",
  });

  if (!result.success) {
    throw new Error("SaatCMS dashboard server environment is not configured correctly.");
  }

  cachedEnv = {
    ...result.data,
    SAATCMS_API_BASE_URL: result.data.SAATCMS_API_BASE_URL.replace(/\/$/, ""),
  };
  return cachedEnv;
}

export function resetServerEnvForTests() {
  cachedEnv = undefined;
}
