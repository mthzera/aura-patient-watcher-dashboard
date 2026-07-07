import { matchesCaseInsensitive } from "./applyFilters";

/**
 * Maps dashboard "Unidade" codes to branch names ("Filial") in the
 * reinternações / intercorrências supplementary files.
 *
 * AHC corresponds to the ANERY SP branch in the reinternações export.
 */
const UNIT_TO_FILIAL: Record<string, string[]> = {
  AHC: ["ANERY SP", "ANERY"],
};

function normalizeFilial(val: string): string {
  return val
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** True when a reinternação row's Filial belongs to the selected dashboard unit. */
export function unitMatchesFilial(
  unit: string,
  filial: string | null | undefined
): boolean {
  if (!filial?.trim()) return false;

  const filialNorm = normalizeFilial(filial);
  const aliases = UNIT_TO_FILIAL[unit.trim().toUpperCase()];

  if (aliases) {
    return aliases.some((alias) => {
      const aliasNorm = normalizeFilial(alias);
      return (
        filialNorm === aliasNorm ||
        filialNorm.includes(aliasNorm) ||
        aliasNorm.includes(filialNorm)
      );
    });
  }

  // Fallback: direct match (e.g. filial column equals unit code)
  return matchesCaseInsensitive(filial, unit);
}
