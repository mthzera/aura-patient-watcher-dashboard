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
  ReinternacaoAlterationKind,
  ReinternacaoEffectivenessReason,
  ReinternacaoAlterationEffectiveness,
} from "./types";
import { applyFilters, parseDate } from "./applyFilters";
import { isAneryFilial, unitMatchesReinternacao } from "./unitFilialMap";
import { hasTriagem } from "./calculateMetrics";

const PRIOR_ALERT_DAYS = 10;

const EMPTY_ALTERATION: ReinternacaoAlterationEffectiveness = {
  total: 0,
  acted: 0,
  notActed: 0,
};

function emptyEffectiveness(): ReinternacaoAlertAnalysis["effectiveness"] {
  return {
    acted: 0,
    notActed: 0,
    byReason: {
      sem_retorno: 0,
      retorno_estavel: 0,
      paciente_mal: 0,
      retorno_bem_reinternou: 0,
      outros: 0,
    },
    byAlteration: {
      aguda: { ...EMPTY_ALTERATION },
      transitoria: { ...EMPTY_ALTERATION },
      outra: { ...EMPTY_ALTERATION },
    },
  };
}

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
    rest.businessUnit ||
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
    filters?.businessUnit ||
    filters?.clinicalAlteration ||
    filters?.clinicalOutcome ||
    filters?.auraActionStatus
  );
}

/** Patient scope for business-unit / clinical filters (and combinations). */
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

function alterationKind(alt: string | null | undefined): ReinternacaoAlterationKind {
  const n = normalize(alt);
  if (n.includes("aguda")) return "aguda";
  if (n.includes("transitoria") || n.includes("esperada")) return "transitoria";
  return "outra";
}

/**
 * Classify effectiveness for a prior alert on a patient who later reinternated.
 * Uses Intervenção Unidade + Desfecho Clínico / Resultado da Intervenção
 * (Discussão Comitê for aguda).
 */
function classifyEffectiveness(
  record: PatientRecord
): {
  acted: boolean;
  reason: ReinternacaoEffectivenessReason;
  kind: ReinternacaoAlterationKind;
} {
  const kind = alterationKind(record.clinical_alteration);
  const acted = hasTriagem(record);

  if (!acted) {
    return { acted: false, reason: "sem_retorno", kind };
  }

  const outcomeSource =
    kind === "aguda"
      ? normalize(record.committee_discussion) ||
        normalize(record.clinical_outcome) // fallback quando comitê vazio
      : normalize(record.clinical_outcome);
  const intervention = normalize(record.intervention_result);
  const combined = `${outcomeSource} ${intervention}`.trim();

  const isWell =
    combined.includes("melhora") ||
    combined.includes("basal") ||
    combined.includes("bem") ||
    combined.includes("normal") ||
    combined.includes("sem alteracao");

  const isStable =
    combined.includes("estavel") ||
    combined.includes("estabiliz");

  const isUnwell =
    combined.includes("mal") ||
    combined.includes("deterior") ||
    combined.includes("piora") ||
    combined.includes("finitude") ||
    combined.includes("reintern") ||
    combined.includes("obito") ||
    combined.includes("obit");

  // Retorno "bem"/basal/melhora but patient still reinternated
  if (isWell && !isUnwell) {
    return { acted: true, reason: "retorno_bem_reinternou", kind };
  }
  if (isStable && !isUnwell) {
    return { acted: true, reason: "retorno_estavel", kind };
  }
  if (isUnwell) {
    return { acted: true, reason: "paciente_mal", kind };
  }
  return { acted: true, reason: "outros", kind };
}

function toPriorAlert(r: PatientRecord, reinDate: string): PriorAlert {
  const alertDate = parseDate(r.date)!;
  const { acted, reason, kind } = classifyEffectiveness(r);
  return {
    date: r.date ?? "",
    unit: r.unit,
    clinicalAlteration: r.clinical_alteration,
    clinicalOutcome:
      kind === "aguda"
        ? r.committee_discussion ?? r.clinical_outcome
        : r.clinical_outcome,
    interventionUnit: r.intervention_unit,
    interventionResult: r.intervention_result,
    alterationKind: kind,
    acted,
    effectivenessReason: reason,
    daysBeforeReinternacao: daysBetween(alertDate, reinDate),
  };
}

function aggregateEffectiveness(
  matches: ReinternacaoAlertMatch[]
): ReinternacaoAlertAnalysis["effectiveness"] {
  const eff = emptyEffectiveness();
  for (const m of matches) {
    if (!m.hadPriorAlert || m.effectivenessReason == null || m.acted == null) {
      continue;
    }
    if (m.acted) eff.acted++;
    else eff.notActed++;
    eff.byReason[m.effectivenessReason]++;

    const kind = m.alterationKind ?? "outra";
    const bucket = eff.byAlteration[kind];
    bucket.total++;
    if (m.acted) bucket.acted++;
    else bucket.notActed++;
  }
  return eff;
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
      effectiveness: emptyEffectiveness(),
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
      effectiveness: emptyEffectiveness(),
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
      .map((r) => toPriorAlert(r, reinDate))
      // Closest to discharge first (most recent prior alert)
      .sort((a, b) => a.daysBeforeReinternacao - b.daysBeforeReinternacao);

    const primary = priorAlerts[0] ?? null;

    matches.push({
      patientName: rein.patientName,
      reinternacaoDate: rein.dischargeDate ?? "",
      filial: rein.filial,
      unit: rein.unit,
      conditionOnDischarge: rein.conditionOnDischarge,
      isAnery: isAneryFilial(rein.filial, rein.unit),
      hadPriorAlert: priorAlerts.length > 0,
      priorAlerts,
      effectivenessReason: primary?.effectivenessReason ?? null,
      acted: primary?.acted ?? null,
      alterationKind: primary?.alterationKind ?? null,
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
    effectiveness: aggregateEffectiveness(matches),
    matches,
  };
}
