"use client";

import { useActionState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { deleteEpgAction, type EpgActionState } from "@/components/epg/actions";

const initialState: EpgActionState = { status: "idle" };

export function DeleteEpgForm({ channelId, programId, programName, date, windowStart, windowEnd }: { channelId: string; programId: string; programName: string; date: string; windowStart: string; windowEnd: string }) {
  const [state, action, pending] = useActionState(deleteEpgAction, initialState);
  return <form action={action} onSubmit={(event) => { if (!window.confirm(`Delete “${programName}” from this schedule?`)) event.preventDefault(); }}>
    <input type="hidden" name="channelId" value={channelId} /><input type="hidden" name="programId" value={programId} /><input type="hidden" name="date" value={date} /><input type="hidden" name="windowStart" value={windowStart} /><input type="hidden" name="windowEnd" value={windowEnd} />
    <button className="secondary-button !text-rose-300" type="submit" disabled={pending}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}<span className="sr-only">Delete {programName}</span></button>
    {state.status === "error" && <p className="mt-2 max-w-64 text-xs text-rose-300" role="alert">{state.errorCode}: {state.message}</p>}
  </form>;
}
