import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDashboardAccount, type DashboardAccount } from "@/lib/accounts";
import { getServerEnv } from "@/lib/env";

const COOKIE_NAME = "saatcms_dashboard_session";
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;

type AccountSessionPayload = {
  kind: "account";
  actorId: string;
  expiresAt: number;
};

type VisitorSessionPayload = {
  kind: "visitor";
  expiresAt: number;
};

type SessionPayload = AccountSessionPayload | VisitorSessionPayload;

export type DashboardAccountSession = DashboardAccount & { kind: "account" };

export type VisitorDashboardSession = {
  kind: "visitor";
  actorId: "visitor";
  role: "visitor";
};

export type DashboardSession = DashboardAccountSession | VisitorDashboardSession;

function toBase64Url(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const decoded = atob(padded);
  return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
}

async function signingKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getServerEnv().DASHBOARD_SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signature(value: string): Promise<string> {
  const key = await signingKey();
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(signed));
}

async function hasValidSignature(value: string, suppliedSignature: string): Promise<boolean> {
  try {
    const suppliedBytes = fromBase64Url(suppliedSignature);
    return crypto.subtle.verify(
      "HMAC",
      await signingKey(),
      suppliedBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(value),
    );
  } catch {
    return false;
  }
}

async function encodeSession(payload: SessionPayload): Promise<string> {
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  return `${encoded}.${await signature(encoded)}`;
}

async function decodeSession(value: string): Promise<SessionPayload | null> {
  const [encoded, suppliedSignature] = value.split(".");
  if (!encoded || !suppliedSignature) return null;
  if (!(await hasValidSignature(encoded, suppliedSignature))) return null;

  try {
    const parsed = JSON.parse(new TextDecoder().decode(fromBase64Url(encoded))) as {
      kind?: unknown;
      actorId?: unknown;
      expiresAt?: unknown;
    };
    if (!Number.isFinite(parsed.expiresAt) || Number(parsed.expiresAt) <= Date.now()) {
      return null;
    }

    if (parsed.kind === "visitor") {
      return { kind: "visitor", expiresAt: Number(parsed.expiresAt) };
    }

    // Sessions issued before visitor access did not include a discriminator.
    if ((parsed.kind === undefined || parsed.kind === "account") && typeof parsed.actorId === "string" && parsed.actorId) {
      return {
        kind: "account",
        actorId: parsed.actorId,
        expiresAt: Number(parsed.expiresAt),
      };
    }

    return null;
  } catch {
    return null;
  }
}

async function writeDashboardSession(payload: SessionPayload): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, await encodeSession(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(payload.expiresAt),
  });
}

export async function createDashboardSession(actorId: string): Promise<void> {
  await writeDashboardSession({
    kind: "account",
    actorId,
    expiresAt: Date.now() + SESSION_LIFETIME_MS,
  });
}

export async function createVisitorDashboardSession(): Promise<void> {
  await writeDashboardSession({
    kind: "visitor",
    expiresAt: Date.now() + SESSION_LIFETIME_MS,
  });
}

export async function clearDashboardSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getDashboardSession(): Promise<DashboardSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const payload = await decodeSession(raw);
  if (!payload) return null;
  if (payload.kind === "visitor") {
    return { kind: "visitor", actorId: "visitor", role: "visitor" };
  }

  const account = getDashboardAccount(payload.actorId);
  return account ? { kind: "account", ...account } : null;
}

export async function requireDashboardSession(): Promise<DashboardSession> {
  const session = await getDashboardSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireDashboardAccountSession(): Promise<DashboardAccountSession> {
  const session = await requireDashboardSession();
  if (session.kind === "visitor") redirect("/dashboard?notice=cms-account-required");
  return session;
}
