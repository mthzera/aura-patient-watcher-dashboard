"use client";

import type { DashboardMetrics } from "@/lib/dashboard/types";
import { METRIC_TOOLTIPS } from "@/lib/dashboard/metricTooltips";
import { MetricTooltip } from "@/components/MetricTooltip";

interface Props {
  metrics: DashboardMetrics;
}

export function ClosedLoopPanel({ metrics }: Props) {
  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
        Efetividade dos Alertas AURA
      </h2>
      <p className="text-xs text-slate-500 mb-4 max-w-2xl">
        Taxa de resposta da unidade entre os {metrics.auraAlerts} alertas AURA do
        recorte (totais nos cards acima).
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <div className="rounded-lg border-2 border-violet-600/80 bg-violet-950/40 p-4 sm:p-5 sm:col-span-2 lg:col-span-1">
          <div className="text-xs font-semibold uppercase tracking-widest text-violet-400 mb-1 inline-flex items-center gap-1">
            Taxa de resposta aos alertas
            <MetricTooltip text={METRIC_TOOLTIPS.alertResponseSuccess} />
          </div>
          <div className="flex flex-wrap items-end gap-3 mt-2">
            <span className="text-4xl font-bold tabular-nums text-violet-300">
              {metrics.alertResponseRate}%
            </span>
            <span className="text-sm text-slate-400 pb-1">
              de sucesso ·{" "}
              <strong className="text-white tabular-nums">
                {metrics.alertsWithReturn}
              </strong>{" "}
              de {metrics.auraAlerts} alertas AURA
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-teal-700/60 bg-teal-950/30 p-4">
          <div className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-1 inline-flex items-center gap-1">
            Desfechos registrados
            <MetricTooltip text={METRIC_TOOLTIPS.funnelOutcomes} />
          </div>
          <div className="mt-2 text-2xl font-bold tabular-nums text-teal-300">
            {metrics.registeredOutcomesAuraAlerts}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {metrics.registeredOutcomesAuraAlertsRate}% dos {metrics.auraAlerts} alertas
            AURA · Desfecho Clínico preenchido
          </p>
          {metrics.registeredOutcomesAuraAlertsMissing > 0 && (
            <p className="text-[10px] text-amber-300/80 mt-1 leading-snug">
              Faltam{" "}
              <strong className="text-amber-200 tabular-nums">
                {metrics.registeredOutcomesAuraAlertsMissing}
              </strong>{" "}
              alertas AURA sem desfecho clínico registrado.
            </p>
          )}
          <p className="text-[10px] text-slate-600 mt-2 leading-snug">
            Não usa os {metrics.totalRecords} registros da planilha — só linhas com
            alerta AURA.
          </p>
        </div>
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
            (
            <strong className="text-white tabular-nums">
              {metrics.closedLoopEffectivenessNumerator}
            </strong>{" "}
            de{" "}
            <strong className="text-white tabular-nums">
              {metrics.closedLoopEffectivenessDenominator}
            </strong>
            ) com desfecho favorável. Entre alertas com retorno,{" "}
            <strong className="text-sky-300">
              {metrics.normalClinicalReturnAlerts}
            </strong>{" "}
            ({metrics.normalClinicalReturnAmongReturnRate}%) tiveram quadro
            normal/basal/estável.
          </p>
          {metrics.closedLoopMissingOutcomeAmongActions > 0 && (
            <p className="text-[10px] text-amber-300/80 mt-1 leading-snug">
              Além disso, há{" "}
              <strong className="text-amber-200 tabular-nums">
                {metrics.closedLoopMissingOutcomeAmongActions}
              </strong>{" "}
              registros com atuação da unidade, mas sem desfecho clínico preenchido
              (fora do cálculo).
            </p>
          )}
        </div>
        <div className="text-4xl font-bold text-teal-300 tabular-nums shrink-0">
          {metrics.closedLoopEffectivenessRate}%
        </div>
      </div>
    </section>
  );
}
