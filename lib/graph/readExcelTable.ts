/**
 * Read rows from a named Excel Table through the Graph Workbook API.
 *
 * Uses the logged-in user's delegated access token.
 * Endpoint: GET /drives/{driveId}/items/{itemId}/workbook/tables/{tableName}/rows
 */

import { graphGet } from "./client";

interface GraphTableRowsResponse {
  value: Array<{ values: unknown[][] }>;
  "@odata.nextLink"?: string;
}

interface GraphTableHeadersResponse {
  values: unknown[][];
}

async function fetchPage(
  url: string,
  token: string
): Promise<GraphTableRowsResponse> {
  return graphGet<GraphTableRowsResponse>(url, token);
}

export async function readExcelTableRows(
  token: string,
  driveId: string,
  itemId: string
): Promise<Record<string, unknown>[]> {
  const tableName = process.env.EXCEL_TABLE_NAME || "PatientWatcher";
  const base = `/drives/${driveId}/items/${itemId}/workbook/tables/${tableName}`;

  // Fetch column headers
  const headerRes = await graphGet<GraphTableHeadersResponse>(
    `${base}/headerRowRange?$select=values`,
    token
  );

  const headers: string[] = (headerRes.values[0] || []).map(String);

  if (headers.length === 0) {
    throw new Error(
      `Excel table "${tableName}" returned no headers. ` +
        `Verify the table exists in the workbook. ` +
        `Adjust EXCEL_TABLE_NAME in .env.local if needed.`
    );
  }

  // Paginate through all rows
  let nextUrl: string | undefined = `${base}/rows?$select=values`;
  const allRows: Record<string, unknown>[] = [];

  while (nextUrl) {
    const page = await fetchPage(nextUrl, token);

    for (const row of page.value) {
      const cells = row.values[0] ?? [];
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        obj[h] = cells[i] ?? null;
      });
      allRows.push(obj);
    }

    nextUrl = page["@odata.nextLink"];
  }

  return allRows;
}
