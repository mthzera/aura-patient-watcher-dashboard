"use client";

import type {
  DashboardMetrics,
  ReinternacaoAlertAnalysis,
} from "@/lib/dashboard/types";
import { ArrowRight } from "lucide-react";

interface Props {
  metrics: DashboardMetrics;
  reinternacaoAlertAnalysis?: ReinternacaoAlertAnalysis;
}

export function ClosedLoopPanel({ metrics, reinternacaoAlertAnalysis }: Props) {
  const noReturnRate = pct(metrics.noReturnCases, metrics.auraAlerts);
  const priorAlertRate = reinternacaoAlertAnalysis?.available
    ? pct(
        reinternacaoAlertAnalysis.withPriorAlert,
        reinternacaoAlertAnalysis.totalReinternacoes
      )
    : null;

  const steps = [
    {
      label: "Alerta AURA",
      value: metrics.auraAlerts,
      description: "Alertas registrados",
      color: "border-blue-600 text-blue-300",
      bg: "bg-blue-950/50",
    },
    {
      label: "Triagem",
      value: metrics.triagens,
      description: "Alertas com retorno",
      color: "border-violet-600 text-violet-300",
      bg: "bg-violet-950/50",
    },
    {
      label: "Atuação da Unidade",
      value: metrics.unitActions,
      description: "Respostas documentadas",
      color: "border-amber-600 text-amber-300",
      bg: "bg-amber-950/50",
    },
    {
      label: "Desfecho Registrado",
      value: metrics.favorableOutcomes,
      description: "Desfechos favoráveis",
      color: "border-teal-500 text-teal-300",
      bg: "bg-teal-950/50",
    },
  ];

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
        Efetividade dos Alertas AURA
      </h2>
      <p className="text-xs text-slate-500 mb-4 max-w-2xl">
        Fluxo rastreável do alerta até o desfecho, com indicadores resumidos de
        retorno, ajuste de régua e alta com alerta prévio.
      </p>

      {/* Flow diagram */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={`rounded-lg border ${step.color} ${step.bg} px-4 py-3 min-w-[130px] text-center`}
            >
              <div className="text-xl font-bold tabular-nums">
                {step.value}
              </div>
              <div className="text-xs font-semibold mt-1">{step.label}</div>
              <div className="text-xs opacity-60 mt-0.5">{step.description}</div>
            </div>
            {idx < steps.length - 1 && (
              <ArrowRight className="h-5 w-5 shrink-0 text-slate-600" />
            )}
          </div>
        ))}
      </div>

      {/* Numeric conclusion */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <ConclusionStat
          label="Sem retorno"
          value={metrics.noReturnCases}
          percent={noReturnRate}
          detail="dos alertas AURA"
          tone="warning"
        />
        <ConclusionStat
          label="Retorno normal/basal/estável"
          value={metrics.normalClinicalReturnPatients}
          percent={metrics.normalClinicalReturnAlertRate}
          detail={`${metrics.normalClinicalReturnAlerts} alertas AURA`}
          tone="info"
        />
        <ConclusionStat
          label="Alta com alerta prévio"
          value={reinternacaoAlertAnalysis?.withPriorAlert ?? 0}
          percent={priorAlertRate}
          detail={
            reinternacaoAlertAnalysis?.available
              ? `de ${reinternacaoAlertAnalysis.totalReinternacoes} altas`
              : "arquivo de reinternações pendente"
          }
          tone="default"
        />
      </div>

      {/* Effectiveness highlight */}
      <div className="rounded-lg border border-teal-800 bg-teal-950/40 p-3 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-widest text-teal-400 mb-0.5">
            Efetividade do ciclo fechado
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Dentre os casos com atuação documentada e desfecho registrado,{" "}
            <strong className="text-teal-300">
              {metrics.closedLoopEffectivenessRate}%
            </strong>{" "}
            evoluíram com desfecho favorável (melhora clínica, condição basal ou
            estabilização).
          </p>
        </div>
        <div className="text-4xl font-bold text-teal-300 tabular-nums shrink-0">
          {metrics.closedLoopEffectivenessRate}%
        </div>
      </div>
    </section>
  );
}

function ConclusionStat({
  label,
  value,
  percent,
  detail,
  tone,
}: {
  label: string;
  value: number;
  percent: number | null;
  detail: string;
  tone: "default" | "warning" | "info";
}) {
  const toneClass =
    tone === "warning"
      ? "border-amber-800/60 bg-amber-950/25 text-amber-300"
      : tone === "info"
      ? "border-sky-800/60 bg-sky-950/25 text-sky-300"
      : "border-violet-800/60 bg-violet-950/25 text-violet-300";

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-2xl font-bold tabular-nums text-white">
          {value}
        </span>
        {percent !== null && (
          <span className="pb-1 text-lg font-bold tabular-nums">{percent}%</span>
        )}
      </div>
      <div className="mt-1 text-xs text-slate-500">{detail}</div>
    </div>
  );
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
