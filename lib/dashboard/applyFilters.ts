import { resolveClinicalAlteration } from "@/lib/data/normalizeClinicalAlteration";
import { resolveBusinessUnit } from "@/lib/dashboard/businessUnit";
import { PatientRecord, DashboardFilters } from "./types";

/**
 * Filter records based on the active dashboard filter state.
 * All comparisons are case-insensitive and handle null/empty values gracefully.
 */
export function applyFilters(
  records: PatientRecord[],
  filters: DashboardFilters
): PatientRecord[] {
  return records.filter((r) => {
    // Date range filter – only apply if the record has a parseable date
    if (filters.startDate || filters.endDate) {
      const recordDate = parseDate(r.date);
      if (recordDate) {
        if (filters.startDate && recordDate < filters.startDate) return false;
        if (filters.endDate && recordDate > filters.endDate) return false;
      }
    }

    if (
      filters.businessUnit &&
      resolveBusinessUnit(r.unit) !== filters.businessUnit
    ) {
      return false;
    }

    if (
      filters.unit &&
      !matchesCaseInsensitive(r.unit, filters.unit)
    ) {
      return false;
    }

    if (
      filters.clinicalAlteration &&
      !matchesCaseInsensitive(
        resolveClinicalAlteration(r),
        filters.clinicalAlteration
      )
    ) {
      return false;
    }

    if (
      filters.clinicalOutcome &&
      !matchesCaseInsensitive(r.clinical_outcome, filters.clinicalOutcome)
    ) {
      return false;
    }

    if (
      filters.auraActionStatus &&
      !matchesCaseInsensitive(r.aura_action_status, filters.auraActionStatus)
    ) {
      return false;
    }

    return true;
  });
}

/** Normalize a date value from the spreadsheet to ISO YYYY-MM-DD. */
function parseDate(value: string | null): string | null {
  if (!value) return null;
  const str = String(value).trim();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);

  // DD/MM/YYYY or DD/MM/YY
  const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (match) {
    const [, d, m, y] = match;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Try native Date as last resort
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);

  return null;
}

function matchesCaseInsensitive(
  fieldValue: string | null,
  filterValue: string
): boolean {
  if (!fieldValue) return false;
  return fieldValue.toLowerCase().trim() === filterValue.toLowerCase().trim();
}

/** Exposed so other modules can reuse it. */
export { parseDate, matchesCaseInsensitive };
