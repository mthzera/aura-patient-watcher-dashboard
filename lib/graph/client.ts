/**
 * Thin wrapper around the Microsoft Graph REST API.
 *
 * All calls are made server-side using the logged-in user's delegated access
 * token from NextAuth. Tokens are never sent to the browser.
 */

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export async function graphGet<T = unknown>(
  path: string,
  token: string
): Promise<T> {
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph GET ${path} failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<T>;
}

export async function graphGetBuffer(
  path: string,
  token: string
): Promise<ArrayBuffer> {
  const url = path.startsWith("http") ? path : `${GRAPH_BASE}${path}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Graph GET (buffer) ${path} failed (${response.status}): ${text}`
    );
  }

  return response.arrayBuffer();
}
