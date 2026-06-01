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
  TemporalBucket,
  ResponsivenessAnalysis,
  InitiationActionBreakdown,
  InitiationReason,
  NoReturnReasonsBreakdown,
  RecordClassificationBreakdown,
  DecompensationAnalysis,
  DecompCategory,
  PatientAlertRanking,
  RankedPatientAlerts,
  TransientAlertBreakdown,
} from "./types";
import { parseDate } from "./applyFilters";
import { getHour, getShift, SHIFT_ORDER } from "./shift";

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

/** Outcomes that indicate the patient was basically normal after alert/triage. */
const NORMAL_CLINICAL_RETURN_OUTCOMES = [
  "normal",
  "sem alteração",
  "sem alteracao",
  "condição basal",
  "condicao basal",
  "basal",
  "estável",
  "estavel",
  "estabilização",
  "estabilizacao",
  "estabilizado",
];

/** "No return" phrases: the cycle was not closed (unit never responded/followed up). */
const NO_RETURN_PHRASES = ["não realizada, sem retorno", "sem retorno"];

/** Transient decompensation classification phrases.
 *  Covers both legacy ("transitória") and the two current subtypes
 *  ("transitória basal" and "transitória estável"). */
const TRANSIENT_PHRASES = [
  "descompensação transitória basal",
  "descompensacao transitoria basal",
  "descompensação transitória estável",
  "descompensacao transitoria estavel",
  "descompensação transitória esperada",
  "descompensacao transitoria esperada",
  "descompensação transitória",
  "descompensacao transitoria",
];

/** Acute decompensation classification phrases. */
const ACUTE_PHRASES = ["descompensação aguda", "descompensacao aguda"];

/** Clinical outcomes that mean the case is still under monitoring (not a final acute outcome). */
const MONITORING_OUTCOME_PHRASES = ["em monitoramento", "monitorando"];

/**
 * Returns true if the record has a documented unit action / response.
 *
 * What counts as an "action":
 *   - Any positive, concrete response phrase in aura_action_status
 *   - Does NOT include "sem retorno" or blank values
 *
 * Adjust this list to match actual values in your spreadsheet.
 */
/**
 * Whether this alert was triaged — i.e. the unit gave ANY response.
 * Rule: sem retorno = sem triagem; any non-empty non-"sem retorno" response = 1 triagem.
 */
export function hasTriagem(record: PatientRecord): boolean {
  // No clinical alteration = sem triagem
  if (!normalize(record.clinical_alteration)) return false;

  const status = normalize(record.aura_action_status);
  if (!status) return false;
  if (NO_RETURN_PHRASES.some((p) => status.includes(p))) return false;
  return true;
}

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

const NORMALIZE_NA = new Set(["n/a", "na", "n.a.", "-", "--"]);

