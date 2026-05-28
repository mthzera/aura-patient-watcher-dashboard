/**
 * KPI calculation logic for the AURA Patient Watcher Dashboard.
 *
 * All calculations are purely derived from the normalized, filtered record set.
 * Each helper function is small and focused for easy adjustment.
 */

import {
  PatientRecord,
  DashboardMetrics,
  UnitSummary,
  TimeSeriesPoint,
} from "./types";
import { parseDate } from "./applyFilters";

// ---------------------------------------------------------------------------
// Classification helpers — adjust strings here to match your spreadsheet
// ---------------------------------------------------------------------------

/** Favorable clinical outcomes indicate effective clinical management. */
const FAVORABLE_OUTCOMES = [
  "melhora clínica",
  "melhora clinica",
  "condição basal",
  "condicao basal",
  "estabilização",
  "estabilizacao",
  "estabilizado",
  "melhora",
];

/** "No return" phrases: the cycle was not closed (unit never responded/followed up). */
const NO_RETURN_PHRASES = ["não realizada, sem retorno", "sem retorno"];

/** Transient decompensation classification phrases. */
const TRANSIENT_PHRASES = [
  "descompensação transitória esperada",
  "descompensacao transitoria esperada",
  "descompensação transitória",
  "descompensacao transitoria",
];

/** Acute decompensation classification phrases. */
const ACUTE_PHRASES = ["descompensação aguda", "descompensacao aguda"];

/**
 * Returns true if the record has a documented unit action / response.
 *
 * What counts as an "action":
 *   - Any positive, concrete response phrase in aura_action_status
 *   - Does NOT include "sem retorno" or blank values
 *
 * Adjust this list to match actual values in your spreadsheet.
 */
export function hasUnitAction(record: PatientRecord): boolean {
  const status = normalize(record.aura_action_status);
  if (!status) return false;

  // Exclude no-return cases
  if (NO_RETURN_PHRASES.some((p) => status.includes(p))) return false;

  // Positive action indicators
  const ACTION_INDICATORS = [
    "realizada",
    "atuação realizada",
    "atuacao realizada",
    "reavaliação",
    "reavaliacao",
    "intervenção",
    "intervencao",
    "estabilização",
    "estabilizacao",
    "melhora",
    "conduta realizada",
    "notificado",
    "acionado",
    "avaliado",
    "monitorado",
    "sim",
  ];

  return ACTION_INDICATORS.some((indicator) => status.includes(indicator));
}

// ---------------------------------------------------------------------------
// Field-level classifiers
// ---------------------------------------------------------------------------

