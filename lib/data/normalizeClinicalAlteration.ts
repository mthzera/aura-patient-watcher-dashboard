import { PatientRecord } from "@/lib/dashboard/types";

export const CLINICAL_ALTERATION_TRANSIENT_BASAL =
  "Descompensação Transitória Basal";
export const CLINICAL_ALTERATION_TRANSIENT_STABLE =
  "Descompensação Transitória Estável";

function normalizeText(val: string | null | undefined): string {
  return (val ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Maps legacy "Descompensação Transitória Esperada" to the current subtypes
 * using "Resultado da Intervenção" (Basal → basal; otherwise → estável).
 */
export function resolveClinicalAlteration(
  record: Pick<PatientRecord, "clinical_alteration" | "intervention_result">
): string | null {
  const raw = record.clinical_alteration?.trim();
  if (!raw) return null;

  const alt = normalizeText(raw);

  if (alt.includes("transitoria basal")) {
    return CLINICAL_ALTERATION_TRANSIENT_BASAL;
  }
  if (alt.includes("transitoria estavel")) {
    return CLINICAL_ALTERATION_TRANSIENT_STABLE;
  }

  if (alt.includes("transitoria esperada")) {
    const intervention = normalizeText(
      record.intervention_result as string | null | undefined
    );
    if (intervention.includes("basal")) {
      return CLINICAL_ALTERATION_TRANSIENT_BASAL;
    }
    return CLINICAL_ALTERATION_TRANSIENT_STABLE;
  }

  return raw;
}

export function normalizePatientClinicalAlterations(
  records: PatientRecord[]
): PatientRecord[] {
  return records.map((record) => ({
    ...record,
    clinical_alteration: resolveClinicalAlteration(record),
  }));
}
