"use client";

import { DashboardMetrics } from "@/lib/dashboard/types";
import { AlertTriangle } from "lucide-react";

interface Props {
  metrics: DashboardMetrics;
}

export function ImprovementOpportunityPanel({ metrics }: Props) {
  const noReturnPct =
    metrics.totalRecords > 0
      ? Math.round((metrics.noReturnCases / metrics.totalRecords) * 100)
      : 0;

  return (
    <section className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-300 mb-2">
            Oportunidade de melhoria
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            <strong className="text-amber-300">{metrics.noReturnCases} casos</strong>{" "}
            ({noReturnPct}% do total) estão registrados como &quot;sem retorno&quot;.
          </p>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-2xl">
            Sem retorno não é dado perdido: é visibilidade sobre onde o ciclo
            assistencial não se fecha. Esses casos representam a oportunidade
            mais clara de melhoria operacional — cada registro sem retorno é um
            ponto de atenção para fortalecer o processo de triagem e atuação.
          </p>

          {metrics.noReturnCases > 0 && (
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Stat
                label="Casos sem retorno"
                value={metrics.noReturnCases}
                color="text-amber-300"
              />
              <Stat
                label="% do total de registros"
                value={`${noReturnPct}%`}
                color="text-amber-300"
              />
              <Stat
                label="Ciclos fechados com êxito"
                value={metrics.favorableOutcomes}
                color="text-teal-300"
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

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
    <div className="rounded-lg border border-slate-700 bg-slate-800/60 px-4 py-3">
      <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}
