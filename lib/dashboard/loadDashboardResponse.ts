import { loadSpreadsheetData } from "@/lib/dashboard/loadSpreadsheetData";
import { applyFilters } from "@/lib/dashboard/applyFilters";
import {
  calculateMetrics,
  calculateUnitSummaries,
  buildTimeSeries,
  calculateResponsiveness,
  calculateInitiationBreakdown,
  calculateNoReturnReasons,
  calculateReturnReasons,
  calculateAuraAlertSplit,
  calculateDecompensation,
  calculatePatientAlertRanking,
} from "@/lib/dashboard/calculateMetrics";
import { parseReinternacoes } from "@/lib/csv/parseReinternacoes";
import { parseIntercorrencias } from "@/lib/csv/parseIntercorrencias";
import { buildReinternacaoAlertAnalysis } from "@/lib/dashboard/buildReinternacaoAnalysis";
import { buildIntercorrenciaAnalysis } from "@/lib/dashboard/buildIntercorrenciaAnalysis";
import { DashboardFilters, DashboardResponse } from "@/lib/dashboard/types";

/** Loads and computes the full dashboard payload for a given filter set. */
export async function loadDashboardResponse(
  filters: DashboardFilters
): Promise<DashboardResponse> {
  const { rows, warnings, lastFetchAt } = await loadSpreadsheetData();
  const filtered = applyFilters(rows, filters);
  const reinternacoes = await parseReinternacoes();
  const intercorrencias = await parseIntercorrencias();

  return {
    metrics: calculateMetrics(filtered),
    unitSummaries: calculateUnitSummaries(filtered),
    timeSeries: buildTimeSeries(filtered),
    responsiveness: calculateResponsiveness(filtered),
    initiationBreakdown: calculateInitiationBreakdown(filtered),
    noReturnReasons: calculateNoReturnReasons(filtered),
    returnReasons: calculateReturnReasons(filtered),
    auraAlertSplit: calculateAuraAlertSplit(filtered),
    decompensation: calculateDecompensation(filtered),
    patientAlertRanking: calculatePatientAlertRanking(filtered),
    reinternacaoAlertAnalysis: buildReinternacaoAlertAnalysis(
      rows,
      reinternacoes,
      filters
    ),
    intercorrenciaAnalysis: buildIntercorrenciaAnalysis(rows, intercorrencias, {
      startDate: filters.startDate,
      endDate: filters.endDate,
    }),
    totalRows: rows.length,
    filteredRows: filtered.length,
    lastFetchAt,
    warnings,
  };
}
