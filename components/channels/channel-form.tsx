"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import {
  createChannelAction,
  updateChannelAction,
  type ChannelActionState,
} from "@/components/channels/actions";
import type { LiveChannel } from "@/lib/types";

const initialState: ChannelActionState = { status: "idle" };

export function ChannelForm({ channel, etag }: { channel?: LiveChannel; etag?: string | null }) {
  const action = channel ? updateChannelAction : createChannelAction;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [name, setName] = useState(channel?.name ?? "");
  const [slug, setSlug] = useState(channel?.slug ?? "");

  return (
    <form action={formAction} className="panel max-w-3xl rounded-2xl p-5 sm:p-6">
      {channel && <input type="hidden" name="channelId" value={channel.id} />}
      {channel && <input type="hidden" name="etag" value={etag ?? ""} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Channel name</span>
          <input className="field" name="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={200} required autoFocus />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Slug</span>
          <input
            className="field"
            name="slug"
            value={slug}
            onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/\s+/g, "-"))}
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
            placeholder="saat-news"
            required
          />
          <span className="mt-2 block text-xs text-slate-500">Lowercase letters, numbers, and single hyphens.</span>
        </label>
      </div>
      {state.status === "error" && (
        <div className="mt-5 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-4" role="alert">
          <p className="font-mono text-xs font-semibold text-rose-300">{state.errorCode}</p>
          <p className="mt-1 text-sm text-rose-100/75">{state.message}</p>
          {state.errorCode === "LIVE_CHANNEL_WRITE_CONFLICT" && channel && (
            <Link className="mt-3 inline-block text-sm font-semibold text-blue-300 hover:text-blue-200" href={`/channels/${channel.id}`}>Reload latest channel</Link>
          )}
        </div>
      )}
      <div className="mt-7 flex flex-wrap gap-3">
        <button className="primary-button" type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {pending ? "Saving…" : channel ? "Save changes" : "Create channel"}
        </button>
        <Link className="secondary-button" href={channel ? `/channels/${channel.id}` : "/channels"}>Cancel</Link>
      </div>
    </form>
  );
}
