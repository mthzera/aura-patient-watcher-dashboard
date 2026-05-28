/**
 * Microsoft Graph authentication service using client credentials flow.
 *
 * How to configure:
 * 1. Go to Azure Active Directory > App registrations > New registration
 * 2. Set a name (e.g., "AURA Patient Watcher Dashboard")
 * 3. After creation, copy the Application (client) ID → MICROSOFT_CLIENT_ID
 * 4. Copy the Directory (tenant) ID → MICROSOFT_TENANT_ID
 * 5. Go to Certificates & Secrets > New client secret → MICROSOFT_CLIENT_SECRET
 * 6. Go to API Permissions > Add permission > Microsoft Graph > Application permissions
 *    Add: Files.Read.All  (or Sites.Read.All for SharePoint)
 * 7. Click "Grant admin consent"
 *
 * Tokens are cached in memory until 60s before expiration to avoid rate limiting.
 */

interface TokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

let tokenCache: TokenCache | null = null;

export async function getGraphAccessToken(): Promise<string> {
  const now = Date.now();
  const bufferMs = 60_000; // refresh 60s before expiry

  if (tokenCache && tokenCache.expiresAt - bufferMs > now) {
    return tokenCache.accessToken;
  }

  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      "Missing Microsoft Graph credentials. Set MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, and MICROSOFT_CLIENT_SECRET in .env.local"
    );
  }

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "https://graph.microsoft.com/.default",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Graph token request failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  };

  return tokenCache.accessToken;
}

/** Clear cached token (useful for forcing re-auth after credential rotation). */
export function clearTokenCache(): void {
  tokenCache = null;
}