function normalize(val: string | null | undefined): string {
  const s = (val ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return NORMALIZE_NA.has(s) ? "" : s;
}

function isFavorableOutcome(record: PatientRecord): boolean {
  const outcome = normalize(record.clinical_outcome);
  return FAVORABLE_OUTCOMES.some((o) => outcome.includes(normalize(o)));
}

function hasRegisteredOutcome(record: PatientRecord): boolean {
  return Boolean(normalize(record.clinical_outcome));
}

function rateOneDecimal(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}

function isNormalClinicalReturn(record: PatientRecord): boolean {
  const outcome = normalize(record.clinical_outcome);
  const intervention = normalize(record.intervention_result as string | null | undefined);
  return NORMAL_CLINICAL_RETURN_OUTCOMES.some((o) => {
    const normalized = normalize(o);
    return outcome.includes(normalized) || intervention.includes(normalized);
  });
}

function isNoReturn(record: PatientRecord): boolean {
  // No clinical alteration = sem retorno
  if (!normalize(record.clinical_alteration)) return true;

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

function isMonitoringOutcome(record: PatientRecord): boolean {
  const outcome = normalize(record.clinical_outcome);
  if (!outcome) return false;
  if (outcome.includes("fim do monitoramento")) return false;
  return MONITORING_OUTCOME_PHRASES.some((p) => outcome.includes(p));
}

function isDeteriorationReversal(record: PatientRecord): boolean {
  // Acute case with a favorable outcome = clinical deterioration reversed
  return (
    isAcuteDecompensation(record) &&
    isFavorableOutcome(record) &&
    !isMonitoringOutcome(record)
  );
}

/**
 * Whether the unit responded effectively to this record.
 *
 * Priority:
 *   1. The spreadsheet's own "efetividade" flag (1 / 0) when present.
 *   2. Fallback: a documented unit action that led to a favorable outcome.
 */
function isEffectiveResponse(record: PatientRecord): boolean {
  const flag = normalize(record.effectiveness_flag as string | null | undefined);
  if (flag === "1" || flag === "sim" || flag === "yes" || flag === "true") {
    return true;
  }
  if (flag === "0" || flag === "nao" || flag === "no" || flag === "false") {
    return false;
  }
  // No usable flag — fall back to outcome-based heuristic
  return hasUnitAction(record) && isFavorableOutcome(record);
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

  const auraAlertRecords = records.filter(isAuraAlerted);
  const auraAlerts = auraAlertRecords.length;
  const alertsWithReturn = auraAlertRecords.filter(hasTriagem).length;
  const auraAlertsNoReturn = auraAlertRecords.filter(isNoReturn).length;
  const triagens = alertsWithReturn;
  const unitActions = records.filter(hasUnitAction).length;
  const favorableOutcomes = records.filter(isFavorableOutcome).length;
  const registeredOutcomes = records.filter(hasRegisteredOutcome).length;
  const noReturnCases = records.filter(isNoReturn).length;
  const alertResponseRate = rateOneDecimal(alertsWithReturn, auraAlerts);
  const auraAlertsNoReturnRate =
    auraAlerts > 0
      ? Math.round((auraAlertsNoReturn / auraAlerts) * 100)
      : 0;
  const noReturnRecordsRate =
    total > 0 ? Math.round((noReturnCases / total) * 100) : 0;

  const normalClinicalReturnAlerts = records.filter(
    (r) => isAuraAlerted(r) && hasTriagem(r) && isNormalClinicalReturn(r)
  );
  const normalClinicalReturnAlertCount = normalClinicalReturnAlerts.length;
  const normalClinicalReturnPatients = countUniquePatients(normalClinicalReturnAlerts);
  const normalClinicalReturnAmongReturnRate = rateOneDecimal(
    normalClinicalReturnAlertCount,
    alertsWithReturn
  );
  const normalClinicalReturnAlertRate =
    auraAlerts > 0
      ? Math.round((normalClinicalReturnAlertCount / auraAlerts) * 100)
      : 0;

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
    triagens,
    alertsWithReturn,
    auraAlertsNoReturn,
    alertResponseRate,
    auraAlertsNoReturnRate,
    noReturnRecordsRate,
    unitActions,
    favorableOutcomes,
    registeredOutcomes,
    normalClinicalReturnAlerts: normalClinicalReturnAlertCount,
    normalClinicalReturnPatients,
    normalClinicalReturnAmongReturnRate,
    normalClinicalReturnAlertRate,
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
// Initiation-action breakdown (motivos) — derived from "Ação Iniciação"
// ---------------------------------------------------------------------------

type InitiationKey = InitiationReason["key"];

/**
 * Classify a record by its "Ação Iniciação" text. Handles the real-world
 * typos/case variants seen in the data ("sem retono/retrono da unidade",
 * "alertado/Alertado via TEAMS").
 */
export function classifyInitiation(record: PatientRecord): InitiationKey {
  const n = normalize(record.initiation_action as string | null | undefined);

  // Empty / administrative / non-clinical → not a real outcome
  if (
    !n ||
    n.includes("finitude") ||
    n.includes("erro de registro") ||
    n.includes("erro de digit") ||
    n.includes("notificado erro")
  ) {
    return "naoInformado";
  }

  // "Sem retorno de contato telefônico" → não atendeu / sem contato
  if (n.includes("contato telefon")) return "semContatoTelefonico";

  // "sem retorno da unidade" (+ typos) → unidade não respondeu
  if (n.includes("unidade") && n.includes("sem ret")) return "unidadeNaoRespondeu";

  // "Reavaliado, Basal" → retorno basal
  if (n.includes("basal")) return "retornoBasal";

  // Everything else with a concrete action = retorno com intervenção/acompanhamento
  return "retornoComIntervencao";
}

const INITIATION_LABELS: Record<InitiationKey, string> = {
  semContatoTelefonico: "Sem contato telefônico",
  unidadeNaoRespondeu: "Unidade não respondeu",
  retornoBasal: "Retorno basal",
  retornoComIntervencao: "Retorno com intervenção",
  naoInformado: "Sem classificação",
};

// Display order: positive returns first, then the no-return reasons, then N/A.
const INITIATION_ORDER: InitiationKey[] = [
  "retornoComIntervencao",
  "retornoBasal",
  "semContatoTelefonico",
  "unidadeNaoRespondeu",
  "naoInformado",
];

export function calculateInitiationBreakdown(
  records: PatientRecord[]
): InitiationActionBreakdown {
  // If no record carries the column at all, mark unavailable.
  const hasColumn = records.some(
    (r) => r.initiation_action !== undefined && r.initiation_action !== null
  );

  const counts: Record<InitiationKey, number> = {
    semContatoTelefonico: 0,
    unidadeNaoRespondeu: 0,
    retornoBasal: 0,
    retornoComIntervencao: 0,
    naoInformado: 0,
  };

  for (const r of records) {
    counts[classifyInitiation(r)] += 1;
  }

  const total = records.length;
  const reasons: InitiationReason[] = INITIATION_ORDER.map((key) => ({
    key,
    label: INITIATION_LABELS[key],
    count: counts[key],
    percent: total > 0 ? Math.round((counts[key] / total) * 100) : 0,
  }));

  return {
    available: hasColumn,
    total,
    reasons,
    semRetornoTotal: counts.semContatoTelefonico + counts.unidadeNaoRespondeu,
  };
}

/**
 * Motivos de não retorno — only records flagged as sem retorno, classified
 * by "Ação Iniciação".
 */
export function calculateNoReturnReasons(
  records: PatientRecord[]
): NoReturnReasonsBreakdown {
  const hasColumn = records.some(
    (r) => r.initiation_action !== undefined && r.initiation_action !== null
  );

  const noReturnRecords = records.filter(isNoReturn);
  let semContatoTelefonico = 0;
  let unidadeNaoRespondeu = 0;
  let naoInformado = 0;

  for (const r of noReturnRecords) {
    const key = classifyInitiation(r);
    if (key === "semContatoTelefonico") semContatoTelefonico++;
    else if (key === "unidadeNaoRespondeu") unidadeNaoRespondeu++;
    else naoInformado++;
  }

  const classified = semContatoTelefonico + unidadeNaoRespondeu;
  const totalNoReturn = noReturnRecords.length;

  return {
    available: hasColumn,
    totalNoReturn,
    classified,
    notClassified: naoInformado,
    semContatoTelefonico,
    unidadeNaoRespondeu,
    naoInformado,
  };
}

/**
 * Classificação dos registros do recorte em três grupos mutuamente
 * exclusivos: retorno com intervenção, retorno basal e sem retorno.
 */
export function calculateRecordClassification(
  records: PatientRecord[]
): RecordClassificationBreakdown {
  const hasColumn = records.some(
    (r) => r.initiation_action !== undefined && r.initiation_action !== null
  );

  const total = records.length;
  let retornoComIntervencao = 0;
  let retornoBasal = 0;
  let semRetorno = 0;
  let unclassifiedReturns = 0;

  for (const r of records) {
    if (isNoReturn(r)) {
      semRetorno++;
      continue;
    }
    const key = classifyInitiation(r);
    if (key === "retornoBasal") retornoBasal++;
    else if (key === "retornoComIntervencao") retornoComIntervencao++;
    else unclassifiedReturns++;
  }

  const classifiedSum = retornoComIntervencao + retornoBasal + semRetorno;
  const sumMatchesTotal =
    classifiedSum === total && unclassifiedReturns === 0;

  return {
    available: hasColumn,
    total,
    retornoComIntervencao,
    retornoBasal,
    semRetorno,
    unclassifiedReturns,
    retornoComIntervencaoPercent:
      total > 0 ? Math.round((retornoComIntervencao / total) * 100) : 0,
    retornoBasalPercent:
      total > 0 ? Math.round((retornoBasal / total) * 100) : 0,
    semRetornoPercent:
      total > 0 ? Math.round((semRetorno / total) * 100) : 0,
    sumMatchesTotal,
  };
}

// ---------------------------------------------------------------------------
// Clinical decompensation — counted by PATIENT-DAY (not by row)
// ---------------------------------------------------------------------------

/** Stable key for a (patient, calendar-day) pair, or null if unidentifiable. */
function patientDayKey(r: PatientRecord): string | null {
  const name = normalize(r.patient_name);
  const day = parseDate(r.date);
  if (!name || !day) return null;
  return `${name}|${day}`;
}

/** Count distinct patient-days in a record set. */
function countPatientDays(records: PatientRecord[]): number {
  const set = new Set<string>();
  for (const r of records) {
    const k = patientDayKey(r);
    if (k) set.add(k);
  }
  return set.size;
}

/** Map a transient record's clinical outcome to its sub-category. */
function transientCategory(
  outcome: string | null | undefined
): DecompCategory["key"] | null {
  const o = normalize(outcome);
  if (o.includes("condicao basal") || o === "basal") return "basal";
  if (o.includes("melhora")) return "comIntervencao";
  if (o.includes("estabiliza")) return "estavel";
  return null;
}

const TRANSIENT_LABELS: Record<DecompCategory["key"], string> = {
  basal: "Transitória basal",
  comIntervencao: "Transitória com intervenção",
  estavel: "Estável",
};

/**
 * Build the decompensation analysis. Every figure is a DISTINCT PATIENT-DAY:
 * the same patient on the same day counts once no matter how many rows/actions
 * exist. Transient decompensation is split by clinical outcome into
 * basal / com intervenção (melhora) / estável.
 */
export function calculateDecompensation(
  records: PatientRecord[]
): DecompensationAnalysis {
  const scopePatientDays = countPatientDays(records);

  // --- Transient ---
  const transientRecs = records.filter(isTransientDecompensation);
  const transientDays = new Set<string>();
  const transientEffectiveDays = new Set<string>();
  // patient-day → set of sub-categories seen that day
  const dayCats = new Map<string, Set<DecompCategory["key"]>>();

  for (const r of transientRecs) {
    const k = patientDayKey(r);
    if (!k) continue;
    transientDays.add(k);
    if (hasUnitAction(r)) transientEffectiveDays.add(k);
    const cat = transientCategory(r.clinical_outcome);
    if (cat) {
      if (!dayCats.has(k)) dayCats.set(k, new Set());
      dayCats.get(k)!.add(cat);
    }
  }

  // One category per patient-day, by priority (basal > melhora > estável).
  const priority: DecompCategory["key"][] = ["basal", "comIntervencao", "estavel"];
  const counts: Record<DecompCategory["key"], number> = {
    basal: 0,
    comIntervencao: 0,
    estavel: 0,
  };
  for (const cats of dayCats.values()) {
    const chosen = priority.find((p) => cats.has(p));
    if (chosen) counts[chosen] += 1;
  }

  const transientTotal = transientDays.size;
  const transient: DecompCategory[] = priority.map((key) => ({
    key,
    label: TRANSIENT_LABELS[key],
    patients: counts[key],
    percent:
      transientTotal > 0 ? Math.round((counts[key] / transientTotal) * 100) : 0,
  }));

  // --- Acute ---
  const acuteRecs = records.filter(isAcuteDecompensation);
  const acuteDays = new Set<string>();
  const acuteEffectiveDays = new Set<string>();
  const reversalDays = new Set<string>();
  const monitoringDays = new Set<string>();
  const avoidedDays = new Set<string>();

  for (const r of acuteRecs) {
    const k = patientDayKey(r);
    if (!k) continue;
    acuteDays.add(k);
    if (hasUnitAction(r)) acuteEffectiveDays.add(k);
    if (isDeteriorationReversal(r)) reversalDays.add(k);
    else if (isMonitoringOutcome(r)) monitoringDays.add(k);
    if (hasUnitAction(r) && isFavorableOutcome(r)) avoidedDays.add(k);
  }

  const acuteTotal = acuteDays.size;
  const acuteMonitoringPatients = monitoringDays.size;

  // Patient-days with ANY decompensation (union; a day can be both).
  const decompensatedPatientDays = new Set([...transientDays, ...acuteDays]).size;

  return {
    scopePatientDays,
    decompensatedPatientDays,
    transientTotal,
    transient,
    transientEffectivePatients: transientEffectiveDays.size,
    transientEffectiveRate:
      transientTotal > 0
        ? Math.round((transientEffectiveDays.size / transientTotal) * 100)
        : 0,
    acuteTotal,
    acuteEffectivePatients: acuteEffectiveDays.size,
    acuteEffectiveRate:
      acuteTotal > 0
        ? Math.round((acuteEffectiveDays.size / acuteTotal) * 100)
        : 0,
    deteriorationReversals: reversalDays.size,
    acuteMonitoringPatients,
    avoidedReadmissions: avoidedDays.size,
  };
}

// ---------------------------------------------------------------------------
// Patient alert rankings (by row count in the filtered set)
// ---------------------------------------------------------------------------

const RANKING_LIMIT = 20;

function patientKey(r: PatientRecord): string | null {
  const name = normalize(r.patient_name);
  const mr = normalize(r.medical_record);
  if (!name && !mr) return null;
  return `${name}|${mr}`;
}

function emptyTransientBreakdown(): TransientAlertBreakdown {
  return { basal: 0, comIntervencao: 0, estavel: 0, outros: 0 };
}

function parseNews2Score(record: PatientRecord): number | null {
  const raw = record.news2_score ?? (record.news2_ultimo as string | undefined);
  if (raw == null || raw === "") return null;
  const n =
    typeof raw === "number"
      ? raw
      : parseFloat(String(raw).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function mergeNews2Peak(current: number | null, next: number | null): number | null {
  if (next === null) return current;
  if (current === null) return next;
  return Math.max(current, next);
}

/**
 * Top patients with the most transient or acute decompensation alerts.
 * Transient entries include basal / com intervenção / estável / outros.
 */
export function calculatePatientAlertRanking(
  records: PatientRecord[],
  limit = RANKING_LIMIT
): PatientAlertRanking {
  const transientMap = new Map<
    string,
    RankedPatientAlerts & { breakdown: TransientAlertBreakdown }
  >();
  const acuteMap = new Map<string, RankedPatientAlerts & { news2Score: number | null }>();

  for (const r of records) {
    const key = patientKey(r);
    if (!key) continue;

    const patientName = (r.patient_name ?? "").trim() || "Sem nome";
    const unit = r.unit?.trim() || null;

    if (isTransientDecompensation(r)) {
      let entry = transientMap.get(key);
      if (!entry) {
        entry = {
          patientName,
          unit,
          total: 0,
          news2Score: null,
          breakdown: emptyTransientBreakdown(),
        };
        transientMap.set(key, entry);
      }
      entry.total += 1;
      entry.news2Score = mergeNews2Peak(entry.news2Score, parseNews2Score(r));
      const cat = transientCategory(r.clinical_outcome);
      if (cat === "basal") entry.breakdown.basal += 1;
      else if (cat === "comIntervencao") entry.breakdown.comIntervencao += 1;
      else if (cat === "estavel") entry.breakdown.estavel += 1;
      else entry.breakdown.outros += 1;
    }

    if (isAcuteDecompensation(r)) {
      let entry = acuteMap.get(key);
      if (!entry) {
        entry = { patientName, unit, total: 0, news2Score: null };
        acuteMap.set(key, entry);
      }
      entry.total += 1;
      entry.news2Score = mergeNews2Peak(entry.news2Score, parseNews2Score(r));
    }
  }

  const transient: RankedPatientAlerts[] = [...transientMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map(({ breakdown, ...rest }) => ({
      ...rest,
      transientBreakdown: breakdown,
    }));

  const acute: RankedPatientAlerts[] = [...acuteMap.values()]
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);

  return { limit, transient, acute };
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

const MS_PER_DAY = 86_400_000;
const BUCKET_DAYS = 15;

function isoToMs(iso: string): number {
  return Date.parse(`${iso}T00:00:00Z`);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Build the evolution time series in 15-day buckets. Each point is the daily
 * average within its window.
 */
export function buildTimeSeries(records: PatientRecord[]): TimeSeriesPoint[] {
  const dated = records
    .map((r) => ({ date: parseDate(r.date), record: r }))
    .filter((x): x is { date: string; record: PatientRecord } => !!x.date);

  if (dated.length === 0) return [];

  let minMs = Infinity;
  let maxMs = -Infinity;
  for (const { date } of dated) {
    const ms = isoToMs(date);
    if (ms < minMs) minMs = ms;
    if (ms > maxMs) maxMs = ms;
  }

  const byBucket = new Map<string, PatientRecord[]>();

  for (const { date, record } of dated) {
    const dayDiff = Math.floor((isoToMs(date) - minMs) / MS_PER_DAY);
    const bucketIndex = Math.floor(dayDiff / BUCKET_DAYS);
    const bucketStartMs = minMs + bucketIndex * BUCKET_DAYS * MS_PER_DAY;
    const key = new Date(bucketStartMs).toISOString().slice(0, 10);
    if (!byBucket.has(key)) byBucket.set(key, []);
    byBucket.get(key)!.push(record);
  }

  const points: TimeSeriesPoint[] = [];

  for (const [date, recs] of byBucket) {
    const spanDays = Math.floor((maxMs - isoToMs(date)) / MS_PER_DAY) + 1;
    const days = Math.min(BUCKET_DAYS, Math.max(1, spanDays));

    points.push({
      date,
      auraAlerts: round1(recs.filter(isAuraAlerted).length / days),
      unitActions: round1(recs.filter(hasUnitAction).length / days),
      favorableOutcomes: round1(recs.filter(isFavorableOutcome).length / days),
      noReturnCases: round1(recs.filter(isNoReturn).length / days),
    });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}

// ---------------------------------------------------------------------------
// Temporal responsiveness analysis — WHEN does the loop break / respond best
// ---------------------------------------------------------------------------

const DOW_LABELS = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];
// Display order: weekdays first, weekend last (operational reading)
const DOW_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const HOUR_BANDS: [string, number, number][] = [
  ["00–03h", 0, 3],
  ["04–07h", 4, 7],
  ["08–11h", 8, 11],
  ["12–15h", 12, 15],
  ["16–19h", 16, 19],
  ["20–23h", 20, 23],
];

const WEEKEND_LABELS = new Set(["Sábado", "Domingo"]);

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Day of week (0=Sun..6=Sat) derived from the record date. */
function getDayOfWeek(record: PatientRecord): number | null {
  const iso = parseDate(record.date);
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? null : d.getDay();
}

/** Build a bucket from a set of records. */
function makeBucket(label: string, recs: PatientRecord[]): TemporalBucket {
  const total = recs.length;
  const noReturn = recs.filter(isNoReturn).length;
  const effective = recs.filter(isEffectiveResponse).length;
  return {
    label,
    total,
    noReturn,
    noReturnRate: pct(noReturn, total),
    effective,
    effectiveRate: pct(effective, total),
  };
}

/**
 * Pick the bucket with the highest value of `metric`, ignoring tiny buckets
 * (below `minTotal`) so a 2-record outlier never dominates the narrative.
 */
function pickExtreme(
  buckets: TemporalBucket[],
  metric: (b: TemporalBucket) => number,
  minTotal: number,
  direction: "max" | "min"
): TemporalBucket | null {
  const eligible = buckets.filter((b) => b.total >= minTotal);
  if (eligible.length === 0) return null;
  return eligible.reduce((best, b) => {
    const cmp = metric(b) - metric(best);
    return (direction === "max" ? cmp > 0 : cmp < 0) ? b : best;
  });
}

export function calculateResponsiveness(
  records: PatientRecord[]
): ResponsivenessAnalysis {
  const total = records.length;

  // Group records by each temporal dimension
  const shiftGroups = new Map<string, PatientRecord[]>();
  const dowGroups = new Map<number, PatientRecord[]>();
  const bandGroups = new Map<string, PatientRecord[]>();

  let hasShiftData = false;
  let hasTimeData = false;

  for (const r of records) {
    const shift = getShift(r);
    if (shift) {
      hasShiftData = true;
      (shiftGroups.get(shift) ?? shiftGroups.set(shift, []).get(shift)!).push(r);
    }

    const dow = getDayOfWeek(r);
    if (dow !== null) {
      (dowGroups.get(dow) ?? dowGroups.set(dow, []).get(dow)!).push(r);
    }

    const hour = getHour(r);
    if (hour !== null) {
      hasTimeData = true;
      const band = HOUR_BANDS.find(([, lo, hi]) => hour >= lo && hour <= hi);
      if (band) {
        const key = band[0];
        (bandGroups.get(key) ?? bandGroups.set(key, []).get(key)!).push(r);
      }
    }
  }

  const available = total > 0 && (hasShiftData || hasTimeData);

  const byShift = SHIFT_ORDER.filter((s) => shiftGroups.has(s)).map((s) =>
    makeBucket(s, shiftGroups.get(s)!)
  );
  const byDayOfWeek = DOW_DISPLAY_ORDER.filter((d) => dowGroups.has(d)).map((d) =>
    makeBucket(DOW_LABELS[d], dowGroups.get(d)!)
  );
  const byHourBand = HOUR_BANDS.filter(([k]) => bandGroups.has(k)).map(([k]) =>
    makeBucket(k, bandGroups.get(k)!)
  );

  // Require a bucket to hold a meaningful share before calling it best/worst
  const minTotal = Math.max(5, Math.round(total * 0.02));

  const worstShift = pickExtreme(byShift, (b) => b.noReturnRate, minTotal, "max");
  const bestShift = pickExtreme(byShift, (b) => b.noReturnRate, minTotal, "min");
  const worstDay = pickExtreme(byDayOfWeek, (b) => b.noReturnRate, minTotal, "max");

  // Best response window: scan shifts AND hour bands, take highest effectiveness
  const bestResponseWindow = pickExtreme(
    [...byShift, ...byHourBand],
    (b) => b.effectiveRate,
    minTotal,
    "max"
  );

  const overallNoReturnRate = pct(
    records.filter(isNoReturn).length,
    total
  );

  const actionPlan = buildActionPlan({
    overallNoReturnRate,
    worstShift,
    bestShift,
    worstDay,
    bestResponseWindow,
    byDayOfWeek,
  });

  return {
    available,
    byShift,
    byDayOfWeek,
    byHourBand,
    worstShift,
    bestShift,
    worstDay,
    bestResponseWindow,
    overallNoReturnRate,
    actionPlan,
  };
}

/** Build a short, data-driven action plan from the identified patterns. */
function buildActionPlan(input: {
  overallNoReturnRate: number;
  worstShift: TemporalBucket | null;
  bestShift: TemporalBucket | null;
  worstDay: TemporalBucket | null;
  bestResponseWindow: TemporalBucket | null;
  byDayOfWeek: TemporalBucket[];
}): string[] {
  const {
    overallNoReturnRate,
    worstShift,
    bestShift,
    worstDay,
    bestResponseWindow,
    byDayOfWeek,
  } = input;

  const plan: string[] = [];

  // 1. Critical shift — only if it stands clearly above the best shift
  if (
    worstShift &&
    bestShift &&
    worstShift.label !== bestShift.label &&
    worstShift.noReturnRate - bestShift.noReturnRate >= 8
  ) {
    const diff = worstShift.noReturnRate - bestShift.noReturnRate;
    plan.push(
      `Turno crítico: ${worstShift.label} concentra ${worstShift.noReturnRate}% de casos sem retorno — ${diff} p.p. acima do melhor turno (${bestShift.label}, ${bestShift.noReturnRate}%). Reforce a cobertura nesse turno e estabeleça uma passagem de plantão formal para que nenhum alerta fique em aberto.`
    );
  }

  // 2. Weekend / worst-day fragility
  const weekend = byDayOfWeek.filter((d) => WEEKEND_LABELS.has(d.label));
  const weekday = byDayOfWeek.filter((d) => !WEEKEND_LABELS.has(d.label));
  if (weekend.length > 0 && weekday.length > 0) {
    const wkndRate = pct(
      weekend.reduce((s, d) => s + d.noReturn, 0),
      weekend.reduce((s, d) => s + d.total, 0)
    );
    const wkdayRate = pct(
      weekday.reduce((s, d) => s + d.noReturn, 0),
      weekday.reduce((s, d) => s + d.total, 0)
    );
    if (wkndRate - wkdayRate >= 8) {
      plan.push(
        `Fins de semana são o ponto mais frágil: ${wkndRate}% de casos sem retorno aos sábados/domingos contra ${wkdayRate}% nos dias úteis. Avalie uma escala dedicada de fim de semana ou uma checagem ativa dos alertas em aberto na segunda de manhã.`
      );
    } else if (worstDay && worstDay.noReturnRate - overallNoReturnRate >= 8) {
      plan.push(
        `${worstDay.label} apresenta o maior índice de casos sem retorno (${worstDay.noReturnRate}%, contra média de ${overallNoReturnRate}%). Direcione atenção extra a esse dia.`
      );
    }
  }

  // 3. Best-performing window as a process reference
  if (bestResponseWindow && bestResponseWindow.effectiveRate >= 50) {
    plan.push(
      `Melhor desempenho de resposta: ${bestResponseWindow.label} (${bestResponseWindow.effectiveRate}% de respostas efetivas). Use essa janela como referência de processo e replique a rotina de acompanhamento nos turnos críticos.`
    );
  }

  // 4. Fallback when nothing stands out
  if (plan.length === 0) {
    plan.push(
      `Os casos sem retorno estão distribuídos de forma relativamente uniforme entre turnos, dias e horários (média de ${overallNoReturnRate}%). Mantenha o monitoramento e foque na redução do volume total de alertas em aberto.`
    );
  }

  return plan;
}
