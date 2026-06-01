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
  /** "Ação Iniciação" — concrete action/reason text (used for no-return reasons) */
  initiation_action: string | null;
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
  /**
   * Alerts that received any response from the unit (not "sem retorno" and not blank).
   * Rule: sem retorno = sem triagem; each alert with a return = 1 triagem.
   */
  triagens: number;
  /** Records with a documented unit response */
  unitActions: number;
  /** Records with a favorable clinical outcome */
  favorableOutcomes: number;
  /** AURA alerts with unit return where the clinical outcome was normal/basal/stable */
  normalClinicalReturnAlerts: number;
  /** Unique patients behind normalClinicalReturnAlerts */
  normalClinicalReturnPatients: number;
  /** normalClinicalReturnAlerts / auraAlerts * 100, rounded */
  normalClinicalReturnAlertRate: number;
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
// Reinternação alert cross-reference analysis
// ---------------------------------------------------------------------------

/** A single AURA alert that preceded a discharge event of interest. */
export interface PriorAlert {
  date: string;
  unit: string | null;
  clinicalAlteration: string | null;
  /** How many days before the discharge date this alert occurred (0 = same day). */
  daysBeforeReinternacao: number;
}

/** Analysis result for one discharge event of interest (reinternation/hospitalization/death). */
export interface ReinternacaoAlertMatch {
  patientName: string;
  /** Date from "Data Alta" in the reinternações file. */
  reinternacaoDate: string;
  conditionOnDischarge: string | null;
  /** True if at least one AURA alert occurred within the 10 days prior. */
  hadPriorAlert: boolean;
  /** All AURA alerts found within 10 days before discharge (sorted: oldest first). */
  priorAlerts: PriorAlert[];
}

/** Aggregate analysis: which discharge events had a prior AURA committee notification. */
export interface ReinternacaoAlertAnalysis {
  /** False when no reinternações file has been loaded. */
  available: boolean;
  totalReinternacoes: number;
  /** Events with at least one AURA alert in the prior 10 days. */
  withPriorAlert: number;
  /** Events without any AURA alert in the prior 10 days. */
  withoutPriorAlert: number;
  matches: ReinternacaoAlertMatch[];
}

// ---------------------------------------------------------------------------
// Initiation-action breakdown (motivos, derived from "Ação Iniciação")
// ---------------------------------------------------------------------------

/** One category of the initiation-action breakdown. */
export interface InitiationReason {
  /** Stable key */
  key:
    | "semContatoTelefonico"
    | "unidadeNaoRespondeu"
    | "retornoBasal"
    | "retornoComIntervencao"
    | "naoInformado";
  /** Human label (pt-BR) */
  label: string;
  count: number;
  /** Percent of the considered total, rounded */
  percent: number;
}

/**
 * Breakdown of every record by its "Ação Iniciação" reason. Opens up "sem
 * retorno" into its sub-reasons (sem contato telefônico × unidade não
 * respondeu) and separates retorno basal × retorno com intervenção.
 */
export interface InitiationActionBreakdown {
  /** False when the "Ação Iniciação" column is absent from the data. */
  available: boolean;
  /** Total records considered (after filters). */
  total: number;
  reasons: InitiationReason[];
  /** Sum of the two "sem retorno" sub-reasons (sem contato + unidade). */
  semRetornoTotal: number;
}

// ---------------------------------------------------------------------------
// Clinical decompensation analysis (counted by PATIENT-DAY, not by row)
// ---------------------------------------------------------------------------

/** One sub-category of transient decompensation, counted by patient-day. */
export interface DecompCategory {
  key: "basal" | "comIntervencao" | "estavel";
  label: string;
  /** Distinct patient-days in this category. */
  patients: number;
  /** Percent of the transient total (patient-day), rounded. */
  percent: number;
}

/**
 * Clinical decompensation indicators. Every count is a DISTINCT PATIENT-DAY
 * (same patient on the same calendar day counts once, regardless of how many
 * rows/actions exist), not a raw row count.
 */
export interface DecompensationAnalysis {
  /** Distinct patient-days across all filtered records (denominator for %). */
  scopePatientDays: number;
  /** Distinct patient-days that had ANY decompensation (transient OR acute). */
  decompensatedPatientDays: number;

  /** Transient decompensation, split by clinical outcome. */
  transientTotal: number;
  transient: DecompCategory[];
  /** % of transient patient-days that had an effective unit response. */
  transientEffectiveRate: number;
  transientEffectivePatients: number;

  /** Acute decompensation. */
  acuteTotal: number;
  acuteEffectivePatients: number;
  acuteEffectiveRate: number;
  deteriorationReversals: number;
  /** Acute patient-days with "em monitoramento" — excluded from não reverteu. */
  acuteMonitoringPatients: number;
  avoidedReadmissions: number;
}

/** Response payload from /api/dashboard */
export interface DashboardResponse {
  metrics: DashboardMetrics;
  unitSummaries: UnitSummary[];
  timeSeries: TimeSeriesPoint[];
  responsiveness: ResponsivenessAnalysis;
  reinternacaoAlertAnalysis: ReinternacaoAlertAnalysis;
  initiationBreakdown: InitiationActionBreakdown;
  decompensation: DecompensationAnalysis;
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
