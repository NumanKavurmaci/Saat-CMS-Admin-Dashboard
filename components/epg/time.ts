export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function localDayWindow(dateKey: string): { windowStart: string; windowEnd: string } | null {
  if (!isDateKey(dateKey)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf())) return null;
  return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
}

export function utcDayWindow(dateKey: string): { windowStart: string; windowEnd: string } {
  const safeKey = isDateKey(dateKey) ? dateKey : new Date().toISOString().slice(0, 10);
  const start = new Date(`${safeKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
}

export function isIsoInstant(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function shiftDateKey(dateKey: string, days: number): string {
  const safeKey = isDateKey(dateKey) ? dateKey : new Date().toISOString().slice(0, 10);
  const date = new Date(`${safeKey}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function toLocalDateTimeInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return "";
  const part = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}:${part(date.getSeconds())}`;
}

export function localInputToIso(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : date.toISOString();
}
