import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getCacheStatus } from "@/lib/cache/dashboardCache";

export async function GET() {
  const session = await auth();
  const cache = getCacheStatus();

  const authenticated = !!session?.accessToken;
  const hasTokenError = session?.error === "RefreshTokenError";

  const { host, sitePath, filePath } = {
    host: process.env.SHAREPOINT_HOST ?? "redealtana1.sharepoint.com",
    sitePath: process.env.SHAREPOINT_SITE_PATH ?? "/sites/AURA-CommandCenter",
    filePath:
      process.env.SHAREPOINT_FILE_PATH ??
      "/- ROTINAS AURA/Dash Paciente watcher - AURA v5.3.3.xlsx",
  };

  const status =
    !authenticated || hasTokenError
      ? "error"
      : cache.hasData && !cache.isFresh
      ? "degraded"
      : "ok";

  return NextResponse.json(
    {
      status,
      authenticated,
      graphConnected: authenticated && !hasTokenError,
      userEmail: session?.user?.email ?? null,
      lastFetchAt: cache.lastFetchAt,
      dataSource: `SharePoint: ${host}${sitePath}${filePath}`,
      totalRowsLoaded: cache.rowCount,
      lastError: hasTokenError
        ? "Token de acesso expirado. Faça login novamente."
        : cache.lastError,
    },
    { status: status === "error" ? 503 : 200 }
  );
}
