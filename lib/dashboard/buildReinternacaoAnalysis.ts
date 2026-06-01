/**
 * Cross-reference logic: for each patient who had a discharge event of interest
 * (hospitalization/readmission or death), check whether an AURA committee alert
 * was issued in the 10 days prior.
 *
 * Rules:
 *   - Event of interest = conditionOnDischarge contains "hospitalizacao",
 *     "reinternacao", "internacao", or "obito".
 *   - "Notificação do comitê" = any record in the AURA main CSV for the same patient
 *     whose date is within [0, 10] days BEFORE the reinternation date.
 *   - Patient matching is fuzzy: lowercase + remove accents + collapse whitespace.
 */

import type {
  PatientRecord,
  ReinternacaoRecord,
  ReinternacaoAlertAnalysis,
  ReinternacaoAlertMatch,
  PriorAlert,
} from "./types";
import { parseDate } from "./applyFilters";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(val: string | null | undefined): string {
  const s = (val ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return s === "n/a" || s === "na" || s === "n.a." || s === "-" ? "" : s;
}

function normalizeName(val: string | null | undefined): string {
  return normalize(val).replace(/\s+/g, " ").trim();
}

/** Days from `fromISO` to `toISO` (positive = toISO is after fromISO). */
function daysBetween(fromISO: string, toISO: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

/** Returns true when conditionOnDischarge indicates hospitalization/readmission or death. */
function isReinternacao(conditionOnDischarge: string | null): boolean {
  const n = normalize(conditionOnDischarge);
  return (
    n.includes("hospitalizacao") ||
    n.includes("reinternacao") ||
    n.includes("reinternal") ||
    n.includes("internacao") ||
    n.includes("obito") ||
    n.includes("obit")
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/** Optional date window (ISO YYYY-MM-DD) applied to the reinternação's discharge date. */
interface DateRange {
  startDate?: string;
  endDate?: string;
}

export function buildReinternacaoAlertAnalysis(
  records: PatientRecord[],
  reinternacoes: ReinternacaoRecord[],
  dateRange?: DateRange
): ReinternacaoAlertAnalysis {
  if (reinternacoes.length === 0) {
    return {
      available: false,
      totalReinternacoes: 0,
      withPriorAlert: 0,
      withoutPriorAlert: 0,
      matches: [],
    };
  }

  // Only hospitalizations/readmissions and deaths, optionally restricted to the
  // dashboard's date filter (by the reinternação's discharge date). The unit and
  // other filters are intentionally NOT applied here: the reinternação file has
  // its own timeline/branch, so only the date window is meaningful. The prior-
  // alert lookup below still scans ALL patient records to keep the "10 days
  // before" window intact.
  const hospitalizations = reinternacoes.filter((r) => {
    if (!isReinternacao(r.conditionOnDischarge)) return false;
    if (dateRange?.startDate || dateRange?.endDate) {
      const d = parseDate(r.dischargeDate);
      if (d) {
        if (dateRange.startDate && d < dateRange.startDate) return false;
        if (dateRange.endDate && d > dateRange.endDate) return false;
      }
    }
    return true;
  });

  if (hospitalizations.length === 0) {
    return {
      available: true,
      totalReinternacoes: 0,
      withPriorAlert: 0,
      withoutPriorAlert: 0,
      matches: [],
    };
  }

  const matches: ReinternacaoAlertMatch[] = [];

  for (const rein of hospitalizations) {
    const reinDate = parseDate(rein.dischargeDate);
    if (!reinDate) continue;

    const patientKey = normalizeName(rein.patientName);
    if (!patientKey) continue;

    // Find all AURA records for this patient with alert date within 10 days prior
    const priorAlerts: PriorAlert[] = records
      .filter((r) => {
        if (normalizeName(r.patient_name) !== patientKey) return false;
        const alertDate = parseDate(r.date);
        if (!alertDate) return false;
        const diff = daysBetween(alertDate, reinDate);
        return diff >= 0 && diff <= 10;
      })
      .map((r) => {
        const alertDate = parseDate(r.date)!;
        return {
          date: r.date ?? "",
          unit: r.unit,
          clinicalAlteration: r.clinical_alteration,
          daysBeforeReinternacao: daysBetween(alertDate, reinDate),
        };
      })
      // Oldest first (furthest before reinternation first)
      .sort((a, b) => b.daysBeforeReinternacao - a.daysBeforeReinternacao);

    matches.push({
      patientName: rein.patientName,
      reinternacaoDate: rein.dischargeDate ?? "",
      conditionOnDischarge: rein.conditionOnDischarge,
      hadPriorAlert: priorAlerts.length > 0,
      priorAlerts,
    });
  }

  // Sort: patients with prior alerts first, then by reinternation date desc
  matches.sort((a, b) => {
    if (a.hadPriorAlert !== b.hadPriorAlert) return a.hadPriorAlert ? -1 : 1;
    return b.reinternacaoDate.localeCompare(a.reinternacaoDate);
  });

  const withPriorAlert = matches.filter((m) => m.hadPriorAlert).length;

  return {
    available: true,
    totalReinternacoes: matches.length,
    withPriorAlert,
    withoutPriorAlert: matches.length - withPriorAlert,
    matches,
  };
}
