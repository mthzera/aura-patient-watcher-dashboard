import { NextResponse } from "next/server";
import { invalidateCache } from "@/lib/cache/dashboardCache";
import { loadSpreadsheetData } from "@/lib/dashboard/loadSpreadsheetData";

export async function POST() {
  invalidateCache();

  try {
    const { rows, lastFetchAt, warnings } = await loadSpreadsheetData();
    return NextResponse.json({
      success: true,
      rowsLoaded: rows.length,
      lastFetchAt,
      warnings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}
