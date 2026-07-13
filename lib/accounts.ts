import "server-only";
import { getServerEnv } from "@/lib/env";

export type DashboardRole = "editor" | "admin";

export type DashboardAccount = {
  actorId: string;
  role: DashboardRole;
  secret: string;
};

export function parseDashboardAccounts(value: string): DashboardAccount[] {
  const seen = new Set<string>();
  const accounts: DashboardAccount[] = [];

  for (const rawEntry of value.split(",")) {
    const [rawActorId, rawRole, ...secretParts] = rawEntry.split(":");
    const actorId = rawActorId?.trim();
    const role = rawRole?.trim();
    const secret = secretParts.join(":");

    if (!actorId || (role !== "editor" && role !== "admin") || secret.length < 32) {
      continue;
    }
    if (seen.has(actorId)) {
      throw new Error("CMS_API_KEYS contains duplicate dashboard actor IDs.");
    }

    seen.add(actorId);
    accounts.push({ actorId, role, secret });
  }

  if (accounts.length === 0) {
    throw new Error("CMS_API_KEYS has no dashboard editor or admin accounts.");
  }

  return accounts;
}

export function getDashboardAccounts(): DashboardAccount[] {
  return parseDashboardAccounts(getServerEnv().CMS_API_KEYS);
}

export function getDashboardAccount(actorId: string): DashboardAccount | null {
  return getDashboardAccounts().find((account) => account.actorId === actorId) ?? null;
}

function encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export async function authenticateDashboardAccount(
  actorId: string,
  suppliedSecret: string,
): Promise<DashboardAccount | null> {
  const account = getDashboardAccount(actorId.trim());
  const expected = encode(account?.secret ?? "invalid-placeholder-secret-value");
  const supplied = encode(suppliedSecret);

  if (!account || expected.byteLength !== supplied.byteLength) return null;

  let mismatch = 0;
  for (let index = 0; index < expected.byteLength; index += 1) {
    mismatch |= expected[index] ^ supplied[index];
  }
  return mismatch === 0 ? account : null;
}
