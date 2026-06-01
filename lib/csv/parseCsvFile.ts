import * as XLSX from "xlsx";
import { readFileMaybe, fileExists, saveFile } from "@/lib/storage/fileStore";

/** Stable storage names (blob pathnames, or filenames under ./data locally). */
export const CSV_NAME = "uploaded.csv";
export const META_NAME = "metadata.json";

export interface CsvMetadata {
  originalName: string;
  uploadedAt: string;
  sizeBytes: number;
  rowCount: number;
}

export function hasUploadedFile(): Promise<boolean> {
  return fileExists(CSV_NAME);
}

export async function getMetadata(): Promise<CsvMetadata | null> {
  const buffer = await readFileMaybe(META_NAME);
  if (!buffer) return null;
  try {
    return JSON.parse(buffer.toString("utf-8")) as CsvMetadata;
  } catch {
    return null;
  }
}

export async function saveMetadata(meta: CsvMetadata): Promise<void> {
  await saveFile(META_NAME, JSON.stringify(meta, null, 2), "application/json");
}

const NA_STRINGS = new Set([
  "n/a", "na", "n.a.", "n.a", "-", "--", "---",
  "nao se aplica", "não se aplica", "not applicable", "none",
]);

function isNaValue(raw: string): boolean {
  return NA_STRINGS.has(raw.toLowerCase().trim());
}

/**
 * Parse a CSV buffer into normalized rows. Pure: takes the bytes directly so
 * it can be used both for upload-time validation (in-memory buffer) and for
 * reading the persisted file back.
 *
 * raw:true is CRITICAL. With raw:false the SheetJS parser auto-detects
 * date-like text (e.g. "31/08/2026") and reformats it to the US locale
 * ("08/31/2026"), silently corrupting the date column. raw:true keeps every
 * cell exactly as written in the CSV. We then stringify values ourselves so
 * downstream code (which assumes text) keeps working. Reading from a buffer
 * also lets SheetJS handle the UTF-8 BOM automatically.
 */
export function parseCsvBuffer(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: true });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error("O arquivo CSV está vazio ou sem abas.");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: null, raw: true }
  );

  // Normalize every value to a trimmed string (or null).
  // "N/A", "na", "n.a.", "-" and similar are converted to null so downstream
  // logic never needs to handle them as meaningful values.
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        out[key] = null;
      } else {
        const str = String(value).trim();
        out[key] = str.length > 0 && !isNaValue(str) ? str : null;
      }
    }
    return out;
  });
}

/** Read the persisted CSV from storage and parse it. */
export async function parseCsvFile(): Promise<Record<string, unknown>[]> {
  const buffer = await readFileMaybe(CSV_NAME);
  if (!buffer) {
    throw new Error(
      "Nenhum arquivo CSV carregado. Faça o upload de um arquivo CSV para começar."
    );
  }
  return parseCsvBuffer(buffer);
}
