/**
 * Cross-reference logic: for each patient who had a discharge event of interest
 * (hospitalization/readmission or death), check whether an AURA committee alert
 * was issued in the 10 days prior.
 *
 * Supports altas Anery (Filial) and Command Center (Unidade) exports.
 */

import type {
  DashboardFilters,
  PatientRecord,
  ReinternacaoRecord,
  ReinternacaoAlertAnalysis,
  ReinternacaoAlertMatch,
  PriorAlert,
} from "./types";
import { applyFilters, parseDate } from "./applyFilters";
import { unitMatchesReinternacao } from "./unitFilialMap";

const PRIOR_ALERT_DAYS = 10;

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

function daysBetween(fromISO: string, toISO: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  const from = new Date(`${fromISO}T00:00:00`);
  const to = new Date(`${toISO}T00:00:00`);
  return Math.round((to.getTime() - from.getTime()) / msPerDay);
}

function isAltaCondition(conditionOnDischarge: string | null): boolean {
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

function isReinternacaoEvent(rein: ReinternacaoRecord): boolean {
  if (rein.unit?.trim()) return true;
  return isAltaCondition(rein.conditionOnDischarge);
}

function nonDateFilters(
  filters?: DashboardFilters
): DashboardFilters | undefined {
  if (!filters) return undefined;
  const { startDate: _s, endDate: _e, ...rest } = filters;
  const hasRest = !!(
    rest.unit ||
    rest.clinicalAlteration ||
    rest.clinicalOutcome ||
    rest.auraActionStatus
  );
  return hasRest ? rest : undefined;
}

function buildPatientScope(records: PatientRecord[]): Set<string> {
  const names = new Set<string>();
  for (const r of records) {
    const key = normalizeName(r.patient_name);
    if (key) names.add(key);
  }
  return names;
}

function hasClinicalFilters(filters?: DashboardFilters): boolean {
  return !!(
    filters?.clinicalAlteration ||
    filters?.clinicalOutcome ||
    filters?.auraActionStatus
  );
}

/** Patient scope for clinical / outcome / atuação filters (and combos with unit). */
function getClinicalPatientScope(
  records: PatientRecord[],
  filters?: DashboardFilters
): Set<string> | null {
  const scoped = nonDateFilters(filters);
  if (!scoped || !hasClinicalFilters(filters)) return null;
  return buildPatientScope(applyFilters(records, scoped));
}

function matchesReinternacaoRow(
  rein: ReinternacaoRecord,
  records: PatientRecord[],
  filters?: DashboardFilters
): boolean {
  if (!isReinternacaoEvent(rein)) return false;
  if (!matchesDischargeDateFilter(rein.dischargeDate, filters)) return false;

  if (filters?.unit && !unitMatchesReinternacao(filters.unit, rein)) {
    return false;
  }

  const clinicalScope = getClinicalPatientScope(records, filters);
  if (clinicalScope) {
    const key = normalizeName(rein.patientName);
    if (!key || !clinicalScope.has(key)) return false;
  }

  return true;
}

function recordsForPriorAlerts(
  records: PatientRecord[],
  filters?: DashboardFilters
): PatientRecord[] {
  const scoped = nonDateFilters(filters);
  return scoped ? applyFilters(records, scoped) : records;
}

function matchesDischargeDateFilter(
  dischargeDate: string | null,
  filters?: DashboardFilters
): boolean {
  if (!filters?.startDate && !filters?.endDate) return true;
  const d = parseDate(dischargeDate);
  if (!d) return true;
  if (filters.startDate && d < filters.startDate) return false;
  if (filters.endDate && d > filters.endDate) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function buildReinternacaoAlertAnalysis(
  records: PatientRecord[],
  reinternacoes: ReinternacaoRecord[],
  filters?: DashboardFilters
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

  const alertRecords = recordsForPriorAlerts(records, filters);

  const hospitalizations = reinternacoes.filter((r) =>
    matchesReinternacaoRow(r, records, filters)
  );

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

    const priorAlerts: PriorAlert[] = alertRecords
      .filter((r) => {
        if (normalizeName(r.patient_name) !== patientKey) return false;
        const alertDate = parseDate(r.date);
        if (!alertDate) return false;
        const diff = daysBetween(alertDate, reinDate);
        return diff >= 0 && diff <= PRIOR_ALERT_DAYS;
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
      .sort((a, b) => b.daysBeforeReinternacao - a.daysBeforeReinternacao);

    matches.push({
      patientName: rein.patientName,
      reinternacaoDate: rein.dischargeDate ?? "",
      filial: rein.filial,
      unit: rein.unit,
      conditionOnDischarge: rein.conditionOnDischarge,
      hadPriorAlert: priorAlerts.length > 0,
      priorAlerts,
    });
  }

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
