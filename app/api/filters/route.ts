import { NextResponse } from "next/server";
import { loadSpreadsheetData } from "@/lib/dashboard/loadSpreadsheetData";
import { FiltersResponse } from "@/lib/dashboard/types";
import { parseDate } from "@/lib/dashboard/applyFilters";

export async function GET() {
  try {
    const { rows } = await loadSpreadsheetData();

    const dates = rows
      .map((r) => parseDate(r.date))
      .filter(Boolean) as string[];

    const response: FiltersResponse = {
      units: unique(rows.map((r) => r.unit)),
      clinicalAlterationTypes: unique(rows.map((r) => r.clinical_alteration)),
      clinicalOutcomes: unique(rows.map((r) => r.clinical_outcome)),
      auraActionStatuses: unique(rows.map((r) => r.aura_action_status)),
      minDate: dates.length > 0 ? [...dates].sort()[0] : null,
      maxDate: dates.length > 0 ? [...dates].sort().at(-1)! : null,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

function unique(values: (string | null | undefined)[]): string[] {
  return [
    ...new Set(
      values
        .map((v) => v?.trim())
        .filter((v): v is string => !!v && v.length > 0)
    ),
  ].sort();
}
