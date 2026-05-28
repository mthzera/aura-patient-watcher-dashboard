import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { loadSpreadsheetData } from "@/lib/dashboard/loadSpreadsheetData";
import { applyFilters } from "@/lib/dashboard/applyFilters";
import {
  calculateMetrics,
  calculateUnitSummaries,
  buildTimeSeries,
} from "@/lib/dashboard/calculateMetrics";
import { DashboardFilters, DashboardResponse } from "@/lib/dashboard/types";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Não autenticado", authenticated: false }, { status: 401 });
  }

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
    const { rows, warnings, lastFetchAt } = await loadSpreadsheetData(
      session.accessToken
    );
    const filtered = applyFilters(rows, filters);

    const response: DashboardResponse = {
      metrics: calculateMetrics(filtered),
      unitSummaries: calculateUnitSummaries(filtered),
      timeSeries: buildTimeSeries(filtered),
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
