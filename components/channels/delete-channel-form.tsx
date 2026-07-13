"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { deleteChannelAction, type ChannelActionState } from "@/components/channels/actions";
import type { LiveChannel } from "@/lib/types";

const initialState: ChannelActionState = { status: "idle" };

export function DeleteChannelForm({ channel }: { channel: LiveChannel }) {
  const [state, action, pending] = useActionState(deleteChannelAction, initialState);
  const [confirmation, setConfirmation] = useState("");
  return (
    <form action={action} className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.05] p-5 sm:p-6">
      <input type="hidden" name="channelId" value={channel.id} />
      <input type="hidden" name="slug" value={channel.slug} />
      <h2 className="text-lg font-semibold text-rose-100">Delete channel and schedule</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-rose-100/65">
        This permanently deletes <strong>{channel.name}</strong> and every EPG program on its schedule. This action requires an admin credential.
      </p>
      <label className="mt-5 block max-w-md">
        <span className="mb-2 block text-sm font-medium text-slate-300">Type <code className="text-rose-300">{channel.slug}</code> to confirm</span>
        <input className="field" name="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
      </label>
      {state.status === "error" && <div className="mt-4 text-sm text-rose-200" role="alert"><span className="font-mono text-xs">{state.errorCode}</span><span className="mx-2">·</span>{state.message}</div>}
      <button className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/15 px-4 font-semibold text-rose-200 disabled:cursor-not-allowed disabled:opacity-40" type="submit" disabled={pending || confirmation !== channel.slug}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{pending ? "Deleting…" : "Delete channel"}
      </button>
    </form>
  );
}
