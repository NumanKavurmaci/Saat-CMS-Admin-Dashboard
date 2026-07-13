"use client";

import { useActionState } from "react";
import { ArrowRight, Eye, KeyRound, LoaderCircle, UserRound } from "lucide-react";
import {
  loginAction,
  visitorLoginAction,
  type LoginState,
} from "@/app/login/actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <div className="mt-8">
      <form action={action} className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Actor ID</span>
          <span className="relative block">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className="field !pl-10" name="actorId" autoComplete="username" placeholder="reviewer" required />
          </span>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">CMS access key</span>
          <span className="relative block">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input className="field !pl-10" name="secret" type="password" autoComplete="current-password" placeholder="Enter your environment-managed key" required />
          </span>
        </label>
        {state.error && (
          <div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-200">
            {state.error}
          </div>
        )}
        <button className="primary-button w-full" disabled={pending} type="submit">
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {pending ? "Signing in…" : "Open control center"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-slate-600">
        <span className="h-px flex-1 bg-[var(--border)]" />
        or
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>

      <form action={visitorLoginAction}>
        <button className="secondary-button w-full" type="submit">
          <Eye className="h-4 w-4" />
          Continue as visitor
        </button>
      </form>
      <p className="mt-3 text-center text-xs leading-5 text-slate-500">
        Explore system, metadata, and playback tools without sending a CMS bearer credential.
      </p>
    </div>
  );
}
