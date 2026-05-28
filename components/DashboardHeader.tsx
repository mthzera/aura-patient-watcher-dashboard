"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { RefreshCw, Database, Clock, Wifi, WifiOff, LogOut, User } from "lucide-react";

interface UserInfo {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

interface Props {
  lastFetchAt: string | null;
  isLoading: boolean;
  isConnected: boolean;
  onRefresh: () => Promise<void>;
  autoRefreshSeconds: number;
  dataSource?: string;
  user?: UserInfo;
}

export function DashboardHeader({
  lastFetchAt,
  isLoading,
  isConnected,
  onRefresh,
  autoRefreshSeconds,
  dataSource = "SharePoint",
  user,
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

  const displayName = user?.name ?? user?.email ?? "Usuário";

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

          {/* User info + logout */}
          {user && (
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                <User className="h-3.5 w-3.5 text-slate-500" />
                <span>{displayName}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sair
              </button>
            </div>
          )}
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
                {isConnected ? "Conectado" : "Sem conexão"}
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
              <span>Última atualização: {formattedTime}</span>
            </span>

            {/* Auto-refresh indicator */}
            <span className="flex items-center gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${
                  isLoading ? "animate-pulse bg-teal-400" : "bg-slate-600"
                }`}
              />
              <span>
                {isLoading
                  ? "Atualizando..."
                  : `Auto-atualização a cada ${autoRefreshSeconds}s`}
              </span>
            </span>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || isLoading}
            className="flex items-center gap-2 rounded-md border border-teal-700 bg-teal-900/40 px-4 py-1.5 text-xs font-medium text-teal-300 transition hover:bg-teal-800/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Atualizar agora
          </button>
        </div>
      </div>
    </header>
  );
}
