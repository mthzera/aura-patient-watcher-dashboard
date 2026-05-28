/**
 * Resolves the SharePoint Excel file to a { driveId, itemId, downloadUrl } tuple.
 *
 * Key insight: files in /me/drive/sharedWithMe include a
 * "@microsoft.graph.downloadUrl" — a pre-authenticated SAS URL that can be
 * fetched without any Authorization header and without Files.Read.All.
 * We capture that URL here and use it in downloadExcelFile.ts to bypass
 * the permission gap between Files.Read and SharePoint drive access.
 *
 * Fallback chain (tries least-privileged first):
 *   1. /me/drive/sharedWithMe          — files shared explicitly with the user
 *   2. /me/drive/root/search(q=...)    — search across user-accessible drives
 *   3. /shares/{shareId}/driveItem     — sharing-URL decode (last resort)
 *
 * Required scopes: Files.Read + User.Read — no admin consent.
 */

import { graphGet } from "./client";

export interface FileLocator {
  driveId: string;
  itemId: string;
  /**
   * Top-level id returned by /me/drive/sharedWithMe — the user's local
   * reference to the shared file. Use for GET /me/drive/items/{id}/content
   * which works with Files.Read (whereas /drives/{driveId}/items/{id}/content
   * requires Files.Read.All for SharePoint drives).
   */
  sharedItemId?: string;
  /** Pre-authenticated SAS URL — use without Authorization header. */
  downloadUrl?: string;
}

