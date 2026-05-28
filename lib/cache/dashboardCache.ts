/**
 * Simple in-memory cache for spreadsheet data.
 *
 * Purpose:
 *   - Avoid hitting Graph API on every dashboard request.
 *   - Serve last successful data if Graph is temporarily unavailable.
 *   - Configurable TTL via GRAPH_CACHE_SECONDS (default: 60s).
 *
 * This is a module-level singleton; it lives for the lifetime of the
 * Next.js server process.  It resets on every cold start / deploy.
 */

import { PatientRecord } from "@/lib/dashboard/types";

interface CacheEntry {
  rows: PatientRecord[];
  fetchedAt: Date;
}

let cache: CacheEntry | null = null;
let lastError: string | null = null;

/** Returns the configured cache TTL in milliseconds. */
function cacheTtlMs(): number {
  const seconds = parseInt(process.env.GRAPH_CACHE_SECONDS ?? "60", 10);
  return (isNaN(seconds) ? 60 : seconds) * 1000;
}

/** Whether the current cache entry is still fresh. */
export function isCacheFresh(): boolean {
  if (!cache) return false;
  return Date.now() - cache.fetchedAt.getTime() < cacheTtlMs();
}

/** Return cached rows (may be stale). Returns null if nothing cached yet. */
export function getCachedRows(): PatientRecord[] | null {
  return cache?.rows ?? null;
}

/** Return the timestamp of the last successful fetch. */
export function getLastFetchAt(): Date | null {
  return cache?.fetchedAt ?? null;
}

/** Store a fresh fetch result into the cache. */
export function setCachedRows(rows: PatientRecord[]): void {
  cache = { rows, fetchedAt: new Date() };
  lastError = null;
}

/** Record the last error encountered during a fetch attempt. */
export function setLastError(error: string): void {
  lastError = error;
}

/** Retrieve the last fetch error message. */
export function getLastError(): string | null {
  return lastError;
}

/** Force the cache to expire so the next request triggers a fresh fetch. */
export function invalidateCache(): void {
  cache = null;
}

/** Summary for the /api/health endpoint. */
export function getCacheStatus() {
  return {
    hasData: cache !== null,
    isFresh: isCacheFresh(),
    lastFetchAt: cache?.fetchedAt.toISOString() ?? null,
    rowCount: cache?.rows.length ?? 0,
    lastError,
  };
}
