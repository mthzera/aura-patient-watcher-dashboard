"use client";

import { useState } from "react";
import { RefreshCw, Database, Clock, Wifi, WifiOff } from "lucide-react";
import { UploadPrompt } from "@/components/UploadPrompt";
import { ReinternacaoUpload } from "@/components/ReinternacaoUpload";

interface Props {
  lastFetchAt: string | null;
  isLoading: boolean;
  isConnected: boolean;
  onRefresh: () => Promise<void>;
  onUploadSuccess: (result: { filename: string; rowCount: number }) => void;
  onReinternacaoUpload?: (rowCount: number) => void;
  reinternacaoRowCount?: number | null;
  autoRefreshSeconds: number;
  dataSource?: string;
}

export function DashboardHeader({
  lastFetchAt,
  isLoading,
  isConnected,
  onRefresh,
  onUploadSuccess,
  onReinternacaoUpload,
  reinternacaoRowCount,
  autoRefreshSeconds,
  dataSource = "CSV local",
}: Props) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }

  const formattedTime = lastFetchAt
    ? new Date(lastFetchAt).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  return (
    <header className="border-b border-slate-700 bg-slate-900 px-6 py-5">
      <div className="mx-auto max-w-screen-2xl">
        {/* Title row */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-7 w-1 rounded-full bg-teal-400" />
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Dashboard AURA Patient Watcher
              </h1>
            </div>
            <p className="ml-4 text-sm font-medium text-slate-300">
              Efetividade na gestão de casos clínicos
            </p>
            <p className="ml-4 text-xs text-slate-500 mt-0.5">
              Do alerta ao desfecho assistencial
            </p>
          </div>

          {/* Upload buttons */}
          <div className="shrink-0 flex items-center gap-2 flex-wrap justify-end">
            <ReinternacaoUpload
              onUploadSuccess={onReinternacaoUpload}
              rowCount={reinternacaoRowCount}
            />
            <UploadPrompt compact onUploadSuccess={onUploadSuccess} />
          </div>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            {/* Connection status */}
            <span className="flex items-center gap-1.5">
              {isConnected ? (
                <Wifi className="h-3.5 w-3.5 text-teal-400" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-red-400" />
              )}
              <span className={isConnected ? "text-teal-400" : "text-red-400"}>
                {isConnected ? "Dados carregados" : "Sem dados"}
              </span>
            </span>

            {/* Data source */}
            <span className="flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5 text-slate-500" />
              <span className="max-w-xs truncate" title={dataSource}>
                {dataSource}
              </span>
            </span>

            {/* Last fetch */}
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-slate-500" />
              <span>Última leitura: {formattedTime}</span>
            </span>

            {/* Loading indicator */}
            {isLoading && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full animate-pulse bg-teal-400" />
                <span>Carregando…</span>
              </span>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-800 px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Recarregar
          </button>
        </div>
      </div>
    </header>
  );
}
