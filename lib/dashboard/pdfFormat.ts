/**
 * Centralized Brazilian formatting helpers for PDF reports.
 *
 * Percentage convention: every percentage value handled by this module is
 * represented from 0 to 100 (61.1 means 61,1%), never as a 0-to-1 ratio.
 */

export function safeDivide(numerator: number, denominator: number): number | null {
  if (
    denominator === 0 ||
    !Number.isFinite(numerator) ||
    !Number.isFinite(denominator)
  ) {
    return null;
  }
  return numerator / denominator;
}

/** Integer with pt-BR thousands separator: 3730 → "3.730" */
export function formatInteger(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return Math.round(value).toLocaleString("pt-BR");
}

/**
 * Percentage in pt-BR: 61.1 → "61,1%" and 90 → "90%".
 * Pass an already-computed percentage (0–100), not a 0–1 ratio.
 */
export function formatPercentage(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })}%`;
}

/** Whole-number percentage (matches dashboard rounded rates): 61 → "61%" */
export function formatPercentageWhole(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

/** Percentage-point difference: 39 → "39 p.p."; 11.5 → "11,5 p.p." */
export function formatPercentagePoints(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })} p.p.`;
}

/** ISO date YYYY-MM-DD → DD/MM/AAAA */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

/** Date → DD/MM/AAAA HH:mm (pt-BR) */
export function formatDateTime(d: Date | null | undefined): string {
  if (!d || Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Rate as percentage points with dashboard rounding (integer 0–100). */
export function ratePercent(numerator: number, denominator: number): number {
  const ratio = safeDivide(numerator, denominator);
  return ratio == null ? 0 : Math.round(ratio * 100);
}

/** Rate with one decimal (matches alertResponseRate). */
export function ratePercentOneDecimal(
  numerator: number,
  denominator: number
): number {
  const ratio = safeDivide(numerator, denominator);
  return ratio == null ? 0 : Math.round(ratio * 1000) / 10;
}

/** Truncate long labels without returning nullish or invalid text. */
export function truncateText(
  value: string | null | undefined,
  maxLength: number
): string {
  const text = (value ?? "").trim();
  if (!text) return "—";
  if (maxLength <= 1) return "…";
  return text.length <= maxLength
    ? text
    : `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

/** Shorten long source labels for the PDF footer. */
export function shortenSource(source: string | null | undefined, max = 42): string {
  if (!source) return "Planilha operacional";
  const trimmed = source.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
