import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { invalidateCache } from "@/lib/cache/dashboardCache";
import { clearFileLocatorCache } from "@/lib/graph/resolveSharePointFile";
import { loadSpreadsheetData } from "@/lib/dashboard/loadSpreadsheetData";

export async function POST() {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Clear both the data cache and the file locator cache
  invalidateCache();
  clearFileLocatorCache();

  try {
    const { rows, lastFetchAt, warnings } = await loadSpreadsheetData(
      session.accessToken
    );
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
