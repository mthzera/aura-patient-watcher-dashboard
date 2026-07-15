import { NextRequest, NextResponse } from "next/server";
import { loadDashboardResponse } from "@/lib/dashboard/loadDashboardResponse";
import { DashboardFilters } from "@/lib/dashboard/types";
import { parseBusinessUnit } from "@/lib/dashboard/businessUnit";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const filters: DashboardFilters = {
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    businessUnit: parseBusinessUnit(searchParams.get("businessUnit")),
    unit: searchParams.get("unit") ?? undefined,
    clinicalAlteration: searchParams.get("clinicalAlteration") ?? undefined,
    clinicalOutcome: searchParams.get("clinicalOutcome") ?? undefined,
    auraActionStatus: searchParams.get("auraActionStatus") ?? undefined,
  };

  try {
    const response = await loadDashboardResponse(filters);
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
