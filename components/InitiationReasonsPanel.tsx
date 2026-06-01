"use client";

import type { InitiationActionBreakdown, InitiationReason } from "@/lib/dashboard/types";
import { PhoneOff, Building2, Activity, HeartPulse, HelpCircle } from "lucide-react";

interface Props {
  breakdown?: InitiationActionBreakdown;
}

const STYLE: Record<
  InitiationReason["key"],
  { color: string; bar: string; icon: React.ReactNode }
> = {
  retornoComIntervencao: {
    color: "text-teal-300",
    bar: "bg-teal-500",
    icon: <Activity className="h-4 w-4" />,
  },
  retornoBasal: {
    color: "text-sky-300",
    bar: "bg-sky-500",
    icon: <HeartPulse className="h-4 w-4" />,
  },
  semContatoTelefonico: {
    color: "text-amber-300",
    bar: "bg-amber-500",
    icon: <PhoneOff className="h-4 w-4" />,
  },
  unidadeNaoRespondeu: {
    color: "text-red-300",
    bar: "bg-red-500",
    icon: <Building2 className="h-4 w-4" />,
  },
  naoInformado: {
    color: "text-slate-400",
    bar: "bg-slate-600",
    icon: <HelpCircle className="h-4 w-4" />,
  },
};

const NO_RETURN_KEYS: InitiationReason["key"][] = [
  "semContatoTelefonico",
  "unidadeNaoRespondeu",
];

export function InitiationReasonsPanel({ breakdown }: Props) {
  if (!breakdown || !breakdown.available || breakdown.total === 0) {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
          Motivos da iniciativa
        </h2>
        <p className="text-sm text-slate-500">
          Sem dados de &quot;Ação Iniciação&quot; para o recorte atual.
        </p>
      </section>
    );
  }

  const { reasons, total, semRetornoTotal } = breakdown;
  const max = Math.max(...reasons.map((r) => r.count), 1);
  const noReturn = reasons.filter((r) => NO_RETURN_KEYS.includes(r.key));
  const semRetornoPct =
    total > 0 ? Math.round((semRetornoTotal / total) * 100) : 0;

  return (
    <section
      id="motivos-nao-retorno"
      className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 scroll-mt-4"
    >
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
        Motivos da iniciativa
      </h2>
      <p className="text-xs text-slate-500 mb-4 max-w-2xl">
        Quebra de cada registro pela coluna &quot;Ação Iniciação&quot; — separa
        retorno com intervenção e basal, e abre o sem retorno em seus motivos.
      </p>

      {/* Destaque: motivos de não retorno */}
      <div className="rounded-lg border-2 border-amber-700/80 bg-amber-950/50 p-4 sm:p-5 mb-5 shadow-[0_0_24px_-8px_rgba(251,191,36,0.25)]">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">
              Além de não ter retorno, quais motivos de não retorno?
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
              Dos registros no recorte,{" "}
              <strong className="text-amber-300">{semRetornoTotal}</strong>{" "}
              ({semRetornoPct}%) estão classificados como sem retorno — divididos
              entre falha de contato telefônico e ausência de resposta da unidade.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-4xl font-bold text-amber-300 tabular-nums leading-none">
              {semRetornoTotal}
            </div>
            <div className="text-xs text-amber-400/90 mt-1 tabular-nums">
              {semRetornoPct}% do total
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-amber-800/50">
          {noReturn.map((r) => {
            const s = STYLE[r.key];
            const shareOfNoReturn =
              semRetornoTotal > 0
                ? Math.round((r.count / semRetornoTotal) * 100)
                : 0;
            return (
              <div
                key={r.key}
                className="rounded-lg border border-amber-800/60 bg-slate-900/50 p-3"
              >
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-amber-400/90">
                  <span className={s.color}>{s.icon}</span>
                  {r.label}
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-2xl font-bold tabular-nums text-white">
                    {r.count}
                  </span>
                  <span
                    className={`pb-1 text-lg font-bold tabular-nums ${s.color}`}
                  >
                    {r.percent}%
                  </span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {shareOfNoReturn}% dos casos sem retorno · {r.count} de{" "}
                  {total} registros
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-3">
        Visão completa — todos os motivos
      </p>

      {/* Full breakdown bars */}
      <div className="space-y-2">
        {reasons.map((r) => {
          const s = STYLE[r.key];
          const isNoReturn = NO_RETURN_KEYS.includes(r.key);
          return (
            <div
              key={r.key}
              className={`flex items-center gap-3 rounded-md px-1 py-0.5 ${
                isNoReturn ? "bg-amber-950/30 ring-1 ring-amber-900/40" : ""
              }`}
            >
              <div className="flex w-48 shrink-0 items-center gap-2 text-xs text-slate-300">
                <span className={s.color}>{s.icon}</span>
                <span className="truncate">{r.label}</span>
              </div>
              <div className="flex-1 h-5 rounded bg-slate-900/60 overflow-hidden">
                <div
                  className={`h-full ${s.bar} opacity-80`}
                  style={{ width: `${(r.count / max) * 100}%` }}
                />
              </div>
              <div className="w-24 shrink-0 text-right text-xs tabular-nums text-slate-400">
                {r.count} ({r.percent}%)
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
