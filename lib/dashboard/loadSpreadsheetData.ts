/**
 * Central data-loading orchestrator.
 *
 * Strategies (EXCEL_STRATEGY env var):
 *   "download" — (default) Download file via Graph + parse with xlsx.
 *                Uses only Files.Read — no admin consent required.
 *   "table"    — Graph Workbook Table API (auto-falls back to download).
 *                May require elevated permissions depending on tenant config.
 *   "local"    — Read from local filesystem (LOCAL_EXCEL_PATH).
 *
 * The result is cached in memory for GRAPH_CACHE_SECONDS.
 * If the Graph call fails, stale cache is returned with a warning.
 */

import { readExcelTableRows } from "@/lib/graph/readExcelTable";
import { downloadAndParseExcel } from "@/lib/graph/downloadExcelFile";
import { readLocalExcelFile } from "@/lib/excel/readLocalFile";
import { resolveSharePointFile } from "@/lib/graph/resolveSharePointFile";
import { normalizeRows, getMissingFields } from "@/lib/data/normalizeColumns";
import {
  getCachedRows,
  isCacheFresh,
  setCachedRows,
  setLastError,
  getCacheStatus,
} from "@/lib/cache/dashboardCache";
import { PatientRecord } from "./types";

// Default to "download" — works with Files.Read only (no admin consent).
const STRATEGY = process.env.EXCEL_STRATEGY ?? "download";

export interface LoadResult {
  rows: PatientRecord[];
  fromCache: boolean;
  warnings: string[];
  lastFetchAt: string | null;
}

export async function loadSpreadsheetData(
  accessToken?: string
): Promise<LoadResult> {
  const warnings: string[] = [];

  // Serve fresh cache without needing a token
  if (isCacheFresh()) {
    return {
      rows: getCachedRows()!,
      fromCache: true,
      warnings,
      lastFetchAt: getCacheStatus().lastFetchAt,
    };
  }

  // Cache is stale — need a token (unless using local strategy)
  if (STRATEGY !== "local" && !accessToken) {
    const stale = getCachedRows();
    if (stale) {
      warnings.push(
        "Sessão sem token de acesso. Exibindo dados em cache. Atualize a página para recarregar."
      );
      return {
        rows: stale,
        fromCache: true,
        warnings,
        lastFetchAt: getCacheStatus().lastFetchAt,
      };
    }
    throw new Error("Token de acesso ausente. Faça login novamente.");
  }

  let rawRows: Record<string, unknown>[];

  try {
    if (STRATEGY === "local") {
      rawRows = await readLocalExcelFile();
    } else if (STRATEGY === "download") {
      // Pass the full locator so downloadAndParseExcel can use the SAS downloadUrl
      const locator = await resolveSharePointFile(accessToken!);
      rawRows = await downloadAndParseExcel(accessToken!, locator);
    } else {
      // "table" strategy: try Workbook Table API, fall back to download
      const locator = await resolveSharePointFile(accessToken!);
      try {
        rawRows = await readExcelTableRows(accessToken!, locator.driveId, locator.itemId);
      } catch (tableErr) {
        const msg =
          tableErr instanceof Error ? tableErr.message : String(tableErr);
        warnings.push(
          `Workbook Table API falhou (${msg}). Usando download como fallback.`
        );
        rawRows = await downloadAndParseExcel(accessToken!, locator);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setLastError(msg);

    const stale = getCachedRows();
    if (stale) {
      warnings.push(
        `Falha ao carregar planilha (${msg}). Exibindo dados em cache de ${getCacheStatus().lastFetchAt}.`
      );
      return {
        rows: stale,
        fromCache: true,
        warnings,
        lastFetchAt: getCacheStatus().lastFetchAt,
      };
    }

    throw err;
  }

  const normalized = normalizeRows(rawRows) as PatientRecord[];

  const missing = getMissingFields(normalized);
  if (missing.length > 0) {
    warnings.push(
      `Colunas esperadas não encontradas: ${missing.join(", ")}. ` +
        `Ajuste o COLUMN_MAP em lib/data/normalizeColumns.ts.`
    );
  }

  setCachedRows(normalized);

  return {
    rows: normalized,
    fromCache: false,
    warnings,
    lastFetchAt: new Date().toISOString(),
  };
}
