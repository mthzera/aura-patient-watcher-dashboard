/**
 * Parser for the "Reinternações" supplementary CSV file.
 *
 * Expected layout (semicolon-separated, UTF-8):
 *   Nome;Status;Operadora;Motivo da Inclusão;Idade;Sexo;Data do Registro;
 *   Data Início Atendimento;ID Carteira;Data Alta;Filial;Condição Alta;
 *   ID Paciente;Rota Entrega;Cod. Zon.;Nro Atend;...
 *
 * The file is saved to data/reinternacoes.csv by the upload endpoint.
 */

import * as XLSX from "xlsx";
import path from "path";
import { existsSync, readFileSync } from "fs";
import type { ReinternacaoRecord } from "@/lib/dashboard/types";

export const REINTERNACOES_PATH = path.join(
  process.cwd(),
  "data",
  "reinternacoes.csv"
);
export const REINTERNACOES_META_PATH = path.join(
  process.cwd(),
  "data",
  "reinternacoes-metadata.json"
);

export interface ReinternacaoMetadata {
  originalName: string;
  uploadedAt: string;
  sizeBytes: number;
  rowCount: number;
}

export function hasReinternacoes(): boolean {
  return existsSync(REINTERNACOES_PATH);
}

export function getReinternacaoMetadata(): ReinternacaoMetadata | null {
  if (!existsSync(REINTERNACOES_META_PATH)) return null;
  try {
    return JSON.parse(
      readFileSync(REINTERNACOES_META_PATH, "utf-8")
    ) as ReinternacaoMetadata;
  } catch {
    return null;
  }
}

/** Normalize a column header to a stable lowercase ASCII key. */
function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/** Map from normalized header → canonical field name. */
const COL: Record<string, string> = {
  nome: "patientName",
  status: "status",
  operadora: "operadora",
  motivo_da_inclusao: "motivoInclusao",
  motivo_inclusao: "motivoInclusao",
  idade: "idade",
  sexo: "sexo",
  data_do_registro: "dataRegistro",
  data_registro: "dataRegistro",
  data_inicio_atendimento: "dataInicioAtendimento",
  data_alta: "dischargeDate",
  filial: "filial",
  condicao_alta: "conditionOnDischarge",
  id_paciente: "idPaciente",
  id_carteira: "idCarteira",
  nro_atend: "nroAtend",
  numero_tablet: "numeroTablet",
  programa: "programa",
  plano_de_atencao: "planoAtencao",
  plano_atencao: "planoAtencao",
  grupo_dispensacao: "grupoDispensacao",
};

function normalizeRow(
  raw: Record<string, unknown>
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeKey(key);
    const canonical = COL[normalized] ?? normalized;
    if (!(canonical in out)) {
      if (value === null || value === undefined) {
        out[canonical] = null;
      } else {
        const str = String(value).trim();
        out[canonical] = str.length > 0 ? str : null;
      }
    }
  }
  return out;
}

/** Parse the saved reinternações CSV into typed records. */
export function parseReinternacoes(): ReinternacaoRecord[] {
  if (!existsSync(REINTERNACOES_PATH)) return [];

  const buffer = readFileSync(REINTERNACOES_PATH);
  const workbook = XLSX.read(buffer, { type: "buffer", raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: null, raw: true }
  );

  return rows
    .map(normalizeRow)
    .filter((r) => !!r.patientName) // skip blank name rows
    .map((r) => ({
      patientName: r.patientName!,
      status: r.status,
      operadora: r.operadora,
      motivoInclusao: r.motivoInclusao,
      idade: r.idade,
      sexo: r.sexo,
      dataRegistro: r.dataRegistro,
      dataInicioAtendimento: r.dataInicioAtendimento,
      idCarteira: r.idCarteira,
      dischargeDate: r.dischargeDate,
      filial: r.filial,
      conditionOnDischarge: r.conditionOnDischarge,
      idPaciente: r.idPaciente,
      nroAtend: r.nroAtend,
    }));
}
