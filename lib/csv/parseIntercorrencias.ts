/**
 * Parser for the "Intercorrências" supplementary CSV file.
 *
 * Expected layout (semicolon-separated, UTF-8):
 *   Nr.;Tipo;Tipo Intercorrência;Urg.;Grau de Urgência;Classificação;
 *   Nr. Atendimento;Nome Paciente;Data Max. Resolução;Data Início;Status;
 *   Data Fim;Operadora;Classificação do Desfecho;Motivo Atendimento;...
 *
 * The file is persisted under the name intercorrencias.csv by the upload endpoint.
 */

import * as XLSX from "xlsx";
import { readFileMaybe, fileExists, saveFile } from "@/lib/storage/fileStore";
import type { IntercorrenciaRecord } from "@/lib/dashboard/types";

export const INTERCORRENCIAS_NAME = "intercorrencias.csv";
export const INTERCORRENCIAS_META_NAME = "intercorrencias-metadata.json";

export interface IntercorrenciaMetadata {
  originalName: string;
  uploadedAt: string;
  sizeBytes: number;
  rowCount: number;
}

export function hasIntercorrencias(): Promise<boolean> {
  return fileExists(INTERCORRENCIAS_NAME);
}

export async function getIntercorrenciaMetadata(): Promise<IntercorrenciaMetadata | null> {
  const buffer = await readFileMaybe(INTERCORRENCIAS_META_NAME);
  if (!buffer) return null;
  try {
    return JSON.parse(buffer.toString("utf-8")) as IntercorrenciaMetadata;
  } catch {
    return null;
  }
}

export async function saveIntercorrenciaMetadata(
  meta: IntercorrenciaMetadata
): Promise<void> {
  await saveFile(
    INTERCORRENCIAS_META_NAME,
    JSON.stringify(meta, null, 2),
    "application/json"
  );
}

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s\-/]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

const COL: Record<string, string> = {
  nr: "nr",
  tipo: "tipo",
  tipo_intercorrencia: "tipoIntercorrencia",
  urg: "urg",
  grau_de_urgencia: "grauUrgencia",
  grau_urgencia: "grauUrgencia",
  classificacao: "classificacao",
  nr_atendimento: "nroAtendimento",
  nro_atendimento: "nroAtendimento",
  nome_paciente: "patientName",
  paciente: "patientName",
  data_max_resolucao: "dataMaxResolucao",
  data_inicio: "dataInicio",
  status: "status",
  data_fim: "dataFim",
  operadora: "operadora",
  classificacao_do_desfecho: "classificacaoDesfecho",
  motivo_atendimento: "motivoAtendimento",
  gerou_atend_unid_movel: "gerouAtendUnidMovel",
  filial: "filial",
};

const NA_STRINGS = new Set([
  "n/a",
  "na",
  "n.a.",
  "n.a",
  "-",
  "--",
  "---",
  "nao se aplica",
  "não se aplica",
  "not applicable",
  "none",
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

export function parseIntercorrenciasBuffer(
  buffer: Buffer
): IntercorrenciaRecord[] {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: null, raw: true }
  );

  return rows
    .map(normalizeRow)
    .filter((r) => !!r.patientName)
    .map((r) => ({
      nr: r.nr,
      tipoIntercorrencia: r.tipoIntercorrencia,
      grauUrgencia: r.grauUrgencia,
      classificacao: r.classificacao,
      nroAtendimento: r.nroAtendimento,
      patientName: r.patientName!,
      dataMaxResolucao: r.dataMaxResolucao,
      dataInicio: r.dataInicio,
      status: r.status,
      dataFim: r.dataFim,
      operadora: r.operadora,
      classificacaoDesfecho: r.classificacaoDesfecho,
      motivoAtendimento: r.motivoAtendimento,
      gerouAtendUnidMovel: r.gerouAtendUnidMovel,
      filial: r.filial,
    }));
}

export async function parseIntercorrencias(): Promise<IntercorrenciaRecord[]> {
  const buffer = await readFileMaybe(INTERCORRENCIAS_NAME);
  if (!buffer) return [];
  return parseIntercorrenciasBuffer(buffer);
}
