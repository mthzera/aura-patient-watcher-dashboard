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
  /** "Data Alta" / "Data da Reinternação" — event date */
  dischargeDate: string | null;
  /** "Filial" (exportação de altas Anery) */
  filial: string | null;
  /** "Unidade" (exportação Command Center: ABV, MO, IB, …) */
  unit: string | null;
  /** "Condição Alta" / "Desfecho" */
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
  /** "Intervenção Unidade" — "Sim" | "Reavaliação" | "Sem Retorno" | "Não" | … */
  intervention_unit: string | null;
  /** "NEWS2 (Último)" — National Early Warning Score 2 */
  news2_score: string | null;
  [key: string]: unknown;
}

/** Aggregated KPI metrics calculated from filtered records. */
export interface DashboardMetrics {
  /** Total number of records matching active filters */
  totalRecords: number;
  /** Distinct patients (by patient_name + medical_record) */
  uniquePatients: number;
  /** Records where "Alertado AURA?" is blank / N/A (unknown) */
  auraAlertFlagMissing: number;
  /** Records where AURA alert was flagged ("Sim") */
  auraAlerts: number;
  /**
   * AURA alerts that received any unit response (alias kept for compatibility).
   * Same as alertsWithReturn.
   */
  triagens: number;
  /** AURA alerts with a documented unit response (not "sem retorno") */
  alertsWithReturn: number;
  /** AURA alerts without unit response */
  auraAlertsNoReturn: number;
  /** alertResponseRate: alertsWithReturn / auraAlerts × 100 (one decimal) */
  alertResponseRate: number;
  /** auraAlertsNoReturn / auraAlerts × 100, rounded */
  auraAlertsNoReturnRate: number;
  /** Records with a documented unit response */
  unitActions: number;
  /** Records with a favorable clinical outcome */
  favorableOutcomes: number;
  /** Records with any registered clinical outcome (non-empty desfecho) */
  registeredOutcomes: number;
  /** AURA alerts with Desfecho Clínico preenchido */
  registeredOutcomesAuraAlerts: number;
  /** registeredOutcomesAuraAlerts / auraAlerts × 100, rounded */
  registeredOutcomesAuraAlertsRate: number;
  /** AURA alerts missing Desfecho Clínico (auraAlerts - registeredOutcomesAuraAlerts) */
  registeredOutcomesAuraAlertsMissing: number;
  /** AURA alerts with unit return where the clinical outcome was normal/basal/stable */
  normalClinicalReturnAlerts: number;
  /** Unique patients behind normalClinicalReturnAlerts */
  normalClinicalReturnPatients: number;
  /** normalClinicalReturnAlerts / alertsWithReturn × 100 (one decimal), 0 if none */
  normalClinicalReturnAmongReturnRate: number;
  /** normalClinicalReturnAlerts / auraAlerts × 100, rounded */
  normalClinicalReturnAlertRate: number;
  /**
   * Closed-loop effectiveness: among cases that had both a unit action
   * AND a registered outcome, what % had a favorable outcome.
   */
  closedLoopEffectivenessRate: number;
  /** Denominator for closedLoopEffectivenessRate (unit action AND desfecho preenchido) */
  closedLoopEffectivenessDenominator: number;
  /** Numerator for closedLoopEffectivenessRate (favorable outcomes among denominator) */
  closedLoopEffectivenessNumerator: number;
  /** Records with unit action but missing Desfecho Clínico */
  closedLoopMissingOutcomeAmongActions: number;
  /**
   * @deprecated Use auraAlertsNoReturn — sem retorno só conta com alerta AURA.
   */
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
  /** AURA alerts flagged sem retorno in this bucket */
  noReturn: number;
  /** No-return rate (% of AURA alerts in bucket) */
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
  /** "Filial" from altas export, or "Unidade" from Command Center export. */
  filial: string | null;
  /** Unidade assistencial when present (Command Center). */
  unit: string | null;
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
// Intercorrências supplementary dataset
// ---------------------------------------------------------------------------

/** One row from the "Intercorrências" CSV (e.g. Anery intercorrências export). */
export interface IntercorrenciaRecord {
  nr: string | null;
  tipoIntercorrencia: string | null;
  grauUrgencia: string | null;
  /** "Classificação" — primary clinical reason for the intercorrência */
  classificacao: string | null;
  nroAtendimento: string | null;
  patientName: string;
  dataMaxResolucao: string | null;
  /** "Data Início" — event start date */
  dataInicio: string | null;
  status: string | null;
  dataFim: string | null;
  operadora: string | null;
  /** "Classificação do Desfecho" — outcome trajectory */
  classificacaoDesfecho: string | null;
  motivoAtendimento: string | null;
  gerouAtendUnidMovel: string | null;
  filial: string | null;
}

export interface IntercorrenciaCountItem {
  label: string;
  count: number;
  percent: number;
}

/** AURA alert that preceded an intercorrência within the lookback window. */
export interface PriorAuraAlertForIntercorrencia {
  date: string;
  unit: string | null;
  clinicalAlteration: string | null;
  /** Days from alert to intercorrência (0 = same day). */
  daysBeforeIntercorrencia: number;
}

/** Cross-reference result for one intercorrência event. */
export interface IntercorrenciaAlertMatch {
  patientName: string;
  intercorrenciaDate: string;
  classificacao: string | null;
  grauUrgencia: string | null;
  classificacaoDesfecho: string | null;
  filial: string | null;
  /** True if an AURA alert occurred within 5 days before the intercorrência. */
  hadPriorAlert: boolean;
  priorAlerts: PriorAuraAlertForIntercorrencia[];
}

/** Weekly volume bucket for intercorrência timeline. */
export interface IntercorrenciaTimelinePoint {
  weekStart: string;
  count: number;
  withPriorAlert: number;
}

/** Aggregate intercorrência analysis with patterns and AURA cross-reference. */
export interface IntercorrenciaAnalysis {
  available: boolean;
  totalIntercorrencias: number;
  withPriorAlert: number;
  withoutPriorAlert: number;
  /** Top clinical reasons (Classificação). */
  topReasons: IntercorrenciaCountItem[];
  /** Distribution by urgency level. */
  urgencyBreakdown: IntercorrenciaCountItem[];
  /** Outcome trajectory (Classificação do Desfecho). */
  outcomeTrajectory: IntercorrenciaCountItem[];
  /** Weekly intercorrência volume with AURA overlap. */
  timeline: IntercorrenciaTimelinePoint[];
  matches: IntercorrenciaAlertMatch[];
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

/** Breakdown of AURA alerts sem retorno by initiation reason (Ação Iniciação). */
export interface NoReturnReasonsBreakdown {
  available: boolean;
  /** Alertas AURA sem resposta da unidade */
  totalNoReturn: number;
  /** Ação Iniciação = "Sem retorno da unidade" */
  unidadeNaoRespondeu: number;
  /** Ação Iniciação = "Sem retorno contato telefônico" */
  semContatoTelefonico: number;
  /** Catch-all: blank, erro de registro, or any other unrecognized text */
  semInformacao: number;
}

/**
 * Desfecho Clínico counts for one Alteração Clínica group (Aguda or Esperada).
 * Categories vary per group but share the same shape for convenience.
 */
export interface DesfechoBreakdown {
  total: number;
  melhoraClinica: number;
  condicaoBasal: number;
  finitude: number;
  reintercacao: number;
  erroRegistro: number;
  semRetorno: number;
  semInformacao: number;
}

/** Breakdown of AURA alerts com retorno (Intervenção Unidade = Sim | Reavaliação). */
export interface ReturnReasonsBreakdown {
  available: boolean;
  totalWithReturn: number;
  /** Records with "Descompensação Aguda" as Alteração Clínica */
  aguda: DesfechoBreakdown;
  /** Records with "Descompensação Transitória Esperada" as Alteração Clínica */
  esperada: DesfechoBreakdown;
  /** Com retorno but Alteração Clínica is blank or unrecognized */
  outros: number;
}

/** Visão geral: alertas AURA = com retorno + sem retorno. */
export interface AuraAlertSplitBreakdown {
  available: boolean;
  totalAuraAlerts: number;
  alertsWithReturn: number;
  auraAlertsNoReturn: number;
  sumMatchesTotal: boolean;
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
  /** Count of DISTINCT patients (not patient-days) with acute decompensation. */
  acuteUniquePatients: number;
  acuteEffectivePatients: number;
  acuteEffectiveRate: number;
  deteriorationReversals: number;
  /** Acute patient-days with "em monitoramento" — excluded from não reverteu. */
  acuteMonitoringPatients: number;
  avoidedReadmissions: number;
  /** Per-patient detail list for the acute decompensation card. */
  acutePatientDetails: AcutePatientDetail[];
}

/** Summary of one unique patient's acute decompensation episode. */
export interface AcutePatientDetail {
  patientName: string;
  unit: string | null;
  /** Number of distinct patient-days with acute decompensation. */
  days: number;
  /** Consolidated outcome across all patient-days (worst-case priority). */
  outcome: "reverteu" | "nao_reverteu" | "monitoramento";
}

/** Per-patient split of transient alerts (row counts). */
export interface TransientAlertBreakdown {
  basal: number;
  comIntervencao: number;
  estavel: number;
  outros: number;
}

/** One patient in an alert-frequency ranking. */
export interface RankedPatientAlerts {
  patientName: string;
  unit: string | null;
  /** Total alert rows for this patient in the ranking scope. */
  total: number;
  /** Highest NEWS2 (Último) among this patient's rows in the scope. */
  news2Score: number | null;
  transientBreakdown?: TransientAlertBreakdown;
}

/** Top patients by transient vs acute decompensation alert volume. */
export interface PatientAlertRanking {
  limit: number;
  transient: RankedPatientAlerts[];
  acute: RankedPatientAlerts[];
}

/** Response payload from /api/dashboard */
export interface DashboardResponse {
  metrics: DashboardMetrics;
  unitSummaries: UnitSummary[];
  timeSeries: TimeSeriesPoint[];
  responsiveness: ResponsivenessAnalysis;
  reinternacaoAlertAnalysis: ReinternacaoAlertAnalysis;
  intercorrenciaAnalysis: IntercorrenciaAnalysis;
  initiationBreakdown: InitiationActionBreakdown;
  noReturnReasons: NoReturnReasonsBreakdown;
  returnReasons: ReturnReasonsBreakdown;
  auraAlertSplit: AuraAlertSplitBreakdown;
  decompensation: DecompensationAnalysis;
  patientAlertRanking: PatientAlertRanking;
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