function normalize(val: string | null | undefined): string {
  return (val ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function isFavorableOutcome(record: PatientRecord): boolean {
  const outcome = normalize(record.clinical_outcome);
  return FAVORABLE_OUTCOMES.some((o) => outcome.includes(normalize(o)));
}

function isNoReturn(record: PatientRecord): boolean {
  const status = normalize(record.aura_action_status);
  return NO_RETURN_PHRASES.some((p) => status.includes(p));
}

function isAuraAlerted(record: PatientRecord): boolean {
  const val = normalize(record.aura_alerted);
  return val === "sim" || val === "yes" || val === "1" || val === "true";
}

function isTransientDecompensation(record: PatientRecord): boolean {
  const alt = normalize(record.clinical_alteration);
  return TRANSIENT_PHRASES.some((p) => alt.includes(normalize(p)));
}

function isAcuteDecompensation(record: PatientRecord): boolean {
  const alt = normalize(record.clinical_alteration);
  return ACUTE_PHRASES.some((p) => alt.includes(normalize(p)));
}

function isDeteriorationReversal(record: PatientRecord): boolean {
  // Acute case with a favorable outcome = clinical deterioration reversed
  return isAcuteDecompensation(record) && isFavorableOutcome(record);
}

// ---------------------------------------------------------------------------
// Unique patient count
// ---------------------------------------------------------------------------

function countUniquePatients(records: PatientRecord[]): number {
  const ids = new Set<string>();
  for (const r of records) {
    const key =
      `${normalize(r.patient_name)}|${normalize(r.medical_record)}`.trim();
    if (key !== "|") ids.add(key);
  }
  return ids.size || records.length; // fallback: count all rows
}

// ---------------------------------------------------------------------------
// Main KPI calculation
// ---------------------------------------------------------------------------

export function calculateMetrics(records: PatientRecord[]): DashboardMetrics {
  const total = records.length;

  const auraAlerts = records.filter(isAuraAlerted).length;
  const unitActions = records.filter(hasUnitAction).length;
  const favorableOutcomes = records.filter(isFavorableOutcome).length;
  const noReturnCases = records.filter(isNoReturn).length;

  // Closed-loop effectiveness:
  // Among cases with a unit action AND a registered clinical outcome,
  // what % ended with a favorable outcome?
  const withActionAndOutcome = records.filter(
    (r) => hasUnitAction(r) && r.clinical_outcome
  );
  const withActionAndFavorable = withActionAndOutcome.filter(isFavorableOutcome);
  const closedLoopEffectivenessRate =
    withActionAndOutcome.length > 0
      ? Math.round(
          (withActionAndFavorable.length / withActionAndOutcome.length) * 100
        )
      : 0;

  // Transient decompensation metrics
  const transientRecs = records.filter(isTransientDecompensation);
  const transientDecompensations = transientRecs.length;
  const transientEffectiveActions = transientRecs.filter(hasUnitAction).length;
  const transientEffectiveRate =
    transientDecompensations > 0
      ? Math.round((transientEffectiveActions / transientDecompensations) * 100)
      : 0;

  // Acute decompensation metrics
  const acuteRecs = records.filter(isAcuteDecompensation);
  const acuteDecompensations = acuteRecs.length;
  const acuteEffectiveActions = acuteRecs.filter(hasUnitAction).length;
  const acuteEffectiveRate =
    acuteDecompensations > 0
      ? Math.round((acuteEffectiveActions / acuteDecompensations) * 100)
      : 0;

  const deteriorationReversals = records.filter(isDeteriorationReversal).length;

  // Avoided readmissions: conservative estimate —
  // acute cases with documented unit action and favorable outcome.
  const avoidedReadmissions = acuteRecs.filter(
    (r) => hasUnitAction(r) && isFavorableOutcome(r)
  ).length;

  return {
    totalRecords: total,
    uniquePatients: countUniquePatients(records),
    auraAlerts,
    unitActions,
    favorableOutcomes,
    closedLoopEffectivenessRate,
    noReturnCases,
    transientDecompensations,
    transientEffectiveActions,
    transientEffectiveRate,
    acuteDecompensations,
    acuteEffectiveActions,
    acuteEffectiveRate,
    deteriorationReversals,
    avoidedReadmissions,
  };
}

// ---------------------------------------------------------------------------
// Per-unit summary
// ---------------------------------------------------------------------------

export function calculateUnitSummaries(
  records: PatientRecord[]
): UnitSummary[] {
  const groups = new Map<string, PatientRecord[]>();

  for (const r of records) {
    const unit = r.unit?.trim() || "Não informada";
    if (!groups.has(unit)) groups.set(unit, []);
    groups.get(unit)!.push(r);
  }

  const summaries: UnitSummary[] = [];

  for (const [unit, recs] of groups) {
    const unitActions = recs.filter(hasUnitAction).length;
    const favorableOutcomes = recs.filter(isFavorableOutcome).length;
    const noReturnCases = recs.filter(isNoReturn).length;

    const withActionAndOutcome = recs.filter(
      (r) => hasUnitAction(r) && r.clinical_outcome
    );
    const withFavorable = withActionAndOutcome.filter(isFavorableOutcome);
    const rate =
      withActionAndOutcome.length > 0
        ? Math.round((withFavorable.length / withActionAndOutcome.length) * 100)
        : 0;

    summaries.push({
      unit,
      totalRecords: recs.length,
      auraAlerts: recs.filter(isAuraAlerted).length,
      unitActions,
      favorableOutcomes,
      closedLoopEffectivenessRate: rate,
      noReturnCases,
    });
  }

  return summaries.sort((a, b) => b.totalRecords - a.totalRecords);
}

// ---------------------------------------------------------------------------
// Time-series aggregation
// ---------------------------------------------------------------------------

export function buildTimeSeries(
  records: PatientRecord[]
): TimeSeriesPoint[] {
  const byDate = new Map<string, PatientRecord[]>();

  for (const r of records) {
    const date = parseDate(r.date);
    if (!date) continue;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(r);
  }

  const points: TimeSeriesPoint[] = [];

  for (const [date, recs] of byDate) {
    points.push({
      date,
      auraAlerts: recs.filter(isAuraAlerted).length,
      unitActions: recs.filter(hasUnitAction).length,
      favorableOutcomes: recs.filter(isFavorableOutcome).length,
      noReturnCases: recs.filter(isNoReturn).length,
    });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}
