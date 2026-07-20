"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from "lucide-react";
import {
  LazyLoadFooter,
  ScrollTable,
  STICKY_TABLE_HEAD,
} from "@/components/LazyScrollTable";
import { useLazyList } from "@/components/useLazyList";
import {
  EFFECTIVENESS_REASON_LABELS,
  type ReinternacaoAlertAnalysis,
  type ReinternacaoAlertMatch,
  type ReinternacaoEffectivenessReason,
} from "@/lib/dashboard/types";

interface Props {
  analysis: ReinternacaoAlertAnalysis;
}

export function ReinternacaoAlertPanel({ analysis }: Props) {
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const [expandedName, setExpandedName] = useState<string | null>(null);

  useEffect(() => {
    setFilter("all");
    setExpandedName(null);
  }, [analysis.matches, analysis.totalReinternacoes]);

  const filteredMatches = useMemo(() => {
    if (!analysis.available) return [];
    return analysis.matches.filter((m) => {
      if (filter === "with") return m.hadPriorAlert;
      if (filter === "without") return !m.hadPriorAlert;
      return true;
    });
  }, [analysis.available, analysis.matches, filter]);

  const {
    scrollRef,
    sentinelRef,
    visibleItems: lazyMatches,
    visibleCount,
    hasMore,
    loadMore,
  } = useLazyList(filteredMatches, 30, filter);

  const aneryWithoutAlert = useMemo(
    () => analysis.matches.filter((m) => !m.hadPriorAlert && m.isAnery).length,
    [analysis.matches]
  );

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
              Importe a planilha de reinternações (Command Center ou altas
              Anery) para cruzar quais pacientes tiveram reinternação/óbito e se
              havia alerta do comitê nos 10 dias anteriores.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const coveragePct =
    analysis.totalReinternacoes > 0
      ? Math.round((analysis.withPriorAlert / analysis.totalReinternacoes) * 100)
      : 0;

  const eff = analysis.effectiveness;
  const withAlert = analysis.withPriorAlert;

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
            evento — e, quando houve alerta, se atuamos (Intervenção Unidade) e
            qual foi o desfecho.
          </p>
        </div>
      </div>

      {analysis.totalReinternacoes === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          Nenhuma alta por reinternação, hospitalização ou óbito encontrada no
          recorte atual.
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

          {/* Effectiveness among reinternados with prior alert */}
          {withAlert > 0 && (
            <div className="rounded-lg border border-violet-800/50 bg-violet-950/20 p-4 space-y-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-violet-300 mb-1">
                  Efetividade nos reinternados com alerta
                </h3>
                <p className="text-[11px] text-slate-500">
                  Com base no alerta mais recente nos 10 dias: Intervenção
                  Unidade + Alteração Clínica + Desfecho (Discussão do Comitê
                  na aguda).
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <KpiBox
                  label="Atuamos"
                  value={`${eff.acted} (${pct(eff.acted, withAlert)}%)`}
                  color="text-emerald-300"
                  bg="bg-emerald-950/30 border-emerald-800/40"
                />
                <KpiBox
                  label="Não atuamos"
                  value={`${eff.notActed} (${pct(eff.notActed, withAlert)}%)`}
                  color="text-amber-300"
                  bg="bg-amber-950/30 border-amber-800/40"
                />
                <KpiBox
                  label="Aguda"
                  value={`${eff.byAlteration.aguda.acted}/${eff.byAlteration.aguda.total}`}
                  color="text-rose-300"
                  bg="bg-slate-900/50 border-slate-700"
                  sub="atuamos / total"
                />
                <KpiBox
                  label="Transitória"
                  value={`${eff.byAlteration.transitoria.acted}/${eff.byAlteration.transitoria.total}`}
                  color="text-amber-200"
                  bg="bg-slate-900/50 border-slate-700"
                  sub="atuamos / total"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {(
                  Object.keys(EFFECTIVENESS_REASON_LABELS) as ReinternacaoEffectivenessReason[]
                ).map((key) => {
                  const count = eff.byReason[key];
                  if (count === 0) return null;
                  return (
                    <div
                      key={key}
                      className="flex items-baseline justify-between gap-2 text-slate-400"
                    >
                      <span>{EFFECTIVENESS_REASON_LABELS[key]}</span>
                      <span className="tabular-nums text-slate-200 font-semibold shrink-0">
                        {count}{" "}
                        <span className="text-slate-500 font-normal">
                          ({pct(count, withAlert)}%)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Context note */}
          <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-400 leading-snug">
            {analysis.withPriorAlert > 0 ? (
              <>
                <strong className="text-emerald-300">{analysis.withPriorAlert}</strong>{" "}
                paciente{analysis.withPriorAlert !== 1 ? "s" : ""} com alta por
                reinternação/óbito já tinham sido identificados pelo comitê AURA
                antes do evento.{" "}
                {aneryWithoutAlert > 0 && (
                  <>
                    Em Anery,{" "}
                    <strong className="text-amber-300">{aneryWithoutAlert}</strong>{" "}
                    sem alerta prévio — possível ausência de registro de SSVV.
                  </>
                )}
              </>
            ) : aneryWithoutAlert > 0 ? (
              <>
                Nenhum dos {analysis.totalReinternacoes} pacientes com alta por
                reinternação/óbito tinha alerta AURA nos 10 dias anteriores. Em
                Anery, a ausência de registro de SSVV pode impedir a geração do
                alerta.
              </>
            ) : (
              <>
                Nenhum dos {analysis.totalReinternacoes} pacientes com alta por
                reinternação/óbito tinha alerta AURA registrado nos 10 dias
                anteriores.
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
                type="button"
                onClick={() => {
                  setFilter(key);
                  setExpandedName(null);
                }}
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

          <div className="overflow-hidden rounded-lg border border-slate-700/60">
            <ScrollTable scrollRef={scrollRef} className="rounded-none border-0">
              <table className="w-full text-xs">
                <thead>
                  <tr className={STICKY_TABLE_HEAD}>
                    <th className="px-3 py-2 font-semibold text-slate-400">Paciente</th>
                    <th className="px-3 py-2 font-semibold text-slate-400 whitespace-nowrap">Data alta</th>
                    <th className="px-3 py-2 font-semibold text-slate-400 whitespace-nowrap">Unidade</th>
                    <th className="px-3 py-2 font-semibold text-slate-400">
                      Motivo / condição
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-400 text-center">Alerta prévio</th>
                    <th className="px-3 py-2 font-semibold text-slate-400">Motivo alerta AURA</th>
                    <th className="px-3 py-2 font-semibold text-slate-400">Atuação</th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredMatches.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        Nenhum registro para este filtro.
                      </td>
                    </tr>
                  ) : (
                    lazyMatches.map((m) => (
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
              {hasMore && (
                <div ref={sentinelRef} className="h-8 shrink-0" aria-hidden />
              )}
            </ScrollTable>
            <LazyLoadFooter
              visibleCount={Math.min(visibleCount, filteredMatches.length)}
              totalCount={analysis.totalReinternacoes}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
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
  const showSsvv = !match.hadPriorAlert && match.isAnery;

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
        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">
          {match.unit ?? match.filial ?? "—"}
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
          ) : showSsvv ? (
            <span
              className="inline-flex items-center gap-1 text-slate-400 italic"
              title="Paciente sem registro de SSVV (Anery)"
            >
              <span className="text-slate-500">📋</span>
              Sem registro de SSVV
            </span>
          ) : (
            <span className="text-slate-600">—</span>
          )}
        </td>
        <td className="px-3 py-2 max-w-[200px]">
          {match.hadPriorAlert && match.effectivenessReason ? (
            <span
              className={`line-clamp-2 text-[11px] ${
                match.acted === false
                  ? "text-amber-300"
                  : match.effectivenessReason === "retorno_favoravel_reinternou"
                    ? "text-rose-300"
                    : "text-slate-300"
              }`}
              title={EFFECTIVENESS_REASON_LABELS[match.effectivenessReason]}
            >
              {match.acted === false ? "Não atuamos" : "Atuamos"}
              {" · "}
              {EFFECTIVENESS_REASON_LABELS[match.effectivenessReason]}
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
          <td colSpan={8} className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Alertas AURA nos 10 dias anteriores à alta
            </p>
            <ul className="space-y-1.5">
              {match.priorAlerts.map((a, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-2 text-xs text-slate-300 border-l-2 border-emerald-600/50 pl-2"
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
                        {a.clinicalAlteration}
                      </span>
                    </>
                  )}
                  <span className="text-slate-600">·</span>
                  <span
                    className={
                      a.acted ? "text-emerald-400/90" : "text-amber-400/90"
                    }
                  >
                    {a.acted ? "Atuamos" : "Não atuamos"}
                    {" — "}
                    {EFFECTIVENESS_REASON_LABELS[a.effectivenessReason]}
                  </span>
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

  if (reasons.length === 0) {
    if (match.hadPriorAlert && match.effectivenessReason) {
      return EFFECTIVENESS_REASON_LABELS[match.effectivenessReason];
    }
    return "";
  }
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
  sub,
}: {
  label: string;
  value: string | number;
  color: string;
  bg: string;
  icon?: React.ReactNode;
  sub?: string;
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
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 100);
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
