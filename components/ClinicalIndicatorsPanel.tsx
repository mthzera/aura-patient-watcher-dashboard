"use client";

import { DashboardMetrics } from "@/lib/dashboard/types";

interface Props {
  metrics: DashboardMetrics;
}

export function ClinicalIndicatorsPanel({ metrics }: Props) {
  const transientPct = pct(metrics.transientDecompensations, metrics.totalRecords);
  const acutePct = pct(metrics.acuteDecompensations, metrics.totalRecords);
  const acuteEffectivePct = pct(
    metrics.acuteEffectiveActions,
    metrics.acuteDecompensations
  );
  const deteriorationPct = pct(
    metrics.deteriorationReversals,
    metrics.acuteDecompensations
  );
  const avoidedReadmissionsPct = pct(
    metrics.avoidedReadmissions,
    metrics.acuteDecompensations
  );

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
          Indicadores clínicos de apoio
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Contagem e percentual sobre os registros filtrados ou sobre o grupo clínico.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transient decompensation */}
        <div className="rounded-lg border border-slate-600 bg-slate-900/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-3">
            Descompensação Transitória
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="Casos"
              value={metrics.transientDecompensations}
              percent={`${transientPct}%`}
              sub="dos registros"
            />
            <Stat
              label="Taxa de atuação efetiva"
              value={`${metrics.transientEffectiveRate}%`}
              sub={`${metrics.transientEffectiveActions} atuações`}
            />
          </div>
        </div>

        {/* Acute decompensation */}
        <div className="rounded-lg border border-slate-600 bg-slate-900/60 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-3">
            Descompensação Aguda
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat
              label="Casos"
              value={metrics.acuteDecompensations}
              percent={`${acutePct}%`}
              sub="dos registros"
            />
            <Stat
              label="Atuações efetivas"
              value={metrics.acuteEffectiveActions}
              percent={`${acuteEffectivePct}%`}
              sub="das agudas"
            />
            <Stat
              label="Taxa de atuação"
              value={`${metrics.acuteEffectiveRate}%`}
            />
            <Stat
              label="Reversões de deterioração"
              value={metrics.deteriorationReversals}
              percent={`${deteriorationPct}%`}
              sub="das agudas"
            />
          </div>
        </div>
      </div>

      {/* Avoided readmissions */}
      <div className="mt-3 rounded-lg border border-emerald-900 bg-emerald-950/30 p-3">
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
          <div className="ml-4 shrink-0 text-right">
            <div className="text-3xl font-bold text-emerald-300 tabular-nums">
              {metrics.avoidedReadmissions}
            </div>
            <div className="text-lg font-bold text-emerald-400 tabular-nums">
              {avoidedReadmissionsPct}%
            </div>
            <div className="text-[11px] text-slate-500">das agudas</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  percent,
  sub,
}: {
  label: string;
  value: string | number;
  percent?: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-xl font-bold text-white tabular-nums">{value}</span>
        {percent && (
          <span className="text-sm font-bold text-slate-300 tabular-nums">
            {percent}
          </span>
        )}
      </div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
