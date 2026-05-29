/**
 * Shared TypeScript types for the AURA Patient Watcher Dashboard.
 */

// ---------------------------------------------------------------------------
// Reinternações supplementary dataset
// ---------------------------------------------------------------------------

/**
 * One row from the "Reinternações" CSV (e.g. "Reinternações Anery 2026").
 * Used to cross-reference AURA alerts with actual hospitalization/death events.
 */
export interface ReinternacaoRecord {
  /** "Nome" — patient full name (primary join key) */
  patientName: string;
  /** "Status" — e.g. "Alta" */
  status: string | null;
  /** "Operadora" */
  operadora: string | null;
  /** "Motivo da Inclusão" */
  motivoInclusao: string | null;
  /** "Idade" */
  idade: string | null;
  /** "Sexo" */
  sexo: string | null;
  /** "Data do Registro" */
  dataRegistro: string | null;
  /** "Data Início Atendimento" */
  dataInicioAtendimento: string | null;
  /** "ID Carteira" */
  idCarteira: string | null;
  /** "Data Alta" — the event date (hospitalization or death) */
  dischargeDate: string | null;
  /** "Filial" */
  filial: string | null;
  /** "Condição Alta" — "Hospitalização" | "Óbito" */
  conditionOnDischarge: string | null;
  /** "ID Paciente" */
  idPaciente: string | null;
  /** "Nro Atend" */
  nroAtend: string | null;
}

/** A single normalized patient record row from the spreadsheet. */
export interface PatientRecord {
  date: string | null;
  unit: string | null;
  patient_name: string | null;
  medical_record: string | null;
  patient_id: string | null;
  clinical_alteration: string | null;
  aura_alerted: string | null;
  aura_action_status: string | null;
  clinical_outcome: string | null;
  observations: string | null;
  responsible: string | null;
  /** "Data Alta" — discharge (or death) date, DD/MM/YYYY */
  discharge_date: string | null;
  /** "Data Internação" — admission date */
  admission_date: string | null;
  /** "Resultado da Intervenção" — what the unit reported after acting */
  intervention_result: string | null;
  /** "Status" — final monitoring status (Reinternação, Óbito, Pcte Watcher …) */
  monitoring_status: string | null;
  [key: string]: unknown;
}

/** Aggregated KPI metrics calculated from filtered records. */
export interface DashboardMetrics {
  /** Total number of records matching active filters */
  totalRecords: number;
  /** Distinct patients (by patient_name + medical_record) */
  uniquePatients: number;
  /** Records where AURA alert was flagged ("Sim") */
  auraAlerts: number;
  /** Records with a documented unit response */
  unitActions: number;
  /** Records with a favorable clinical outcome */
  favorableOutcomes: number;
  /**
   * Closed-loop effectiveness: among cases that had both a unit action
   * AND a registered outcome, what % had a favorable outcome.
   */
  closedLoopEffectivenessRate: number;
  /** Records where unit action shows "sem retorno" – no follow-up registered */
  noReturnCases: number;

  // Transient decompensation breakdown
  transientDecompensations: number;
  transientEffectiveActions: number;
  transientEffectiveRate: number;

  // Acute decompensation breakdown
  acuteDecompensations: number;
  acuteEffectiveActions: number;
  acuteEffectiveRate: number;

  /** Cases coded as clinical deterioration reversal */
  deteriorationReversals: number;
  /** Estimated avoided readmissions (proxy metric) */
  avoidedReadmissions: number;
}

/**
 * A single temporal bucket (shift / day-of-week / hour band) with its
 * no-return and effective-response counts.
 */
export interface TemporalBucket {
  /** Display label, e.g. "MANHÃ", "Segunda", "08–11h" */
  label: string;
  /** Total records in this bucket */
  total: number;
  /** Records flagged "sem retorno" */
  noReturn: number;
  /** No-return rate (% of total) */
  noReturnRate: number;
  /** Records with an effective response */
  effective: number;
  /** Effective-response rate (% of total) */
  effectiveRate: number;
}

/**
 * Temporal responsiveness analysis: WHEN does the closed loop break, and
 * WHEN does the unit respond best. Powers the Improvement Opportunity panel.
 */
