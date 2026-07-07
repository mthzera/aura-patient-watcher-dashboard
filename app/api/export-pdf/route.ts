import { NextRequest, NextResponse } from "next/server";
import { loadDashboardResponse } from "@/lib/dashboard/loadDashboardResponse";
import { buildDashboardPdf } from "@/lib/dashboard/buildDashboardPdf";
import { DashboardFilters } from "@/lib/dashboard/types";

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

  const dataSource = searchParams.get("dataSource") ?? undefined;

  try {
    const data = await loadDashboardResponse(filters);
    const pdfBytes = buildDashboardPdf(data, {
      filters,
      dataSource,
      generatedAt: new Date(),
    });

    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename = `relatorio-aura-${dateStamp}.pdf`;

    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
