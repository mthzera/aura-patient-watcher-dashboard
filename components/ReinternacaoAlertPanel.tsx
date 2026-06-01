"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-react";
import type {
  ReinternacaoAlertAnalysis,
  ReinternacaoAlertMatch,
} from "@/lib/dashboard/types";

interface Props {
  analysis: ReinternacaoAlertAnalysis;
}

export function ReinternacaoAlertPanel({ analysis }: Props) {
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const [expandedName, setExpandedName] = useState<string | null>(null);

  if (!analysis.available) {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-1">
              Reinternações × Alertas AURA
            </h2>
            <p className="text-xs text-slate-500">
              Importe o arquivo de reinternações para cruzar quais pacientes
              tiveram alta por reinternação/óbito e se havia alerta do comitê
              nos 10 dias anteriores.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const visibleMatches = analysis.matches.filter((m) => {
    if (filter === "with") return m.hadPriorAlert;
    if (filter === "without") return !m.hadPriorAlert;
    return true;
  });

  const coveragePct =
    analysis.totalReinternacoes > 0
      ? Math.round((analysis.withPriorAlert / analysis.totalReinternacoes) * 100)
      : 0;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <ShieldAlert className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-violet-300 mb-1">
            Reinternações × Alertas AURA
          </h2>
          <p className="text-xs text-slate-400 max-w-2xl leading-snug">
            Para cada paciente com alta por reinternação ou óbito, verifica se
            o comitê emitiu algum alerta AURA nos{" "}
            <strong className="text-slate-200">10 dias anteriores</strong> ao
            evento.
          </p>
        </div>
      </div>

      {analysis.totalReinternacoes === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          Nenhuma alta por reinternação, hospitalização ou óbito encontrada no
          arquivo carregado.
        </p>
      ) : (
        <>
          {/* KPI summary */}
          <div className="grid grid-cols-3 gap-3">
            <KpiBox
              label="Total altas"
              value={analysis.totalReinternacoes}
              color="text-slate-200"
              bg="bg-slate-900/60 border-slate-700"
            />
            <KpiBox
              label="Com alerta prévio"
              value={`${analysis.withPriorAlert} (${coveragePct}%)`}
              color="text-emerald-300"
              bg="bg-emerald-950/30 border-emerald-800/50"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            />
            <KpiBox
              label="Sem alerta prévio"
              value={analysis.withoutPriorAlert}
              color="text-amber-300"
              bg="bg-amber-950/30 border-amber-800/50"
              icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
            />
          </div>

          {/* Context note */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-400 leading-snug">
            {analysis.withPriorAlert > 0 ? (
              <>
                <strong className="text-emerald-300">{analysis.withPriorAlert}</strong>{" "}
                paciente{analysis.withPriorAlert !== 1 ? "s" : ""} com alta por
                reinternação/óbito já tinham sido identificados pelo comitê AURA
                antes do evento —
                isso demonstra que o alerta ocorreu oportunamente.{" "}
                {analysis.withoutPriorAlert > 0 && (
                  <>
                    <strong className="text-amber-300">{analysis.withoutPriorAlert}</strong>{" "}
                    tiveram alta sem alerta prévio registrado nos últimos 10 dias —
                    justificativa: pacientes sem tablet disponível para registro de sinais vitais,
                    o que impossibilitou a geração do alerta AURA.
                  </>
                )}
              </>
            ) : (
              <>
                Nenhum dos {analysis.totalReinternacoes} pacientes com alta por
                reinternação/óbito tinha alerta AURA registrado nos 10 dias
                anteriores — justificativa: pacientes sem tablet disponível para
                registro de sinais vitais, impossibilitando a geração do alerta AURA.
              </>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2">
            {(
              [
                { key: "all", label: `Todos (${analysis.totalReinternacoes})` },
                { key: "with", label: `Com alerta (${analysis.withPriorAlert})` },
                { key: "without", label: `Sem alerta (${analysis.withoutPriorAlert})` },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                  filter === key
                    ? "border-violet-600 bg-violet-900/40 text-violet-200"
                    : "border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-700/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/60 text-left">
                  <th className="px-3 py-2 font-semibold text-slate-400">Paciente</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 whitespace-nowrap">Data alta</th>
                  <th className="px-3 py-2 font-semibold text-slate-400">Condição</th>
                  <th className="px-3 py-2 font-semibold text-slate-400 text-center">Alerta prévio</th>
                  <th className="px-3 py-2 font-semibold text-slate-400">Motivo alerta AURA</th>
                  <th className="px-3 py-2 w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {visibleMatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-slate-500"
                    >
                      Nenhum registro para este filtro.
                    </td>
                  </tr>
                ) : (
                  visibleMatches.map((m) => (
                    <MatchRow
                      key={`${m.patientName}-${m.reinternacaoDate}`}
                      match={m}
                      isExpanded={expandedName === `${m.patientName}-${m.reinternacaoDate}`}
                      onToggle={() =>
                        setExpandedName((prev) =>
                          prev === `${m.patientName}-${m.reinternacaoDate}`
                            ? null
                            : `${m.patientName}-${m.reinternacaoDate}`
                        )
                      }
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MatchRow({
  match,
  isExpanded,
  onToggle,
}: {
  match: ReinternacaoAlertMatch;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const alertReasons = getAlertReasons(match);

  return (
    <>
      <tr
        className={`transition-colors ${
          match.hadPriorAlert
            ? "hover:bg-emerald-950/20"
            : "bg-amber-950/10 hover:bg-amber-950/25"
        }`}
      >
        <td className="px-3 py-2 text-slate-200 font-medium max-w-[160px] truncate">
          {match.patientName}
        </td>
        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">
          {formatDate(match.reinternacaoDate)}
        </td>
        <td className="px-3 py-2 text-slate-400 max-w-[160px] truncate">
          {match.conditionOnDischarge ?? "—"}
        </td>
        <td className="px-3 py-2 text-center">
          {match.hadPriorAlert ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-800/50 whitespace-nowrap">
              <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
              {match.priorAlerts.length} alerta{match.priorAlerts.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-700/50 whitespace-nowrap">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
              Sem alerta
            </span>
          )}
        </td>
        <td className="px-3 py-2 max-w-[240px]">
          {alertReasons ? (
            <span className="text-slate-300 line-clamp-2" title={alertReasons}>
              {alertReasons}
            </span>
          ) : !match.hadPriorAlert ? (
            <span
              className="inline-flex items-center gap-1 text-slate-400 italic"
              title="Paciente sem tablet disponível para registro de sinais vitais"
            >
              <span className="text-slate-500">📋</span>
              Sem tablet para registro de sinais vitais
            </span>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>
        <td className="px-3 py-2">
          {match.hadPriorAlert && (
            <button
              onClick={onToggle}
              className="text-slate-500 hover:text-slate-300 transition"
              title={isExpanded ? "Recolher alertas" : "Ver alertas prévios"}
            >
              {isExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </td>
      </tr>
      {isExpanded && match.priorAlerts.length > 0 && (
        <tr className="bg-slate-900/60">
          <td colSpan={6} className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Alertas AURA nos 10 dias anteriores à alta
            </p>
            <ul className="space-y-1.5">
              {match.priorAlerts.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs text-slate-300 border-l-2 border-emerald-600/50 pl-2"
                >
                  <DaysChip days={a.daysBeforeReinternacao} />
                  <span className="text-slate-200 font-medium whitespace-nowrap">
                    {formatDate(a.date)}
                  </span>
                  {a.unit && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-400">{a.unit}</span>
                    </>
                  )}
                  {a.clinicalAlteration && (
                    <>
                      <span className="text-slate-600">·</span>
                      <span className="text-slate-500 italic">
                        Motivo: {a.clinicalAlteration}
                      </span>
                    </>
                  )}
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

function getAlertReasons(match: ReinternacaoAlertMatch): string {
  const reasons = Array.from(
    new Set(
      match.priorAlerts
        .map((a) => a.clinicalAlteration?.trim())
        .filter((reason): reason is string => !!reason)
    )
  );

  if (reasons.length === 0) return "";
  if (reasons.length <= 2) return reasons.join(" · ");
  return `${reasons.slice(0, 2).join(" · ")} +${reasons.length - 2}`;
}

function DaysChip({ days }: { days: number }) {
  const label = days === 0 ? "mesmo dia" : `${days}d antes`;
  const color =
    days === 0
      ? "bg-red-900/50 text-red-300"
      : days <= 3
      ? "bg-amber-900/50 text-amber-300"
      : "bg-slate-800 text-slate-300";
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap ${color}`}
    >
      {label}
    </span>
  );
}

function KpiBox({
  label,
  value,
  color,
  bg,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  bg: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border p-3 ${bg}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
}

function formatDate(raw: string | null): string {
  if (!raw) return "—";
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(raw)) return raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const [y, m, d] = raw.slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  return raw;
}