export interface ResponsivenessAnalysis {
  /** False when the data lacks the columns needed to compute this */
  available: boolean;
  /** Breakdown by work shift (Turno Escala) */
  byShift: TemporalBucket[];
  /** Breakdown by day of week (derived from the date) */
  byDayOfWeek: TemporalBucket[];
  /** Breakdown by 4-hour band (derived from event time) */
  byHourBand: TemporalBucket[];
  /** Shift with the highest no-return rate (the weakest link) */
  worstShift: TemporalBucket | null;
  /** Shift with the lowest no-return rate */
  bestShift: TemporalBucket | null;
  /** Day of week with the highest no-return rate */
  worstDay: TemporalBucket | null;
  /** Window (shift or band) with the highest effective-response rate */
  bestResponseWindow: TemporalBucket | null;
  /** Overall no-return rate across all records (baseline for comparison) */
  overallNoReturnRate: number;
  /** Auto-generated, data-driven action plan suggestions */
  actionPlan: string[];
}

/** Per-unit aggregated row for the unit management table. */
export interface UnitSummary {
  unit: string;
  totalRecords: number;
  auraAlerts: number;
  unitActions: number;
  favorableOutcomes: number;
  closedLoopEffectivenessRate: number;
  noReturnCases: number;
}

/** Time-series data point for trend charts. */
export interface TimeSeriesPoint {
  date: string;
  auraAlerts: number;
  unitActions: number;
  favorableOutcomes: number;
  noReturnCases: number;
}

/** Active filter state sent as query parameters to /api/dashboard */
export interface DashboardFilters {
  startDate?: string; // ISO date string YYYY-MM-DD
  endDate?: string;
  unit?: string;
  clinicalAlteration?: string;
  clinicalOutcome?: string;
  auraActionStatus?: string;
}

// ---------------------------------------------------------------------------
// Alert narrative types
// ---------------------------------------------------------------------------

/** Humanized interpretive summary for a single alert record. */
export interface AlertNarrative {
  /** Zero-based position in the filtered record list (for stable table keys) */
  index: number;
  patientName: string | null;
  date: string | null;
  unit: string | null;
  alertReason: string | null;
  interventionResult: string | null;
  clinicalOutcome: string | null;
  auraAction: string | null;
  monitoringStatus: string | null;
  dischargeDate: string | null;
  /** Positive = alert was N days BEFORE discharge; 0 = same day; null = no date data */
  daysBeforeDischarge: number | null;
  eventType: "reinternação" | "óbito" | "outro" | null;
  /** True when intervention_result is N/A, empty, or equivalent */
  isNoReturn: boolean;
  /** The full humanized phrase */
  summaryText: string;
}

/** Aggregate insights about alerts with no unit return. */
export interface AlertExecutiveSummary {
  /** Records where AURA alert was triggered (aura_alerted = S/Sim) */
  totalAlerted: number;
  /** Among alerted, how many had intervention_result = N/A / empty */
  noReturnCount: number;
  /** noReturnCount / totalAlerted * 100, rounded */
  noReturnPercentage: number;
  /** Slim list of no-return alerts for the detail callout */
  noReturnAlerts: {
    patientName: string | null;
    date: string | null;
    unit: string | null;
    alertReason: string | null;
  }[];
  /** Ready-to-display summary sentence */
  summaryText: string;
}

/** Response payload from /api/dashboard */
export interface DashboardResponse {
  metrics: DashboardMetrics;
  unitSummaries: UnitSummary[];
  timeSeries: TimeSeriesPoint[];
  responsiveness: ResponsivenessAnalysis;
  alertNarratives: AlertNarrative[];
  executiveSummary: AlertExecutiveSummary;
  totalRows: number;
  filteredRows: number;
  lastFetchAt: string | null;
  warnings: string[];
}

/** Response payload from /api/filters */
export interface FiltersResponse {
  units: string[];
  clinicalAlterationTypes: string[];
  clinicalOutcomes: string[];
  auraActionStatuses: string[];
  minDate: string | null;
  maxDate: string | null;
}

/** Response payload from /api/health */
export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  lastFetchAt: string | null;
  dataSource: string;
  graphConnected: boolean;
  totalRowsLoaded: number;
  lastError: string | null;
}
