/**
 * Download the Excel file from SharePoint and parse it server-side with xlsx.
 *
 * Download priority chain (most permission-friendly first):
 *
 *  1. locator.downloadUrl — pre-authenticated SAS URL captured during resolution
 *     (sharedWithMe or /shares/{shareId}/driveItem response). No auth header needed.
 *
 *  2. /me/drive/items/{sharedItemId}/content
 *     For files found via sharedWithMe — user's local drive reference.
 *     Works with Files.Read (no admin consent needed).
 *
 *  3. /shares/{shareId}/driveItem → downloadUrl
 *     Re-resolves sharing URL to get a fresh SAS download URL.
 *     Works with Files.Read (no admin consent needed).
 *
 *  4. /drives/{driveId}/items/{itemId}/content — last resort, may require
 *     Files.Read.All depending on tenant configuration.
 *
 * Required scope: Files.Read — no admin consent required for paths 1-3.
 */

import * as XLSX from "xlsx";
import { graphGet, graphGetBuffer } from "./client";
import type { FileLocator } from "./resolveSharePointFile";

interface ItemWithDownloadUrl {
  id: string;
  name?: string;
  "@microsoft.graph.downloadUrl"?: string;
}

function buildShareId(sharingUrl: string): string {
  const b64 = Buffer.from(sharingUrl).toString("base64");
  return "u!" + b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function downloadAndParseExcel(
  token: string,
  locator: FileLocator
): Promise<Record<string, unknown>[]> {
  const tableName = process.env.EXCEL_TABLE_NAME || "PatientWatcher";
  const buffer = await fetchFileBuffer(token, locator);
  return parseWorkbook(buffer, tableName);
}

async function downloadSasUrl(sasUrl: string, label: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(sasUrl, { cache: "no-store" });
    if (res.ok) {
      console.log(`[Graph:download] ✓ ${label} SAS download OK (${res.status}).`);
      return res.arrayBuffer();
    }
    console.warn(`[Graph:download] ${label} SAS download returned ${res.status}.`);
    return null;
  } catch (err) {
    console.warn(`[Graph:download] ${label} SAS download threw: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function fetchFileBuffer(
  token: string,
  locator: FileLocator
): Promise<ArrayBuffer> {
  // ── Path 1: SAS URL captured at resolution time ───────────────────────────
  // This URL comes from the @microsoft.graph.downloadUrl field in sharedWithMe
  // or /shares/{shareId}/driveItem responses — no Authorization header needed.
  if (locator.downloadUrl) {
    console.log(`[Graph:download] Path 1 — using cached SAS downloadUrl…`);
    const buf = await downloadSasUrl(locator.downloadUrl, "Path 1");
    if (buf) return buf;
    console.warn(`[Graph:download] Path 1 failed. Trying Path 2…`);
  } else {
    console.log(`[Graph:download] Path 1 skipped — no downloadUrl in locator.`);
  }

  // ── Path 2: /me/drive/items/{sharedItemId}/content ───────────────────────
  // Works with Files.Read when the file is in the user's sharedWithMe list.
  if (locator.sharedItemId) {
    try {
      console.log(
        `[Graph:download] Path 2 — /me/drive/items/${locator.sharedItemId}/content`
      );
      const buf = await graphGetBuffer(
        `/me/drive/items/${locator.sharedItemId}/content`,
        token
      );
      console.log("[Graph:download] ✓ Path 2 OK.");
      return buf;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Graph:download] Path 2 failed: ${msg}. Trying Path 3…`);
    }
  }

  // ── Path 3a: /shares/{shareId}/driveItem/content (direct download redirect) ─
  // The /shares/{id}/driveItem/content endpoint follows the sharing link and
  // streams the file directly. Works with Files.Read on a proper sharing link
  // (created via SharePoint Share button → Copy link → "People in [org]").
  // NOTE: SHAREPOINT_FILE_URL must be a sharing link (/:x:/g/... format),
  // NOT a web redirect URL (/:x:/r/... format).
  const sharingUrl = process.env.SHAREPOINT_FILE_URL;
  if (sharingUrl) {
    try {
      console.log(`[Graph:download] Path 3a — /shares/{shareId}/driveItem/content…`);
      const shareId = buildShareId(sharingUrl);
      const buf = await graphGetBuffer(`/shares/${shareId}/driveItem/content`, token);
      console.log("[Graph:download] ✓ Path 3a OK.");
      return buf;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Graph:download] Path 3a failed: ${msg}. Trying Path 3b…`);
    }

    // ── Path 3b: /shares/{shareId}/driveItem → SAS URL ────────────────────
    try {
      console.log(`[Graph:download] Path 3b — /shares/{shareId}/driveItem for SAS URL…`);
      const shareId = buildShareId(sharingUrl);
      const item = await graphGet<ItemWithDownloadUrl>(
        `/shares/${shareId}/driveItem`,
        token
      );
      const sasUrl = item["@microsoft.graph.downloadUrl"];
      if (sasUrl) {
        console.log(`[Graph:download] Got SAS URL for "${item.name}". Downloading…`);
        const buf = await downloadSasUrl(sasUrl, "Path 3b");
        if (buf) return buf;
      } else {
        console.warn(`[Graph:download] Path 3b — no downloadUrl in /shares response.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Graph:download] Path 3b failed: ${msg}. Trying Path 4…`);
    }
  }

  // ── Path 4: /drives/{driveId}/items/{itemId}/content ─────────────────────
  console.log(
    `[Graph:download] Path 4 — /drives/${locator.driveId}/items/${locator.itemId}/content`
  );
  try {
    const buf = await graphGetBuffer(
      `/drives/${locator.driveId}/items/${locator.itemId}/content`,
      token
    );
    console.log("[Graph:download] ✓ Path 4 OK.");
    return buf;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Todas as tentativas de download falharam. Último erro: ${msg}\n\n` +
        `O arquivo está em uma biblioteca de documentos SharePoint que o tenant restringe via Graph API. ` +
        `Opções: (1) use EXCEL_STRATEGY=local com o arquivo sincronizado localmente, ` +
        `ou (2) peça ao admin do Azure para conceder Files.Read.All no App Registration.`
    );
  }
}

function parseWorkbook(
  buffer: ArrayBuffer,
  tableName: string
): Record<string, unknown>[] {
  const workbook = XLSX.read(new Uint8Array(buffer), {
    type: "array",
    raw: false,
  });

  const sheetName =
    workbook.SheetNames.find(
      (n) => n.toLowerCase() === tableName.toLowerCase()
    ) ?? workbook.SheetNames[0];

  if (!sheetName) throw new Error("O arquivo Excel não contém nenhuma aba.");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[sheetName],
    { defval: null, raw: false }
  );

  console.log(
    `[Graph:download] ✓ Parsed ${rows.length} rows from sheet "${sheetName}".`
  );

  return rows;
}
