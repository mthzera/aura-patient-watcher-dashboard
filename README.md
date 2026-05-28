# Dashboard AURA Patient Watcher

**Efetividade na gestão de casos clínicos**
*Do alerta ao desfecho assistencial*

An interactive Next.js dashboard that reads the AURA Patient Watcher spreadsheet directly from SharePoint through the Microsoft Graph API using **delegated (user login) permissions** — no admin consent required.

---

## How it works

1. The user clicks **"Entrar com Microsoft"** and logs in with their organizational Microsoft account.
2. NextAuth (Auth.js v5) handles the OAuth2 authorization code flow.
3. The user's access token (delegated, not application-level) is stored server-side in an encrypted JWT cookie.
4. All Microsoft Graph calls happen **server-side only** — tokens are never sent to the browser.
5. The dashboard reads the Excel file from SharePoint using the logged-in user's own permissions.

---

## Prerequisites

- Node.js 18+
- npm 9+
- An Azure App Registration in the same tenant as the SharePoint site
- The user must have at least read access to the SharePoint file

---

## 1. Azure App Registration Setup

1. Go to [portal.azure.com](https://portal.azure.com) → **Azure Active Directory** → **App registrations**
2. Click **New registration**
   - Name: `AURA Patient Watcher Dashboard`
   - Supported account types: **Single tenant** (your organization only)
3. Click **Register**

---

## 2. Required Delegated Permissions

Go to **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions**.

Add:

| Permission | Purpose |
|---|---|
| `openid` | Required for sign-in |
| `profile` | User display name |
| `email` | User email |
| `offline_access` | Refresh token (keeps session alive) |
| `User.Read` | Read logged-in user profile |
| `Files.Read` | Read files in the user's OneDrive |
| `Sites.Read.All` | Read SharePoint site contents |

> **Important:** These are **delegated** permissions. No admin consent is required for most tenants. The user must have read access to the SharePoint file.

---

## 3. Redirect URI

In your App Registration, go to **Authentication** → **Add a platform** → **Web**.

Add the redirect URI:

```
http://localhost:3000/api/auth/callback/azure-ad
```

For production, also add your production URL:

```
https://yourdomain.com/api/auth/callback/azure-ad
```

Enable **ID tokens** and **Access tokens** under Implicit grant (if not already enabled for web platform).

---

## 4. Get Client Credentials

From the App Registration **Overview** page:
- **Application (client) ID** → `AUTH_MICROSOFT_ENTRA_ID_ID`
- **Directory (tenant) ID** → used in `AUTH_MICROSOFT_ENTRA_ID_ISSUER`

To create a client secret:
1. Go to **Certificates & secrets** → **New client secret**
2. Copy the **Value** → `AUTH_MICROSOFT_ENTRA_ID_SECRET`

---

## 5. Configure `.env.local`

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
AUTH_SECRET=your-random-secret

AUTH_MICROSOFT_ENTRA_ID_ID=your-client-id
AUTH_MICROSOFT_ENTRA_ID_SECRET=your-client-secret
AUTH_MICROSOFT_ENTRA_ID_ISSUER=https://login.microsoftonline.com/your-tenant-id/v2.0

SHAREPOINT_HOST=redealtana1.sharepoint.com
SHAREPOINT_SITE_PATH=/sites/AURA-CommandCenter
SHAREPOINT_FILE_PATH=/- ROTINAS AURA/Dash Paciente watcher - AURA v5.3.3.xlsx

EXCEL_TABLE_NAME=PatientWatcher
EXCEL_STRATEGY=table

NEXT_PUBLIC_DASHBOARD_REFRESH_SECONDS=60
GRAPH_CACHE_SECONDS=60
```

---

## 6. Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click **"Entrar com Microsoft"**.

---

## 7. How the SharePoint Excel File is Accessed

The app resolves the file automatically at runtime using the Graph API:

```
Step 1 → GET /sites/redealtana1.sharepoint.com:/sites/AURA-CommandCenter
         → Gets the SharePoint site ID

Step 2 → GET /sites/{siteId}/drive
         → Gets the default document library (Documentos Compartilhados)

Step 3 → GET /drives/{driveId}/root:/- ROTINAS AURA/Dash Paciente watcher - AURA v5.3.3.xlsx
         → Gets the file's item ID

Step 4a → GET /drives/{driveId}/items/{itemId}/workbook/tables/PatientWatcher/rows
          → Reads table rows (preferred — no download needed)

Step 4b → GET /drives/{driveId}/items/{itemId}/content   (fallback)
          → Downloads the file and parses with xlsx package
```

The site/drive/item IDs are cached in memory after the first resolution.

---

## 8. Changing the SharePoint File Path or Table Name

Update `.env.local`:

```env
# Point to a different SharePoint site
SHAREPOINT_HOST=yourcompany.sharepoint.com
SHAREPOINT_SITE_PATH=/sites/YourSite

# Point to a different file
SHAREPOINT_FILE_PATH=/Your Folder/YourFile.xlsx

# Change the Excel table name
EXCEL_TABLE_NAME=YourTableName

# Change the strategy
EXCEL_STRATEGY=table      # Workbook Table API (default, preferred)
EXCEL_STRATEGY=download   # Download file + parse with xlsx
EXCEL_STRATEGY=local      # Read from LOCAL_EXCEL_PATH on disk
```

If your column names don't match, edit `COLUMN_MAP` in `lib/data/normalizeColumns.ts`.

---

## Architecture

```
Browser
  │
  └─► GET /            → page.tsx (server) checks auth()
        ├─ No session  → <LoginScreen /> → signIn("azure-ad") → Microsoft login
        └─ Session     → <DashboardClient /> → fetches /api/dashboard

/api/dashboard (server route)
  → auth() → gets session.accessToken
  → loadSpreadsheetData(token)
      → resolveSharePointFile(token)   ← cached after first call
      → readExcelTableRows(token, ...) ← or downloadAndParseExcel
      → normalizeRows() + calculateMetrics()
  → JSON response (NO tokens in response)

Browser ← JSON with KPIs, unit summaries, time series
```

### Security

- The user's Microsoft access token is stored only in the server-side JWT cookie (encrypted with `AUTH_SECRET`)
- Tokens are never sent to the browser
- All Graph API calls happen server-side in Next.js API routes
- The browser only receives computed JSON (KPIs, summaries, chart data)
