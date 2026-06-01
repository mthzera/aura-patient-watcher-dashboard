import type { PatientRecord } from "./types";

export const SHIFT_ORDER = ["MANHÃ", "TARDE", "NOITE", "MADRUGADA"] as const;

export type ShiftKey = (typeof SHIFT_ORDER)[number];

function normalize(val: string | null | undefined): string {
  return (val ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/** Extract the hour (0–23) from the event-time column ("HH:MM:SS"). */
export function getHour(record: PatientRecord): number | null {
  const raw = String(record.event_time ?? "").trim();
  const m = raw.match(/^(\d{1,2}):/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  return h >= 0 && h <= 23 ? h : null;
}

/** Derive the work shift from Turno Escala, falling back to the event hour. */
export function getShift(record: PatientRecord): ShiftKey | null {
  const raw = normalize(record.shift as string | null | undefined);
  if (raw) {
    if (raw.startsWith("manh")) return "MANHÃ";
    if (raw.startsWith("tard")) return "TARDE";
    if (raw.startsWith("noit")) return "NOITE";
    if (raw.startsWith("madrug")) return "MADRUGADA";
  }
  const hour = getHour(record);
  if (hour === null) return null;
  if (hour >= 6 && hour <= 11) return "MANHÃ";
  if (hour >= 12 && hour <= 17) return "TARDE";
  if (hour >= 18 && hour <= 23) return "NOITE";
  return "MADRUGADA";
}
