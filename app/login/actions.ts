"use server";

import { redirect } from "next/navigation";
import { authenticateDashboardAccount } from "@/lib/accounts";
import { clearDashboardSession, createDashboardSession } from "@/lib/session";

export type LoginState = { error: string | null };

export async function loginAction(_: LoginState, formData: FormData): Promise<LoginState> {
  const actorId = String(formData.get("actorId") ?? "");
  const secret = String(formData.get("secret") ?? "");

  let account;
  try {
    account = await authenticateDashboardAccount(actorId, secret);
  } catch {
    return { error: "Dashboard authentication is not configured yet." };
  }

  if (!account) return { error: "The supplied credentials are not valid." };

  await createDashboardSession(account.actorId);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearDashboardSession();
  redirect("/login");
}
