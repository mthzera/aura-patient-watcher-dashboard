/**
 * Shared TypeScript types for the AURA Patient Watcher Dashboard.
 */

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

/** Response payload from /api/dashboard */
export interface DashboardResponse {
  metrics: DashboardMetrics;
  unitSummaries: UnitSummary[];
  timeSeries: TimeSeriesPoint[];
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
