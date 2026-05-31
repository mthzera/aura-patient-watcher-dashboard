import * as XLSX from "xlsx";
import path from "path";
import { existsSync, readFileSync } from "fs";

export const CSV_PATH = path.join(process.cwd(), "data", "uploaded.csv");
export const META_PATH = path.join(process.cwd(), "data", "metadata.json");

export interface CsvMetadata {
  originalName: string;
  uploadedAt: string;
  sizeBytes: number;
  rowCount: number;
}

export function hasUploadedFile(): boolean {
  return existsSync(CSV_PATH);
}

export function getMetadata(): CsvMetadata | null {
  if (!existsSync(META_PATH)) return null;
  try {
    return JSON.parse(readFileSync(META_PATH, "utf-8")) as CsvMetadata;
  } catch {
    return null;
  }
}

const NA_STRINGS = new Set([
  "n/a", "na", "n.a.", "n.a", "-", "--", "---",
  "nao se aplica", "não se aplica", "not applicable", "none",
]);

function isNaValue(raw: string): boolean {
  return NA_STRINGS.has(raw.toLowerCase().trim());
}

export function parseCsvFile(): Record<string, unknown>[] {
  if (!existsSync(CSV_PATH)) {
    throw new Error(
      "Nenhum arquivo CSV carregado. Faça o upload de um arquivo CSV para começar."
    );
  }

  // Read as buffer so the parser handles the UTF-8 BOM automatically.
  //
  // raw:true is CRITICAL. With raw:false the SheetJS parser auto-detects
  // date-like text (e.g. "31/08/2026") and reformats it to the US locale
  // ("08/31/2026"), silently corrupting the date column. raw:true keeps every
  // cell exactly as written in the CSV. We then stringify values ourselves so
  // downstream code (which assumes text) keeps working.
  const buffer = readFileSync(CSV_PATH);
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
