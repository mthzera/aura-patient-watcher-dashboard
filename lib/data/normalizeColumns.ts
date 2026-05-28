/**
 * Column normalization utilities.
 *
 * Raw Excel columns often have accents, mixed case, or extra spaces.
 * We normalize every key so the rest of the app can use consistent field names.
 *
 * Normalization pipeline:
 *   1. Trim surrounding whitespace
 *   2. Lowercase
 *   3. Remove Portuguese diacritics (á→a, ç→c, etc.)
 *   4. Replace spaces/hyphens with underscores
 *   5. Remove any remaining non-alphanumeric/underscore characters
 */

/** Normalize a single column header string. */
export function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[\s\-]+/g, "_") // spaces/hyphens → underscore
    .replace(/[^a-z0-9_]/g, ""); // remove remaining special chars
}

/**
 * Map from normalized column key → expected canonical field name.
 *
 * Adjust the left-hand side to match whatever headers appear in your
 * specific spreadsheet.  The right-hand side must stay stable because
 * the rest of the application uses these canonical names.
 */
export const COLUMN_MAP: Record<string, string> = {
  // Date / patient identity
  data: "date",
  data_do_alerta: "date",
  data_alerta: "date",
  unidade: "unit",
  unidade_assistencial: "unit",
  setor: "unit",
  nome_do_paciente: "patient_name",
  nome_paciente: "patient_name",
  paciente: "patient_name",
  prontuario: "medical_record",
  numero_prontuario: "medical_record",
  id_paciente: "patient_id",

  // Clinical alteration
  alteracao_clinica: "clinical_alteration",
  tipo_de_alteracao: "clinical_alteration",
  tipo_alteracao: "clinical_alteration",
  alteracao: "clinical_alteration",
  classificacao_clinica: "clinical_alteration",

  // AURA alert
  alertado_aura: "aura_alerted",
  alerta_aura: "aura_alerted",
  aura_alertado: "aura_alerted",
  alerta: "aura_alerted",

  // Unit action / AURA status
  atuacao_da_unidade: "aura_action_status",
  status_aura: "aura_action_status",
  acao_aura: "aura_action_status",
  conduta_da_unidade: "aura_action_status",
  conduta: "aura_action_status",
  status_da_atuacao: "aura_action_status",
  atuacao: "aura_action_status",

  // Clinical outcome
  desfecho_clinico: "clinical_outcome",
  desfecho: "clinical_outcome",
  evolucao: "clinical_outcome",
  resultado_clinico: "clinical_outcome",
  outcome: "clinical_outcome",

  // Additional optional fields
  observacoes: "observations",
  observacao: "observations",
  obs: "observations",
  responsavel: "responsible",
  medico_responsavel: "responsible",
};

/**
 * Normalize all keys in a raw row object.
 * Returns a new object with canonical field names.
 * Unknown columns are kept as-is (with their normalized key).
 */
export function normalizeRow(
  raw: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(raw)) {
    const normalized = normalizeKey(key);
    const canonical = COLUMN_MAP[normalized] ?? normalized;
    // If two source columns map to the same canonical name, first wins
    if (!(canonical in result)) {
      result[canonical] = value;
    }
  }

  return result;
}

/** Normalize an array of raw rows. */
export function normalizeRows(
  rows: Record<string, unknown>[]
): Record<string, unknown>[] {
  return rows.map(normalizeRow);
}

/** Return a list of canonical fields that are present in the data. */
export function detectPresentFields(
  rows: Record<string, unknown>[]
): string[] {
  const fields = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach((k) => fields.add(k));
  }
  return Array.from(fields);
}

/** Return canonical fields expected by KPI calculation but missing from data. */
export const REQUIRED_FIELDS = [
  "date",
  "unit",
  "clinical_alteration",
  "aura_alerted",
  "aura_action_status",
  "clinical_outcome",
] as const;

export function getMissingFields(rows: Record<string, unknown>[]): string[] {
  const present = new Set(detectPresentFields(rows));
  return REQUIRED_FIELDS.filter((f) => !present.has(f));
}
