"use client";

import { DashboardMetrics } from "@/lib/dashboard/types";

interface Props {
  metrics: DashboardMetrics;
}

export function ClinicalIndicatorsPanel({ metrics }: Props) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-5">
        Indicadores clínicos de apoio
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transient decompensation */}
        <div className="rounded-lg border border-slate-600 bg-slate-900/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">
            Descompensação Transitória
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="Casos"
              value={metrics.transientDecompensations}
            />
            <Stat
              label="Taxa de atuação efetiva"
              value={`${metrics.transientEffectiveRate}%`}
              sub={`${metrics.transientEffectiveActions} atuações`}
            />
          </div>
        </div>

        {/* Acute decompensation */}
        <div className="rounded-lg border border-slate-600 bg-slate-900/60 p-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-3">
            Descompensação Aguda
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat label="Casos" value={metrics.acuteDecompensations} />
            <Stat
              label="Atuações efetivas"
              value={metrics.acuteEffectiveActions}
            />
            <Stat
              label="Taxa de atuação"
              value={`${metrics.acuteEffectiveRate}%`}
            />
            <Stat
              label="Reversões de deterioração"
              value={metrics.deteriorationReversals}
            />
          </div>
        </div>
      </div>

      {/* Avoided readmissions */}
      <div className="mt-4 rounded-lg border border-emerald-900 bg-emerald-950/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-0.5">
              Internações potencialmente evitadas
            </div>
            <p className="text-xs text-slate-500 max-w-lg">
              Casos de descompensação aguda com atuação documentada e desfecho
              favorável — estimativa conservadora de internações evitadas pela
              resposta oportuna.
            </p>
          </div>
          <div className="text-4xl font-bold text-emerald-300 tabular-nums ml-4 shrink-0">
            {metrics.avoidedReadmissions}
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div>
      <div className="text-xl font-bold text-white tabular-nums">{value}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}
