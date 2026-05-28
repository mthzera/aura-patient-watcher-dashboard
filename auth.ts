/**
 * Auth.js v5 (next-auth) configuration.
 *
 * Strategy: Microsoft Entra ID (Azure AD) with delegated permissions.
 * The user logs in with their organizational Microsoft account.
 * Their access token is stored in the encrypted JWT session cookie and
 * used server-side to call Microsoft Graph on their behalf.
 *
 * Provider id "azure-ad" is used so the callback URL matches the redirect URI
 * already registered in Azure:
 *   http://localhost:3000/api/auth/callback/azure-ad
 */

import NextAuth from "next-auth";
import MicrosoftEntraId from "next-auth/providers/microsoft-entra-id";
import type { JWT } from "next-auth/jwt";

// Extend built-in types to include our extra session fields
declare module "next-auth" {
  interface Session {
    accessToken?: string;
    error?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
    error?: string;
  }
}

const GRAPH_SCOPES =
  "openid profile email offline_access User.Read Files.Read";

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";
    const tenantMatch = issuer.match(/microsoftonline\.com\/([^/]+)/);
    const tenantId = tenantMatch?.[1] ?? "common";

    const response = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: token.refreshToken!,
          client_id: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
          client_secret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
          scope: GRAPH_SCOPES,
          // Ensure we get a refresh token
          prompt: "select_account",
        }),
      }
    );

    const refreshed = await response.json();
    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      error: undefined,
    };
  } catch {
    return { ...token, error: "RefreshTokenError" };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    MicrosoftEntraId({
      // Keep id as "azure-ad" so the callback URL matches the redirect URI
      // already registered in Azure: /api/auth/callback/azure-ad
      id: "azure-ad",
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID!,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET!,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: {
        params: { scope: GRAPH_SCOPES },
      },
    }),
  ],

  callbacks: {
    async jwt({ token, account }) {
      // First sign-in: store tokens from the OAuth response
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      // Token still valid (with 60s buffer)
      if (
        token.expiresAt &&
        Date.now() < token.expiresAt * 1000 - 60_000
      ) {
        return token;
      }

      // Token expired — attempt refresh
      if (!token.refreshToken) {
        return { ...token, error: "RefreshTokenError" };
      }
      return refreshAccessToken(token);
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.error = token.error;
      return session;
    },
  },
});
