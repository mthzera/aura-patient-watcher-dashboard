import { NextRequest, NextResponse } from "next/server";
import { loadSpreadsheetData } from "@/lib/dashboard/loadSpreadsheetData";
import { applyFilters } from "@/lib/dashboard/applyFilters";
import {
  calculateMetrics,
  calculateUnitSummaries,
  buildTimeSeries,
  calculateResponsiveness,
  calculateInitiationBreakdown,
  calculateDecompensation,
  calculatePatientAlertRanking,
} from "@/lib/dashboard/calculateMetrics";
import { parseReinternacoes } from "@/lib/csv/parseReinternacoes";
import { buildReinternacaoAlertAnalysis } from "@/lib/dashboard/buildReinternacaoAnalysis";
import { DashboardFilters, DashboardResponse } from "@/lib/dashboard/types";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const filters: DashboardFilters = {
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    unit: searchParams.get("unit") ?? undefined,
    clinicalAlteration: searchParams.get("clinicalAlteration") ?? undefined,
    clinicalOutcome: searchParams.get("clinicalOutcome") ?? undefined,
    auraActionStatus: searchParams.get("auraActionStatus") ?? undefined,
  };

  try {
    const { rows, warnings, lastFetchAt } = await loadSpreadsheetData();
    const filtered = applyFilters(rows, filters);

    // Load reinternações file if available (no cache needed — small file)
    const reinternacoes = await parseReinternacoes();

    const response: DashboardResponse = {
      metrics: calculateMetrics(filtered),
      unitSummaries: calculateUnitSummaries(filtered),
      timeSeries: buildTimeSeries(filtered),
      responsiveness: calculateResponsiveness(filtered),
      initiationBreakdown: calculateInitiationBreakdown(filtered),
      decompensation: calculateDecompensation(filtered),
      patientAlertRanking: calculatePatientAlertRanking(filtered),
      // Reinternações × Aura segue APENAS o filtro de data (pela Data Alta da
      // reinternação). Unidade/demais filtros não se aplicam aqui. A busca de
      // alertas nos 10 dias anteriores usa todos os registros (rows).
      reinternacaoAlertAnalysis: buildReinternacaoAlertAnalysis(rows, reinternacoes, {
        startDate: filters.startDate,
        endDate: filters.endDate,
      }),
      totalRows: rows.length,
      filteredRows: filtered.length,
      lastFetchAt,
      warnings,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
