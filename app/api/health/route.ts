import { NextResponse } from "next/server";
import { getCacheStatus } from "@/lib/cache/dashboardCache";
import { hasUploadedFile, getMetadata } from "@/lib/csv/parseCsvFile";

export async function GET() {
  const cache = getCacheStatus();
  const fileLoaded = await hasUploadedFile();
  const meta = await getMetadata();

  const status = !fileLoaded
    ? "error"
    : cache.hasData && !cache.isFresh
    ? "degraded"
    : "ok";

  const dataSource = meta
    ? `CSV: ${meta.originalName} (${meta.rowCount} linhas, enviado em ${new Date(meta.uploadedAt).toLocaleString("pt-BR")})`
    : "Nenhum arquivo carregado";

  return NextResponse.json(
    {
      status,
      fileLoaded,
      lastFetchAt: cache.lastFetchAt,
      dataSource,
      totalRowsLoaded: cache.rowCount,
      lastError: cache.lastError,
      uploadedAt: meta?.uploadedAt ?? null,
      originalName: meta?.originalName ?? null,
    },
    { status: status === "error" ? 503 : 200 }
  );
}
