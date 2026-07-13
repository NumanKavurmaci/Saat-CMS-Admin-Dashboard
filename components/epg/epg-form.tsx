"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { createEpgAction, updateEpgAction, type EpgActionState } from "@/components/epg/actions";
import { localInputToIso, toLocalDateTimeInput } from "@/components/epg/time";
import type { EpgProgram } from "@/lib/types";

const initialState: EpgActionState = { status: "idle" };
type WindowContext = { date: string; windowStart: string; windowEnd: string };

export function EpgForm({ channelId, program, etag, window }: { channelId: string; program?: EpgProgram; etag?: string | null; window: WindowContext }) {
  const [state, action, pending] = useActionState(program ? updateEpgAction : createEpgAction, initialState);
  const [programName, setProgramName] = useState(program?.programName ?? "");
  const [start, setStart] = useState(() => program ? toLocalDateTimeInput(program.startTime) : `${window.date}T09:00`);
  const [end, setEnd] = useState(() => program ? toLocalDateTimeInput(program.endTime) : `${window.date}T10:00`);
  const startIso = useMemo(() => localInputToIso(start), [start]);
  const endIso = useMemo(() => localInputToIso(end), [end]);
  const returnHref = `/channels/${encodeURIComponent(channelId)}/epg?${new URLSearchParams(window)}`;

  return (
    <form action={action} className="panel max-w-3xl rounded-2xl p-5 sm:p-6">
      <input type="hidden" name="channelId" value={channelId} />
      <input type="hidden" name="date" value={window.date} /><input type="hidden" name="windowStart" value={window.windowStart} /><input type="hidden" name="windowEnd" value={window.windowEnd} />
      <input type="hidden" name="startTime" value={startIso} /><input type="hidden" name="endTime" value={endIso} />
      {program && <><input type="hidden" name="programId" value={program.id} /><input type="hidden" name="etag" value={etag ?? ""} /><input type="hidden" name="initialProgramName" value={program.programName} /><input type="hidden" name="initialStartTime" value={new Date(program.startTime).toISOString()} /><input type="hidden" name="initialEndTime" value={new Date(program.endTime).toISOString()} /></>}
      <label className="block"><span className="mb-2 block text-sm font-medium text-slate-300">Program name</span><input className="field" name="programName" value={programName} onChange={(event) => setProgramName(event.target.value)} required autoFocus /></label>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block"><span className="mb-2 block text-sm font-medium text-slate-300">Starts (your local time)</span><input className="field" type="datetime-local" step="1" value={start} onChange={(event) => setStart(event.target.value)} required /></label>
        <label className="block"><span className="mb-2 block text-sm font-medium text-slate-300">Ends (your local time)</span><input className="field" type="datetime-local" step="1" value={end} onChange={(event) => setEnd(event.target.value)} required /></label>
      </div>
      {startIso && endIso && <p className="mt-3 font-mono text-[0.68rem] leading-5 text-slate-500">UTC {startIso} → {endIso}</p>}
      {state.status === "error" && <div className="mt-5 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-4" role="alert"><p className="font-mono text-xs font-semibold text-rose-300">{state.errorCode}</p><p className="mt-1 text-sm text-rose-100/75">{state.message}</p>{state.errorCode === "EPG_WRITE_CONFLICT" && <Link className="mt-3 inline-block text-sm font-semibold text-blue-300" href={program ? `/channels/${encodeURIComponent(channelId)}/epg/${encodeURIComponent(program.id)}/edit?${new URLSearchParams(window)}` : returnHref}>Reload latest program</Link>}</div>}
      <div className="mt-7 flex gap-3"><button className="primary-button" type="submit" disabled={pending || !startIso || !endIso}>{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{pending ? "Saving…" : program ? "Save program" : "Add program"}</button><Link className="secondary-button" href={returnHref}>Cancel</Link></div>
    </form>
  );
}
