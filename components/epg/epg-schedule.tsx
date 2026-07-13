"use client";

import Link from "next/link";
import { Clock3, Pencil } from "lucide-react";
import type { EpgProgram } from "@/lib/types";
import { DeleteEpgForm } from "@/components/epg/delete-epg-form";

type WindowContext = { date: string; windowStart: string; windowEnd: string };

function duration(start: string, end: string) {
  const minutes = Math.max(0, Math.round((Date.parse(end) - Date.parse(start)) / 60_000));
  const hours = Math.floor(minutes / 60);
  return `${hours ? `${hours}h ` : ""}${minutes % 60}m`;
}

export function EpgSchedule({ programs, channelId, window }: { programs: EpgProgram[]; channelId: string; window: WindowContext }) {
  const sorted = [...programs].sort((left, right) => Date.parse(left.startTime) - Date.parse(right.startTime));
  if (!sorted.length) return <div className="panel rounded-2xl px-6 py-16 text-center"><Clock3 className="mx-auto h-8 w-8 text-blue-300" /><h2 className="mt-5 text-lg font-semibold text-white">No programs on this day</h2><p className="mt-2 text-sm text-slate-500">Add the first program. Back-to-back time ranges are supported.</p></div>;
  const context = new URLSearchParams(window);
  return <div className="space-y-3">{sorted.map((program) => {
    const start = new Date(program.startTime);
    const end = new Date(program.endTime);
    return <article key={program.id} className="panel grid gap-4 rounded-2xl p-5 md:grid-cols-[9rem_1fr_auto] md:items-center">
      <div><p className="text-lg font-semibold text-blue-200"><time suppressHydrationWarning>{start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time> – <time suppressHydrationWarning>{end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time></p><p className="mt-1 text-xs text-slate-500">{duration(program.startTime, program.endTime)}</p></div>
      <div className="min-w-0"><h2 className="truncate font-semibold text-slate-100">{program.programName}</h2><p className="mt-1 truncate font-mono text-[0.68rem] text-slate-600">UTC {program.startTime} → {program.endTime}</p></div>
      <div className="flex gap-2"><Link className="secondary-button" href={`/channels/${encodeURIComponent(channelId)}/epg/${encodeURIComponent(program.id)}/edit?${context}`}><Pencil className="h-4 w-4" /><span className="sr-only">Edit {program.programName}</span></Link><DeleteEpgForm channelId={channelId} programId={program.id} programName={program.programName} {...window} /></div>
    </article>;
  })}</div>;
}
