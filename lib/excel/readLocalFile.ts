/**
 * Read and parse an Excel file from the local filesystem.
 *
 * Used when EXCEL_STRATEGY=local is set in .env.local.
 * Set LOCAL_EXCEL_PATH to the absolute path of your .xlsx or .xls file.
 *
 * Example:
 *   EXCEL_STRATEGY=local
 *   LOCAL_EXCEL_PATH=C:\Users\me\Documents\PatientWatcher.xlsx
 */

import * as fs from "fs";
import * as path from "path";
import * as XLSX from "xlsx";

export async function readLocalExcelFile(): Promise<Record<string, unknown>[]> {
  const filePath = process.env.LOCAL_EXCEL_PATH;

  if (!filePath) {
    throw new Error(
      "LOCAL_EXCEL_PATH não está definido. " +
        "Adicione LOCAL_EXCEL_PATH=C:\\caminho\\para\\arquivo.xlsx no seu .env.local"
    );
  }

  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(
      `Arquivo não encontrado: ${resolved}\n` +
        "Verifique se LOCAL_EXCEL_PATH aponta para o arquivo correto."
    );
  }

  const buffer = fs.readFileSync(resolved);
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });

  const tableName = process.env.EXCEL_TABLE_NAME || "PatientWatcher";

  // Try to find a sheet matching the table name; fall back to the first sheet
  const sheetName =
    workbook.SheetNames.find(
      (n) => n.toLowerCase() === tableName.toLowerCase()
    ) ?? workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("A planilha Excel não contém nenhuma aba.");
  }

  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false,
  });

  return rows;
}
