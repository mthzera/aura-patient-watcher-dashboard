"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Siren,
  TrendingUp,
} from "lucide-react";
import {
  LazyLoadFooter,
  ScrollTable,
  STICKY_TABLE_HEAD,
} from "@/components/LazyScrollTable";
import { useLazyList } from "@/components/useLazyList";
import type {
  IntercorrenciaAnalysis,
  IntercorrenciaAlertMatch,
  IntercorrenciaCountItem,
} from "@/lib/dashboard/types";

interface Props {
  analysis: IntercorrenciaAnalysis;
}

export function IntercorrenciaPanel({ analysis }: Props) {
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

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
    totalCount,
    hasMore,
    loadMore,
  } = useLazyList(filteredMatches);

  if (!analysis.available) {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <div className="flex items-start gap-3">
          <Siren className="h-5 w-5 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-1">
              Intercorrências × Alertas AURA
            </h2>
            <p className="text-xs text-slate-500">
              Importe a planilha de intercorrências Anery (Domiciliar) para
              identificar padrões clínicos e cruzar quais pacientes intercorreram
              nos 5 dias após um alerta AURA. Visível em Domiciliar ou Todos —
              oculta em Transição.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const coveragePct =
    analysis.totalIntercorrencias > 0
      ? Math.round(
          (analysis.withPriorAlert / analysis.totalIntercorrencias) * 100
        )
      : 0;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 space-y-5">
      <div className="flex items-start gap-3">
        <Siren className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-orange-300 mb-1">
            Intercorrências × Alertas AURA
          </h2>
          <p className="text-xs text-slate-400 max-w-3xl leading-snug">
            Intercorrências Anery (Domiciliar): principais motivos, grau de
            urgência, trajetória de desfecho e cruzamento com alertas AURA nos{" "}
            <strong className="text-slate-200">5 dias anteriores</strong> ao
            evento.
          </p>
        </div>
      </div>

      {analysis.totalIntercorrencias === 0 ? (
        <p className="text-sm text-slate-500 text-center py-6">
          Nenhuma intercorrência encontrada no período filtrado.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <KpiBox
              label="Total intercorrências"
              value={analysis.totalIntercorrencias}
              color="text-slate-200"
              bg="bg-slate-900/60 border-slate-700"
            />
            <KpiBox
              label="Com alerta AURA prévio (5d)"
              value={`${analysis.withPriorAlert} (${coveragePct}%)`}
              color="text-emerald-300"
              bg="bg-emerald-950/30 border-emerald-800/50"
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            />
            <KpiBox
              label="Sem alerta AURA prévio"
              value={analysis.withoutPriorAlert}
              color="text-amber-300"
              bg="bg-amber-950/30 border-amber-800/50"
              icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
            />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <PatternCard
              title="Principais motivos"
              subtitle="Classificação clínica"
              items={analysis.topReasons}
              accent="text-orange-300"
            />
            <PatternCard
              title="Grau de urgência"
              subtitle="Distribuição por criticidade"
              items={analysis.urgencyBreakdown}
              accent="text-amber-300"
            />
            <PatternCard
              title="Trajetória de desfecho"
              subtitle="Classificação do desfecho"
              items={analysis.outcomeTrajectory}
              accent="text-teal-300"
            />
          </div>

          {analysis.timeline.length > 0 && (
            <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Volume semanal de intercorrências
                </h3>
              </div>
              <div className="overflow-x-auto">
                <div className="flex gap-2 min-w-max pb-1">
                  {analysis.timeline.map((point) => {
                    const maxCount = Math.max(
                      ...analysis.timeline.map((p) => p.count),
                      1
                    );
                    const heightPct = Math.round(
                      (point.count / maxCount) * 100
                    );
                    return (
                      <div
                        key={point.weekStart}
                        className="flex flex-col items-center gap-1 w-14"
                        title={`Semana ${formatDate(point.weekStart)}: ${point.count} intercorrências (${point.withPriorAlert} com alerta AURA)`}
                      >
                        <div className="h-16 w-full flex items-end justify-center gap-0.5">
                          <div
                            className="w-4 rounded-t bg-orange-600/70"
                            style={{ height: `${Math.max(heightPct, 8)}%` }}
                          />
                          {point.withPriorAlert > 0 && (
                            <div
                              className="w-2 rounded-t bg-emerald-500/80"
                              style={{
                                height: `${Math.max(
                                  Math.round(
                                    (point.withPriorAlert / maxCount) * 100
                                  ),
                                  8
                                )}%`,
                              }}
                            />
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 text-center leading-tight">
                          {formatDate(point.weekStart).slice(0, 5)}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-300 tabular-nums">
                          {point.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2">
                Barras laranja = total · verde = com alerta AURA nos 5 dias
                anteriores
              </p>
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs text-slate-400 leading-snug">
            {analysis.withPriorAlert > 0 ? (
              <>
                <strong className="text-emerald-300">
                  {analysis.withPriorAlert}
                </strong>{" "}
                intercorrência{analysis.withPriorAlert !== 1 ? "s" : ""} ocorreu
                {analysis.withPriorAlert !== 1 ? "ram" : ""} em pacientes que
                já tinham alerta AURA registrado nos 5 dias anteriores.{" "}
                {analysis.withoutPriorAlert > 0 && (
                  <>
                    <strong className="text-amber-300">
                      {analysis.withoutPriorAlert}
                    </strong>{" "}
                    ocorreram sem alerta AURA prévio no período.
                  </>
                )}
              </>
            ) : (
              <>
                Nenhuma das {analysis.totalIntercorrencias} intercorrências
                teve alerta AURA nos 5 dias anteriores ao evento.
              </>
            )}
          </div>

          <div className="flex gap-2">
            {(
              [
                {
                  key: "all",
                  label: `Todos (${analysis.totalIntercorrencias})`,
                },
                {
                  key: "with",
                  label: `Com alerta (${analysis.withPriorAlert})`,
                },
                {
                  key: "without",
                  label: `Sem alerta (${analysis.withoutPriorAlert})`,
                },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                  filter === key
                    ? "border-orange-600 bg-orange-900/40 text-orange-200"
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
                    <th className="px-3 py-2 font-semibold text-slate-400">
                      Paciente
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-400 whitespace-nowrap">
                      Data início
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-400">
                      Motivo
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-400">
                      Urgência
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-400">
                      Desfecho
                    </th>
                    <th className="px-3 py-2 font-semibold text-slate-400 text-center">
                      Alerta AURA (5d)
                    </th>
                    <th className="px-3 py-2 w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredMatches.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-3 py-6 text-center text-slate-500"
                      >
                        Nenhum registro para este filtro.
                      </td>
                    </tr>
                  ) : (
                    lazyMatches.map((m) => {
                      const key = `${m.patientName}-${m.intercorrenciaDate}`;
                      return (
                        <MatchRow
                          key={key}
                          match={m}
                          isExpanded={expandedKey === key}
                          onToggle={() =>
                            setExpandedKey((prev) =>
                              prev === key ? null : key
                            )
                          }
                        />
                      );
                    })
                  )}
                </tbody>
              </table>
              {hasMore && (
                <div ref={sentinelRef} className="h-8 shrink-0" aria-hidden />
              )}
            </ScrollTable>
            <LazyLoadFooter
              visibleCount={visibleCount}
              totalCount={totalCount}
              hasMore={hasMore}
              onLoadMore={loadMore}
            />
          </div>
        </>
      )}
    </section>
  );
}

function PatternCard({
  title,
  subtitle,
  items,
  accent,
}: {
  title: string;
  subtitle: string;
  items: IntercorrenciaCountItem[];
  accent: string;
}) {
  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-4">
      <h3 className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>
        {title}
      </h3>
      <p className="text-[10px] text-slate-500 mb-3">{subtitle}</p>
      {items.length === 0 ? (
        <p className="text-xs text-slate-600">Sem dados</p>
      ) : (
        <ul className="space-y-2">
          {items.slice(0, 6).map((item) => (
            <li key={item.label}>
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span
                  className="text-xs text-slate-300 truncate"
                  title={item.label}
                >
                  {item.label}
                </span>
                <span className="text-[10px] text-slate-500 tabular-nums shrink-0">
                  {item.count} ({item.percent}%)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-orange-500/60"
                  style={{
                    width: `${Math.round((item.count / maxCount) * 100)}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MatchRow({
  match,
  isExpanded,
  onToggle,
}: {
  match: IntercorrenciaAlertMatch;
  isExpanded: boolean;
  onToggle: () => void;
}) {
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
          {formatDate(match.intercorrenciaDate)}
        </td>
        <td className="px-3 py-2 text-slate-400 max-w-[160px] truncate">
          {match.classificacao ?? "—"}
        </td>
        <td className="px-3 py-2 text-slate-400 max-w-[100px] truncate">
          {match.grauUrgencia ?? "—"}
        </td>
        <td className="px-3 py-2 text-slate-400 max-w-[180px] truncate">
          {match.classificacaoDesfecho ?? "—"}
        </td>
        <td className="px-3 py-2 text-center">
          {match.hadPriorAlert ? (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-900/40 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-800/50 whitespace-nowrap">
              <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
              {match.priorAlerts.length} alerta
              {match.priorAlerts.length !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded bg-amber-900/40 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-700/50 whitespace-nowrap">
              <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
              Sem alerta
            </span>
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
          <td colSpan={7} className="px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">
              Alertas AURA nos 5 dias anteriores à intercorrência
            </p>
            <ul className="space-y-1.5">
              {match.priorAlerts.map((a, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 text-xs text-slate-300 border-l-2 border-emerald-600/50 pl-2"
                >
                  <DaysChip days={a.daysBeforeIntercorrencia} />
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
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

function DaysChip({ days }: { days: number }) {
  const label = days === 0 ? "mesmo dia" : `${days}d antes`;
  const color =
    days === 0
      ? "bg-red-900/50 text-red-300"
      : days <= 2
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
