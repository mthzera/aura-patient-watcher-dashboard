/**
 * Cross-reference logic for intercorrências:
 *
 * For each intercorrência event, check whether an AURA alert was issued
 * in the 5 days prior (inclusive). Also aggregates patterns: top reasons,
 * urgency levels, outcome trajectory, and weekly timeline.
 *
 * Patient matching: lowercase + remove accents + collapse whitespace.
 */

import type {
  BusinessUnit,
  PatientRecord,
  IntercorrenciaRecord,
  IntercorrenciaAnalysis,
  IntercorrenciaAlertMatch,
  IntercorrenciaCountItem,
  IntercorrenciaTimelinePoint,
  PriorAuraAlertForIntercorrencia,
} from "./types";
import { parseDate } from "./applyFilters";
import { isAneryFilial } from "./unitFilialMap";

const LOOKBACK_DAYS = 5;
const TOP_N = 10;

interface IntercorrenciaScope {
  startDate?: string;
  endDate?: string;
  /**
   * Anery is the only Domiciliar unit — intercorrências apply to Domiciliar
   * (and "Todos"). Hidden when Transição is selected.
   */
  businessUnit?: BusinessUnit;
}

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

function isAuraAlerted(record: PatientRecord): boolean {
  const val = normalize(record.aura_alerted);
  return val === "sim" || val === "yes" || val === "1" || val === "true";
}

function countByField(
  items: IntercorrenciaRecord[],
  field: keyof Pick<
    IntercorrenciaRecord,
    "classificacao" | "grauUrgencia" | "classificacaoDesfecho"
  >,
  fallback: string
): IntercorrenciaCountItem[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const raw = item[field]?.trim();
    const label = raw && raw.length > 0 ? raw : fallback;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  const total = items.length || 1;
  return Array.from(counts.entries())
    .map(([label, count]) => ({
      label,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, TOP_N);
}

/** ISO week start (Monday) for a given ISO date. */
function weekStart(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function buildTimeline(
  matches: IntercorrenciaAlertMatch[]
): IntercorrenciaTimelinePoint[] {
  const buckets = new Map<string, { count: number; withPriorAlert: number }>();

  for (const m of matches) {
    const iso = parseDate(m.intercorrenciaDate);
    if (!iso) continue;
    const ws = weekStart(iso);
    const prev = buckets.get(ws) ?? { count: 0, withPriorAlert: 0 };
    prev.count += 1;
    if (m.hadPriorAlert) prev.withPriorAlert += 1;
    buckets.set(ws, prev);
  }

  return Array.from(buckets.entries())
    .map(([weekStartKey, data]) => ({
      weekStart: weekStartKey,
      count: data.count,
      withPriorAlert: data.withPriorAlert,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

const EMPTY: IntercorrenciaAnalysis = {
  available: false,
  totalIntercorrencias: 0,
  withPriorAlert: 0,
  withoutPriorAlert: 0,
  topReasons: [],
  urgencyBreakdown: [],
  outcomeTrajectory: [],
  timeline: [],
  matches: [],
};

export function buildIntercorrenciaAnalysis(
  records: PatientRecord[],
  intercorrencias: IntercorrenciaRecord[],
  scope?: IntercorrenciaScope
): IntercorrenciaAnalysis {
  // Anery = única Domiciliar. Em Transição o painel não se aplica.
  if (scope?.businessUnit === "transicao") return EMPTY;

  if (intercorrencias.length === 0) return EMPTY;

  // Intercorrências: só Anery (Domiciliar). Visível em Domiciliar ou Todos.
  const scoped = intercorrencias.filter((r) => {
    if (!isAneryFilial(r.filial)) return false;
    if (!scope?.startDate && !scope?.endDate) return true;
    const d = parseDate(r.dataInicio);
    if (!d) return true;
    if (scope.startDate && d < scope.startDate) return false;
    if (scope.endDate && d > scope.endDate) return false;
    return true;
  });

  if (scoped.length === 0) {
    return {
      ...EMPTY,
      available: true,
    };
  }

  const auraRecords = records.filter(isAuraAlerted);
  const matches: IntercorrenciaAlertMatch[] = [];

  for (const inter of scoped) {
    const interDate = parseDate(inter.dataInicio);
    if (!interDate) continue;

    const patientKey = normalizeName(inter.patientName);
    if (!patientKey) continue;

    const priorAlerts: PriorAuraAlertForIntercorrencia[] = auraRecords
      .filter((r) => {
        if (normalizeName(r.patient_name) !== patientKey) return false;
        const alertDate = parseDate(r.date);
        if (!alertDate) return false;
        const diff = daysBetween(alertDate, interDate);
        return diff >= 0 && diff <= LOOKBACK_DAYS;
      })
      .map((r) => {
        const alertDate = parseDate(r.date)!;
        return {
          date: r.date ?? "",
          unit: r.unit,
          clinicalAlteration: r.clinical_alteration,
          daysBeforeIntercorrencia: daysBetween(alertDate, interDate),
        };
      })
      .sort((a, b) => b.daysBeforeIntercorrencia - a.daysBeforeIntercorrencia);

    matches.push({
      patientName: inter.patientName,
      intercorrenciaDate: inter.dataInicio ?? "",
      classificacao: inter.classificacao,
      grauUrgencia: inter.grauUrgencia,
      classificacaoDesfecho: inter.classificacaoDesfecho,
      filial: inter.filial,
      hadPriorAlert: priorAlerts.length > 0,
      priorAlerts,
    });
  }

  matches.sort((a, b) => {
    if (a.hadPriorAlert !== b.hadPriorAlert) return a.hadPriorAlert ? -1 : 1;
    return b.intercorrenciaDate.localeCompare(a.intercorrenciaDate);
  });

  const withPriorAlert = matches.filter((m) => m.hadPriorAlert).length;

  return {
    available: true,
    totalIntercorrencias: matches.length,
    withPriorAlert,
    withoutPriorAlert: matches.length - withPriorAlert,
    topReasons: countByField(scoped, "classificacao", "Não informado"),
    urgencyBreakdown: countByField(scoped, "grauUrgencia", "Não informado"),
    outcomeTrajectory: countByField(
      scoped,
      "classificacaoDesfecho",
      "Não informado"
    ),
    timeline: buildTimeline(matches),
    matches,
  };
}
