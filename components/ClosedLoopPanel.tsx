"use client";

import type { DashboardMetrics } from "@/lib/dashboard/types";
import { METRIC_TOOLTIPS } from "@/lib/dashboard/metricTooltips";
import { MetricTooltip } from "@/components/MetricTooltip";
import { ArrowRight } from "lucide-react";

interface Props {
  metrics: DashboardMetrics;
}

type FunnelStep = {
  label: string;
  value: number;
  description: string;
  tooltip: string;
  color: string;
  bg: string;
};

export function ClosedLoopPanel({ metrics }: Props) {
  const first: FunnelStep = {
    label: "Registros",
    value: metrics.totalRecords,
    description: "Total no recorte",
    tooltip: METRIC_TOOLTIPS.funnelRecords,
    color: "border-slate-600 text-slate-300",
    bg: "bg-slate-900/50",
  };

  const last: FunnelStep = {
    label: "Desfechos Registrados",
    value: metrics.registeredOutcomes,
    description: "Desfecho clínico preenchido",
    tooltip: METRIC_TOOLTIPS.funnelOutcomes,
    color: "border-teal-500 text-teal-300",
    bg: "bg-teal-950/50",
  };

  const middle: FunnelStep[] = [
    {
      label: "Alertas AURA",
      value: metrics.auraAlerts,
      description: "Alertado: Sim",
      tooltip: METRIC_TOOLTIPS.funnelAuraAlerts,
      color: "border-blue-600 text-blue-300",
      bg: "bg-blue-950/50",
    },
    {
      label: "Atuações da Unidade",
      value: metrics.unitActions,
      description: "Respostas documentadas",
      tooltip: METRIC_TOOLTIPS.funnelUnitActions,
      color: "border-orange-600 text-orange-300",
      bg: "bg-orange-950/40",
    },
    {
      label: "Alertas com Retorno",
      value: metrics.alertsWithReturn,
      description: pctOf(metrics.alertsWithReturn, metrics.auraAlerts, "alertas"),
      tooltip: METRIC_TOOLTIPS.funnelAlertsWithReturn,
      color: "border-violet-600 text-violet-300",
      bg: "bg-violet-950/50",
    },
    {
      label: "Alertas sem Retorno",
      value: metrics.auraAlertsNoReturn,
      description: pctOf(
        metrics.auraAlertsNoReturn,
        metrics.auraAlerts,
        "alertas"
      ),
      tooltip: METRIC_TOOLTIPS.funnelAlertsNoReturn,
      color: "border-amber-600 text-amber-300",
      bg: "bg-amber-950/50",
    },
  ].sort((a, b) => b.value - a.value);

  const funnelSteps = [first, ...middle, last];

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
        Efetividade dos Alertas AURA
      </h2>
      <p className="text-xs text-slate-500 mb-4 max-w-2xl">
        Registros primeiro; etapas intermediárias em ordem decrescente de volume;
        desfechos registrados por último. Cada card indica seu denominador.
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {funnelSteps.map((step, idx) => (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={`rounded-lg border ${step.color} ${step.bg} px-3 py-2.5 min-w-[118px] text-center`}
            >
              <div className="text-xl font-bold tabular-nums">{step.value}</div>
              <div className="text-[11px] font-semibold mt-1 inline-flex items-center justify-center gap-0.5">
                {step.label}
                <MetricTooltip text={step.tooltip} />
              </div>
              <div className="text-[10px] opacity-60 mt-0.5 leading-tight">
                {step.description}
              </div>
            </div>
            {idx < funnelSteps.length - 1 && (
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-600" />
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <SummaryCard
          label="Taxa de resposta aos alertas"
          value={`${metrics.alertResponseRate}%`}
          detail={`${metrics.alertsWithReturn} ÷ ${metrics.auraAlerts} alertas`}
          tooltip={METRIC_TOOLTIPS.alertResponseRate}
          tone="violet"
        />
        <SummaryCard
          label="Sem retorno (registros)"
          value={String(metrics.noReturnCases)}
          detail={`${metrics.noReturnRecordsRate}% de ${metrics.totalRecords} registros`}
          tooltip={METRIC_TOOLTIPS.noReturn}
          tone="warning"
        />
        <SummaryCard
          label="Sem retorno (alertas AURA)"
          value={String(metrics.auraAlertsNoReturn)}
          detail={`${metrics.auraAlertsNoReturnRate}% de ${metrics.auraAlerts} alertas`}
          tooltip={METRIC_TOOLTIPS.noReturn}
          tone="warning"
        />
        <SummaryCard
          label="Retorno normal/basal/estável"
          value={String(metrics.normalClinicalReturnAlerts)}
          detail={
            metrics.alertsWithReturn > 0
              ? `${metrics.normalClinicalReturnAmongReturnRate}% dos ${metrics.alertsWithReturn} alertas com retorno`
              : "Nenhum alerta com retorno no recorte"
          }
          tooltip={METRIC_TOOLTIPS.normalReturn}
          tone="info"
        />
      </div>

      <div className="rounded-lg border border-teal-800 bg-teal-950/40 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-0.5 inline-flex items-center gap-1">
            Efetividade do ciclo fechado
            <MetricTooltip text={METRIC_TOOLTIPS.effectiveness} />
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Com atuação e desfecho registrados:{" "}
            <strong className="text-teal-300">
              {metrics.closedLoopEffectivenessRate}%
            </strong>{" "}
            com desfecho favorável (melhora, basal ou estabilização).
          </p>
        </div>
        <div className="text-4xl font-bold text-teal-300 tabular-nums shrink-0">
          {metrics.closedLoopEffectivenessRate}%
        </div>
      </div>
    </section>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tooltip,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tooltip: string;
  tone: "violet" | "warning" | "info";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-800/60 bg-amber-950/25"
      : tone === "info"
        ? "border-sky-800/60 bg-sky-950/25"
        : "border-violet-800/60 bg-violet-950/25";

  const valueClass =
    tone === "warning"
      ? "text-amber-300"
      : tone === "info"
        ? "text-sky-300"
        : "text-violet-300";

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1">
        {label}
        <MetricTooltip text={tooltip} />
      </div>
      <div className={`mt-2 text-2xl font-bold tabular-nums ${valueClass}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500 leading-snug">{detail}</div>
    </div>
  );
}

function pctOf(part: number, total: number, noun: string): string {
  if (total <= 0) return `— dos ${noun}`;
  const pct = Math.round((part / total) * 100);
  return `${pct}% dos ${total} ${noun}`;
}