let cachedLocator: FileLocator | null = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(strategy: string, msg: string, data?: unknown) {
  const ts = new Date().toISOString().slice(11, 23);
  if (data !== undefined) {
    console.log(`[${ts}][Graph:${strategy}]`, msg, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${ts}][Graph:${strategy}]`, msg);
  }
}

function logError(strategy: string, msg: string, err: unknown) {
  const ts = new Date().toISOString().slice(11, 23);
  console.error(`[${ts}][Graph:${strategy}] ${msg}`, err);
}

const TARGET_FILE_NAME =
  process.env.SHAREPOINT_FILE_NAME ??
  "Dash Paciente watcher - AURA v5.3.3.xlsx";

interface DriveItem {
  id: string;
  name?: string;
  // Pre-authenticated download URL included in default response
  "@microsoft.graph.downloadUrl"?: string;
  parentReference?: { driveId?: string; driveType?: string };
  remoteItem?: {
    id?: string;
    "@microsoft.graph.downloadUrl"?: string;
    parentReference?: { driveId?: string };
  };
}

interface DriveItemsResponse {
  value: DriveItem[];
  "@odata.nextLink"?: string;
}

/** Extract FileLocator from a DriveItem. */
function extractLocator(item: DriveItem): FileLocator | null {
  // Remote item — file living in a SharePoint document library, returned by
  // /me/drive/sharedWithMe. Top-level id is the user's local reference.
  if (item.remoteItem?.id && item.remoteItem.parentReference?.driveId) {
    return {
      driveId: item.remoteItem.parentReference.driveId,
      itemId: item.remoteItem.id,
      // Keep top-level id: /me/drive/items/{sharedItemId}/content works with
      // Files.Read (user's drive context), unlike /drives/{driveId}/...
      sharedItemId: item.id,
      downloadUrl:
        item["@microsoft.graph.downloadUrl"] ??
        item.remoteItem["@microsoft.graph.downloadUrl"],
    };
  }
  // Direct item — returned by /me/drive/root/search or /shares/{shareId}/driveItem.
  // The @microsoft.graph.downloadUrl is a pre-authenticated SAS URL.
  if (item.parentReference?.driveId) {
    return {
      driveId: item.parentReference.driveId,
      itemId: item.id,
      downloadUrl: item["@microsoft.graph.downloadUrl"],
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Strategy 1 — /me/drive/sharedWithMe
// ---------------------------------------------------------------------------

async function trySharedWithMe(token: string): Promise<FileLocator | null> {
  const strategy = "sharedWithMe";
  log(strategy, `Searching for "${TARGET_FILE_NAME}"…`);

  // No $select — we need the full response to get @microsoft.graph.downloadUrl
  async function fetchPage(pageUrl: string): Promise<DriveItemsResponse> {
    return graphGet<DriveItemsResponse>(pageUrl, token);
  }

  try {
    let url: string | undefined = `/me/drive/sharedWithMe`;

    while (url) {
      const res = await fetchPage(url);
      log(strategy, `Page returned ${res.value?.length ?? 0} items.`);

      const match = res.value?.find(
        (item) => item.name?.toLowerCase() === TARGET_FILE_NAME.toLowerCase()
      );

      if (match) {
        const locator = extractLocator(match);
        log(strategy, `✓ File found.`, {
          name: match.name,
          sharedItemId: locator?.sharedItemId,
          hasDownloadUrl: !!locator?.downloadUrl,
          driveId: locator?.driveId,
          itemId: locator?.itemId,
        });
        return locator;
      }

      url = res["@odata.nextLink"];
    }

    log(strategy, `File not found in shared-with-me list.`);
    return null;
  } catch (err) {
    logError(strategy, `Failed.`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Strategy 2 — /me/drive/root/search(q='...')
// ---------------------------------------------------------------------------

async function tryDriveSearch(token: string): Promise<FileLocator | null> {
  const strategy = "driveSearch";
  const q = encodeURIComponent(`"${TARGET_FILE_NAME}"`);
  log(strategy, `Searching drives for "${TARGET_FILE_NAME}"…`);

  try {
    const res = await graphGet<DriveItemsResponse>(
      `/me/drive/root/search(q=${q})`,
      token
    );

    log(strategy, `Search returned ${res.value?.length ?? 0} items.`);

    const match = res.value?.find(
      (item) => item.name?.toLowerCase() === TARGET_FILE_NAME.toLowerCase()
    );

    if (match) {
      const locator = extractLocator(match);
      log(strategy, `✓ File found.`, {
        name: match.name,
        hasDownloadUrl: !!locator?.downloadUrl,
        driveId: locator?.driveId,
        itemId: locator?.itemId,
      });
      return locator;
    }

    log(strategy, `File not found in drive search.`);
    return null;
  } catch (err) {
    logError(strategy, `Failed.`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Strategy 3 — /shares/{shareId}/driveItem
// ---------------------------------------------------------------------------

function buildShareId(sharingUrl: string): string {
  const b64 = Buffer.from(sharingUrl).toString("base64");
  return "u!" + b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function trySharesApi(token: string): Promise<FileLocator | null> {
  const strategy = "sharesApi";
  const sharingUrl = process.env.SHAREPOINT_FILE_URL;

  if (!sharingUrl) {
    log(strategy, "Skipped — SHAREPOINT_FILE_URL not set.");
    return null;
  }

  const shareId = buildShareId(sharingUrl);
  log(strategy, `Resolving /shares/{shareId}/driveItem…`);

  try {
    const item = await graphGet<DriveItem>(
      `/shares/${shareId}/driveItem`,
      token
    );
    const locator = extractLocator(item);
    log(strategy, `✓ Resolved.`, {
      name: item.name,
      hasDownloadUrl: !!locator?.downloadUrl,
      driveId: locator?.driveId,
      itemId: locator?.itemId,
    });
    return locator;
  } catch (err) {
    logError(strategy, `Failed. Graph error:`, err instanceof Error ? err.message : err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function resolveSharePointFile(
  token: string
): Promise<FileLocator> {
  if (cachedLocator) {
    console.log("[Graph:resolve] Using cached locator.", {
      driveId: cachedLocator.driveId,
      itemId: cachedLocator.itemId,
      hasDownloadUrl: !!cachedLocator.downloadUrl,
    });
    return cachedLocator;
  }

  console.log(`[Graph:resolve] Starting resolution for "${TARGET_FILE_NAME}"…`);

  const locator =
    (await trySharedWithMe(token)) ??
    (await tryDriveSearch(token)) ??
    (await trySharesApi(token));

  if (!locator) {
    throw new Error(
      "Não foi possível acessar a planilha com as permissões atuais. " +
        "Verifique se o arquivo foi compartilhado explicitamente com seu usuário " +
        "ou se a organização bloqueia acesso via Graph. " +
        "Consulte os logs do servidor para detalhes de cada estratégia."
    );
  }

  console.log("[Graph:resolve] ✓ Complete.", {
    driveId: locator.driveId,
    itemId: locator.itemId,
    sharedItemId: locator.sharedItemId,
    hasDownloadUrl: !!locator.downloadUrl,
  });

  cachedLocator = locator;
  return locator;
}

export function clearFileLocatorCache(): void {
  cachedLocator = null;
}
