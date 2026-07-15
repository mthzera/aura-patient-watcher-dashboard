import type { BusinessUnit } from "@/lib/dashboard/types";

export const BUSINESS_UNIT_OPTIONS: ReadonlyArray<{
  value: BusinessUnit;
  label: string;
}> = [
  { value: "domiciliar", label: "Domiciliar" },
  { value: "transicao", label: "Transição" },
];

const DOMICILIAR_UNITS = new Set([
  "ahc",
  "anery",
  "anery ahc",
  "anery - ahc",
]);

function normalizeUnit(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s*[–—-]\s*/g, " - ")
    .replace(/\s+/g, " ");
}

/**
 * Business-unit rule:
 * Anery/AHC (including combined labels such as Anery - AHC) is Domiciliar;
 * every other named unit is Transição.
 */
export function resolveBusinessUnit(
  unit: string | null | undefined
): BusinessUnit | null {
  const normalized = normalizeUnit(unit);
  if (!normalized) return null;
  return DOMICILIAR_UNITS.has(normalized) ? "domiciliar" : "transicao";
}

export function parseBusinessUnit(
  value: string | null | undefined
): BusinessUnit | undefined {
  return value === "domiciliar" || value === "transicao" ? value : undefined;
}

export function businessUnitLabel(
  value: BusinessUnit | null | undefined
): string {
  return (
    BUSINESS_UNIT_OPTIONS.find((option) => option.value === value)?.label ??
    "Todas"
  );
}
