/**
 * Builds per-record humanized alert narratives and the aggregate executive
 * summary for the "Resumo Interpretativo do Alerta" feature.
 *
 * All logic is pure (no I/O). Dates are parsed with the same helper used
 * elsewhere in the dashboard so formatting is consistent.
 */

import type {
  PatientRecord,
  ReinternacaoRecord,
  AlertNarrative,
  AlertExecutiveSummary,
} from "./types";
import { parseDate } from "./applyFilters";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(val: string | null | undefined): string {
  return (val ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Normalize a patient name for fuzzy matching: lowercase + no accents +
 * collapse whitespace. Allows matching "MOISES DE CAMPOS" ↔ "Moises de Campos".
 */
function normalizeName(val: string | null | undefined): string {
  return normalize(val).replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Reinternações index
// ---------------------------------------------------------------------------

/** Build a lookup map: normalizedName → sorted list of ReinternacaoRecord. */
export function buildReinternacaoIndex(
  reinternacoes: ReinternacaoRecord[]
): Map<string, ReinternacaoRecord[]> {
  const index = new Map<string, ReinternacaoRecord[]>();
  for (const r of reinternacoes) {
    const key = normalizeName(r.patientName);
    if (!key) continue;
    const arr = index.get(key) ?? [];
    arr.push(r);
    index.set(key, arr);
  }
  // Sort each patient's events by dischargeDate ascending so we can pick
  // the first event that comes on or after the alert date.
  for (const [, arr] of index) {
    arr.sort((a, b) => {
      const da = parseDate(a.dischargeDate) ?? "";
      const db = parseDate(b.dischargeDate) ?? "";
      return da < db ? -1 : da > db ? 1 : 0;
    });
  }
  return index;
}

/**
 * Find the earliest reinternação event for a patient that occurs on or after
 * the alert date. Returns null when no match is found.
 */
function findNextEvent(
  record: PatientRecord,
  index: Map<string, ReinternacaoRecord[]>
): ReinternacaoRecord | null {
  const key = normalizeName(record.patient_name);
  if (!key) return null;
  const events = index.get(key);
  if (!events || events.length === 0) return null;

  const alertDate = parseDate(record.date);
  if (!alertDate) return events[0]; // no alert date → return first event

  // Find first event on-or-after alert date
  const match = events.find((e) => {
    const ed = parseDate(e.dischargeDate);
    return ed !== null && ed >= alertDate;
  });
  // Fall back to most recent event if all events are before the alert date
  return match ?? events[events.length - 1] ?? null;
}

/** Returns true when the intervention result conveys "no return / N/A". */
export function isInterventionNoReturn(value: string | null | undefined): boolean {
  if (!value) return true;
  const n = normalize(value);
  return (
    n === "" ||
    n === "n/a" ||
    n === "na" ||
    n === "nao se aplica" ||
    n === "nao aplica" ||
    n === "nao retornou" ||
    n === "sem retorno" ||
    n === "-" ||
    n === "—"
  );
}

/** Detect event type from either the reinternações conditionOnDischarge or the
 *  AURA monitoring_status column. */
function detectEventType(
  conditionOrStatus: string | null
): "reinternação" | "óbito" | "outro" | null {
  if (!conditionOrStatus) return null;
  const n = normalize(conditionOrStatus);
  if (n.includes("obito") || n.includes("obit")) return "óbito";
  if (
    n.includes("hospitalizacao") ||
    n.includes("hospitalization") ||
    n.includes("reinternal") ||
    n.includes("reinternacao")
  )
    return "reinternação";
  return "outro";
}

/**
 * Returns the day difference (alert → discharge).
 * Positive = alert before discharge; 0 = same day; negative = after discharge.
 */
function daysBetween(
  alertDateStr: string | null,
  dischargeDateStr: string | null
): number | null {
  const a = parseDate(alertDateStr);
  const d = parseDate(dischargeDateStr);
  if (!a || !d) return null;
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round(
    (new Date(d).getTime() - new Date(a).getTime()) / msPerDay
  );
}

function timingPhrase(
  days: number | null,
  eventType: "reinternação" | "óbito" | "outro" | null
): string {
  const suffix =
    eventType === "óbito"
      ? "do óbito"
      : eventType === "reinternação"
      ? "da reinternação"
      : "do evento";

  if (days === null) return `em data registrada`;
  if (days === 0) return `no mesmo dia ${suffix}`;
  if (days > 0)
    return `${days} dia${days === 1 ? "" : "s"} antes ${suffix}`;
  return `${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"} após ${suffix}`;
}

// ---------------------------------------------------------------------------
// Per-record narrative builder
// ---------------------------------------------------------------------------

export function buildNarrative(
  record: PatientRecord,
  index: number,
  reinternacaoIndex?: Map<string, ReinternacaoRecord[]>
): AlertNarrative {
  const alteration =
    record.clinical_alteration?.trim() ?? "alteração clínica não especificada";
  const interventionResult = record.intervention_result?.trim() ?? null;
  const clinicalOutcome = record.clinical_outcome?.trim() ?? null;
  const auraAction = record.aura_action_status?.trim() ?? null;
  const monitoringStatus = record.monitoring_status?.trim() ?? null;

  // --- Resolve event date + type -------------------------------------------
  // Priority: reinternações file > discharge_date + monitoring_status from AURA CSV
  let resolvedDischargeDate = record.discharge_date ?? null;
  let resolvedEventType: "reinternação" | "óbito" | "outro" | null = null;
  let matchedReinternacao: ReinternacaoRecord | null = null;

  if (reinternacaoIndex) {
    matchedReinternacao = findNextEvent(record, reinternacaoIndex);
    if (matchedReinternacao) {
      resolvedDischargeDate = matchedReinternacao.dischargeDate ?? resolvedDischargeDate;
      resolvedEventType = detectEventType(matchedReinternacao.conditionOnDischarge);
    }
  }

  // Fall back to AURA CSV fields when no reinternação match
  if (!resolvedEventType) {
    resolvedEventType = detectEventType(monitoringStatus);
  }

  const days = daysBetween(record.date, resolvedDischargeDate);
  const timing = timingPhrase(days, resolvedEventType);
  const noReturn = isInterventionNoReturn(interventionResult);

  // ── Core sentence ──────────────────────────────────────────────────────
  let text: string;

  if (noReturn) {
    text =
      `O paciente foi alertado por ${alteration.toLowerCase()} ${timing}, ` +
      `porém não houve retorno da clínica/unidade sobre a intervenção realizada.`;
  } else {
    const resultLabel = interventionResult!;
    const outcomeLabel = clinicalOutcome
      ? clinicalOutcome.toLowerCase()
      : "não registrado";
    text =
      `O paciente foi alertado por ${alteration.toLowerCase()} ${timing}. ` +
      `O retorno da intervenção foi classificado como ${resultLabel}, ` +
      `com desfecho clínico ${outcomeLabel}.`;
  }

  // ── Optional complements ───────────────────────────────────────────────
  if (auraAction) {
    text += ` A ação AURA registrada foi: ${auraAction.toLowerCase()}.`;
  }
  if (monitoringStatus) {
    text += ` Status final do monitoramento: ${monitoringStatus.toLowerCase()}.`;
  }

  return {
    index,
    patientName: record.patient_name,
    date: record.date,
    unit: record.unit,
    alertReason: record.clinical_alteration,
    interventionResult,
    clinicalOutcome,
    auraAction,
    monitoringStatus,
    dischargeDate: resolvedDischargeDate,
    daysBeforeDischarge: days,
    eventType: resolvedEventType,
    isNoReturn: noReturn,
    summaryText: text,
  };
}

// ---------------------------------------------------------------------------
// Batch builder
// ---------------------------------------------------------------------------

export function buildAlertNarratives(
  records: PatientRecord[],
  reinternacoes?: ReinternacaoRecord[]
): AlertNarrative[] {
  const index =
    reinternacoes && reinternacoes.length > 0
      ? buildReinternacaoIndex(reinternacoes)
      : undefined;
  return records.map((r, i) => buildNarrative(r, i, index));
}

// ---------------------------------------------------------------------------
// Executive summary
// ---------------------------------------------------------------------------

export function buildAlertExecutiveSummary(
  records: PatientRecord[]
): AlertExecutiveSummary {
  const alerted = records.filter((r) => {
    const v = normalize(r.aura_alerted);
    return v === "s" || v === "sim" || v === "yes" || v === "1" || v === "true";
  });

  const noReturnAlerts = alerted.filter((r) =>
    isInterventionNoReturn(r.intervention_result)
  );

  const pct =
    alerted.length > 0
      ? Math.round((noReturnAlerts.length / alerted.length) * 100)
      : 0;

  const summaryText =
    alerted.length === 0
      ? "Nenhum alerta AURA registrado no período selecionado."
      : noReturnAlerts.length === 0
      ? `Dos ${alerted.length} eventos com alerta AURA, todos possuem retorno registrado da clínica/unidade.`
      : `Dos ${alerted.length} eventos que tiveram alerta AURA, ` +
        `${noReturnAlerts.length} (${pct}%) apresentaram pelo menos um alerta sem retorno ` +
        `da clínica/unidade. Isso indica oportunidade de melhoria no fluxo de resposta ao alerta Watcher/AURA.`;

  return {
    totalAlerted: alerted.length,
    noReturnCount: noReturnAlerts.length,
    noReturnPercentage: pct,
    noReturnAlerts: noReturnAlerts.map((r) => ({
      patientName: r.patient_name,
      date: r.date,
      unit: r.unit,
      alertReason: r.clinical_alteration,
    })),
    summaryText,
  };
}
