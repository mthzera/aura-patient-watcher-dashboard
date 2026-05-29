"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileWarning,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { AlertNarrative, AlertExecutiveSummary } from "@/lib/dashboard/types";

interface Props {
  narratives: AlertNarrative[];
  executiveSummary: AlertExecutiveSummary;
}

const PAGE_SIZE = 20;

export function AlertNarrativeTable({ narratives, executiveSummary }: Props) {
  const [page, setPage] = useState(0);
  const [showOnlyNoReturn, setShowOnlyNoReturn] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const filtered = showOnlyNoReturn
    ? narratives.filter((n) => n.isNoReturn)
    : narratives;

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function toggleExpand(idx: number) {
    setExpandedIndex((prev) => (prev === idx ? null : idx));
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Erro ao exportar.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "aura-alertas-narrativa.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-900/60 p-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <FileWarning className="h-5 w-5 shrink-0 mt-0.5 text-sky-400" />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-sky-300 mb-1">
              Resumo Interpretativo dos Alertas
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Cada linha traz uma frase humanizada com base na alteração clínica,
              datas e retorno da unidade. Alertas{" "}
              <span className="text-amber-300 font-medium">sem retorno</span> estão
              destacados em âmbar.
            </p>
          </div>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-sky-700 bg-sky-900/40 px-3 py-1.5 text-xs font-medium text-sky-200 transition hover:bg-sky-800/60 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? "Exportando…" : "Exportar XLSX"}
        </button>
      </div>

      {/* ── Executive summary ───────────────────────────────────────────── */}
      <ExecutiveSummaryCard summary={executiveSummary} />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-slate-400">
          {filtered.length} alerta{filtered.length !== 1 ? "s" : ""}
          {showOnlyNoReturn ? " sem retorno" : " no total"}
        </span>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            role="checkbox"
            aria-checked={showOnlyNoReturn}
            onClick={() => {
              setShowOnlyNoReturn((v) => !v);
              setPage(0);
            }}
            className={`relative h-4 w-4 rounded border transition ${
              showOnlyNoReturn
                ? "border-amber-500 bg-amber-500/30"
                : "border-slate-600 bg-slate-800"
            } flex items-center justify-center cursor-pointer`}
          >
            {showOnlyNoReturn && (
              <span className="block h-2 w-2 rounded-sm bg-amber-400" />
            )}
          </div>
          <span className="text-xs text-slate-300">
            Mostrar apenas sem retorno
          </span>
        </label>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      {pageItems.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-8">
          Nenhum registro encontrado para os filtros atuais.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700/60">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/60 text-left">
                <th className="px-3 py-2.5 font-semibold text-slate-400 w-8">#</th>
                <th className="px-3 py-2.5 font-semibold text-slate-400 whitespace-nowrap">Paciente</th>
                <th className="px-3 py-2.5 font-semibold text-slate-400 whitespace-nowrap">Data alerta</th>
                <th className="px-3 py-2.5 font-semibold text-slate-400">Unidade</th>
                <th className="px-3 py-2.5 font-semibold text-slate-400 whitespace-nowrap">Dias p/ evento</th>
                <th className="px-3 py-2.5 font-semibold text-slate-400">Retorno</th>
                <th className="px-3 py-2.5 font-semibold text-slate-400 min-w-[280px]">Resumo interpretativo</th>
                <th className="px-3 py-2.5 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pageItems.map((n) => {
                const isExpanded = expandedIndex === n.index;
                return (
                  <tr
                    key={n.index}
                    className={`transition-colors ${
                      n.isNoReturn
                        ? "bg-amber-950/20 hover:bg-amber-950/35"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="px-3 py-2.5 text-slate-500 tabular-nums">
                      {n.index + 1}
                    </td>
                    <td className="px-3 py-2.5 text-slate-200 font-medium whitespace-nowrap max-w-[140px] truncate">
                      {n.patientName ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">
                      {formatDisplayDate(n.date)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 whitespace-nowrap">
                      {n.unit ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <DaysChip days={n.daysBeforeDischarge} eventType={n.eventType} />
                    </td>
                    <td className="px-3 py-2.5">
                      <ReturnBadge noReturn={n.isNoReturn} result={n.interventionResult} />
                    </td>
                    <td className="px-3 py-2.5 text-slate-300 leading-relaxed">
                      {isExpanded ? (
                        <span>{n.summaryText}</span>
                      ) : (
                        <span className="line-clamp-2">{n.summaryText}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => toggleExpand(n.index)}
                        className="text-slate-500 hover:text-slate-300 transition"
                        title={isExpanded ? "Recolher" : "Expandir"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Pagination ──────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-400">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded border border-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Anterior
          </button>
          <span>
            Página {page + 1} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded border border-slate-700 hover:border-slate-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            Próxima
          </button>
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-4 text-[11px] text-slate-500 border-t border-slate-800 pt-4">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500/50 border border-amber-600/50" />
          Sem retorno da clínica/unidade
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
          Retorno registrado
        </span>
        <span className="flex items-center gap-1.5">
          <Info className="h-3 w-3 text-slate-500" />
          Clique em ▾ para expandir o texto completo
        </span>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Executive summary card
// ---------------------------------------------------------------------------

function ExecutiveSummaryCard({ summary }: { summary: AlertExecutiveSummary }) {
  const [showList, setShowList] = useState(false);

  return (
    <div
      className={`rounded-lg border p-4 space-y-3 ${
        summary.noReturnCount > 0
          ? "border-amber-700/50 bg-amber-950/25"
          : "border-emerald-800/50 bg-emerald-950/20"
      }`}
    >
      <div className="flex items-start gap-2.5">
        {summary.noReturnCount > 0 ? (
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-300 mb-1">
            Resumo Executivo — Alertas sem Retorno
          </h3>
          <p className="text-sm text-slate-200 leading-relaxed">
            {summary.summaryText}
          </p>
        </div>
      </div>

      {/* KPI row */}
      <div className="flex gap-6 flex-wrap">
        <Stat
          label="Alertas AURA"
          value={summary.totalAlerted}
          color="text-sky-300"
        />
        <Stat
          label="Sem retorno"
          value={summary.noReturnCount}
          color="text-amber-300"
        />
        <Stat
          label="% sem retorno"
          value={`${summary.noReturnPercentage}%`}
          color={
            summary.noReturnPercentage > 30
              ? "text-red-300"
              : summary.noReturnPercentage > 15
              ? "text-amber-300"
              : "text-emerald-300"
          }
        />
      </div>

      {/* Expandable patient list */}
      {summary.noReturnCount > 0 && (
        <div>
          <button
            onClick={() => setShowList((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 transition"
          >
            {showList ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
            {showList ? "Ocultar" : "Ver"} lista de alertas sem retorno (
            {summary.noReturnAlerts.length})
          </button>

          {showList && (
            <ul className="mt-2 space-y-1 max-h-48 overflow-y-auto pr-2">
              {summary.noReturnAlerts.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs text-slate-300 border-l-2 border-amber-600/50 pl-2"
                >
                  <span className="text-slate-500 tabular-nums w-5 shrink-0">
                    {i + 1}.
                  </span>
                  <span className="font-medium truncate max-w-[180px]">
                    {a.patientName ?? "Paciente não identificado"}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-slate-400">{formatDisplayDate(a.date)}</span>
                  {a.unit && (
                    <>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-400">{a.unit}</span>
                    </>
                  )}
                  {a.alertReason && (
                    <>
                      <span className="text-slate-500">·</span>
                      <span className="text-slate-500 italic truncate max-w-[160px]">
                        {a.alertReason}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </span>
      <span className={`text-xl font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

function DaysChip({
  days,
  eventType,
}: {
  days: number | null;
  eventType: "reinternação" | "óbito" | "outro" | null;
}) {
  if (days === null || eventType === null || eventType === "outro") {
    return <span className="text-slate-600">—</span>;
  }
  const bg =
    days === 0
      ? "bg-red-900/50 text-red-300"
      : days <= 3
      ? "bg-amber-900/50 text-amber-300"
      : "bg-slate-800 text-slate-300";
  const label = days === 0 ? "mesmo dia" : `${days}d`;
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${bg}`}>
      {label}
    </span>
  );
}

function ReturnBadge({
  noReturn,
  result,
}: {
  noReturn: boolean;
  result: string | null;
}) {
  if (noReturn) {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-700/50 whitespace-nowrap">
        <AlertTriangle className="h-2.5 w-2.5" />
        Sem retorno
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-emerald-900/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-800/50 whitespace-nowrap max-w-[120px] truncate">
      <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
      {result ?? "Registrado"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatDisplayDate(raw: string | null): string {
  if (!raw) return "—";
  // Already DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(raw)) return raw.slice(0, 10);
  // ISO YYYY-MM-DD → DD/MM/YYYY
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return raw;
}
