"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, ArrowRight, CalendarDays } from "lucide-react";
import type { LiveChannel } from "@/lib/types";
import { localDayWindow, shiftDateKey } from "@/components/epg/time";

export function EpgNavigation({ channels, channelId, date, windowStart, windowEnd }: { channels: LiveChannel[]; channelId: string; date: string; windowStart: string; windowEnd: string }) {
  const router = useRouter();
  const navigate = (nextChannel: string, nextDate: string) => {
    const window = localDayWindow(nextDate);
    if (!nextChannel || !window) return;
    const query = new URLSearchParams({ date: nextDate, ...window });
    router.push(`/channels/${encodeURIComponent(nextChannel)}/epg?${query}`);
  };
  useEffect(() => {
    const localWindow = localDayWindow(date);
    if (!localWindow || (localWindow.windowStart === windowStart && localWindow.windowEnd === windowEnd)) return;
    const query = new URLSearchParams({ date, ...localWindow });
    router.replace(`/channels/${encodeURIComponent(channelId)}/epg?${query}`);
  }, [channelId, date, router, windowEnd, windowStart]);
  const today = () => {
    const now = new Date();
    const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    navigate(channelId, dateKey);
  };

  return (
    <div className="panel grid gap-3 rounded-2xl p-4 md:grid-cols-[minmax(12rem,1fr)_auto_auto]">
      <label><span className="sr-only">Channel</span><select className="field" value={channelId} onChange={(event) => navigate(event.target.value, date)}>{channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.name}</option>)}</select></label>
      <label className="relative"><span className="sr-only">Schedule date</span><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input className="field !pl-10" type="date" value={date} onChange={(event) => navigate(channelId, event.target.value)} /></label>
      <div className="flex gap-2"><button className="secondary-button" type="button" onClick={() => navigate(channelId, shiftDateKey(date, -1))} aria-label="Previous day"><ArrowLeft className="h-4 w-4" /></button><button className="secondary-button" type="button" onClick={today}>Today</button><button className="secondary-button" type="button" onClick={() => navigate(channelId, shiftDateKey(date, 1))} aria-label="Next day"><ArrowRight className="h-4 w-4" /></button></div>
    </div>
  );
}
