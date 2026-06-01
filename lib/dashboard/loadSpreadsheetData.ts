import { parseCsvFile } from "@/lib/csv/parseCsvFile";
import { normalizeRows, getMissingFields } from "@/lib/data/normalizeColumns";
import { normalizePatientClinicalAlterations } from "@/lib/data/normalizeClinicalAlteration";
import {
  getCachedRows,
  isCacheFresh,
  setCachedRows,
  setLastError,
  getCacheStatus,
} from "@/lib/cache/dashboardCache";
import { PatientRecord } from "./types";

export interface LoadResult {
  rows: PatientRecord[];
  fromCache: boolean;
  warnings: string[];
  lastFetchAt: string | null;
}

export async function loadSpreadsheetData(): Promise<LoadResult> {
  const warnings: string[] = [];

  if (isCacheFresh()) {
    return {
      rows: getCachedRows()!,
      fromCache: true,
      warnings,
      lastFetchAt: getCacheStatus().lastFetchAt,
    };
  }

  try {
    const rawRows = await parseCsvFile();
    const normalized = normalizePatientClinicalAlterations(
      normalizeRows(rawRows) as PatientRecord[]
    );

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
}
