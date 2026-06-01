/**
 * Parser for the "Reinternações" supplementary CSV file.
 *
 * Expected layout (semicolon-separated, UTF-8):
 *   Nome;Status;Operadora;Motivo da Inclusão;Idade;Sexo;Data do Registro;
 *   Data Início Atendimento;ID Carteira;Data Alta;Filial;Condição Alta;
 *   ID Paciente;Rota Entrega;Cod. Zon.;Nro Atend;...
 *
 * The file is persisted under the name reinternacoes.csv by the upload endpoint.
 */

import * as XLSX from "xlsx";
import { readFileMaybe, fileExists, saveFile } from "@/lib/storage/fileStore";
import type { ReinternacaoRecord } from "@/lib/dashboard/types";

export const REINTERNACOES_NAME = "reinternacoes.csv";
export const REINTERNACOES_META_NAME = "reinternacoes-metadata.json";

export interface ReinternacaoMetadata {
  originalName: string;
  uploadedAt: string;
  sizeBytes: number;
  rowCount: number;
}

export function hasReinternacoes(): Promise<boolean> {
  return fileExists(REINTERNACOES_NAME);
}

export async function getReinternacaoMetadata(): Promise<ReinternacaoMetadata | null> {
  const buffer = await readFileMaybe(REINTERNACOES_META_NAME);
  if (!buffer) return null;
  try {
    return JSON.parse(buffer.toString("utf-8")) as ReinternacaoMetadata;
  } catch {
    return null;
  }
}

export async function saveReinternacaoMetadata(
  meta: ReinternacaoMetadata
): Promise<void> {
  await saveFile(
    REINTERNACOES_META_NAME,
    JSON.stringify(meta, null, 2),
    "application/json"
  );
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

const NA_STRINGS = new Set([
  "n/a", "na", "n.a.", "n.a", "-", "--", "---",
  "nao se aplica", "não se aplica", "not applicable", "none",
]);

function isNaValue(raw: string): boolean {
  return NA_STRINGS.has(raw.toLowerCase().trim());
}

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
        out[canonical] = str.length > 0 && !isNaValue(str) ? str : null;
      }
    }
  }
  return out;
}

/** Parse a reinternações CSV buffer into typed records. */
export function parseReinternacoesBuffer(buffer: Buffer): ReinternacaoRecord[] {
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

/** Read the persisted reinternações CSV from storage and parse it. */
export async function parseReinternacoes(): Promise<ReinternacaoRecord[]> {
  const buffer = await readFileMaybe(REINTERNACOES_NAME);
  if (!buffer) return [];
  return parseReinternacoesBuffer(buffer);
}
