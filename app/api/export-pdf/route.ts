import { NextRequest, NextResponse } from "next/server";
import { loadDashboardResponse } from "@/lib/dashboard/loadDashboardResponse";
import { buildDashboardPdf } from "@/lib/dashboard/buildDashboardPdf";
import { buildExecutivePdf } from "@/lib/dashboard/buildExecutivePdf";
import { DashboardFilters } from "@/lib/dashboard/types";
import { parseBusinessUnit } from "@/lib/dashboard/businessUnit";

export type PdfExportType = "executive" | "analytical";

function resolveExportType(raw: string | null): PdfExportType {
  if (raw === "executive" || raw === "resumo" || raw === "executivo") {
    return "executive";
  }
  return "analytical";
}

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

  const dataSource = searchParams.get("dataSource") ?? undefined;
  const exportType = resolveExportType(searchParams.get("type"));

  try {
    const data = await loadDashboardResponse(filters);
    const meta = {
      filters,
      dataSource,
      generatedAt: new Date(),
    };

    const pdfBytes =
      exportType === "executive"
        ? buildExecutivePdf(data, meta)
        : buildDashboardPdf(data, meta);

    const dateStamp = new Date().toISOString().slice(0, 10);
    const filename =
      exportType === "executive"
        ? `resumo-executivo-aura-${dateStamp}.pdf`
        : `relatorio-aura-${dateStamp}.pdf`;

    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-AURA-PDF-Type": exportType,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
