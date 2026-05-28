"use client";

import { DashboardMetrics } from "@/lib/dashboard/types";
import { ArrowRight } from "lucide-react";

interface Props {
  metrics: DashboardMetrics;
}

export function ClosedLoopPanel({ metrics }: Props) {
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
      value: metrics.totalRecords,
      description: "Casos avaliados",
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
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
        O que mais prova a efetividade
      </h2>
      <p className="text-xs text-slate-500 mb-6 max-w-2xl">
        O ponto mais forte da planilha é o ciclo rastreável: quando a unidade
        responde ao alerta, a maioria dos casos evolui para melhora clínica,
        condição basal ou estabilização.
      </p>

      {/* Flow diagram */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-center gap-2">
            <div
              className={`rounded-lg border ${step.color} ${step.bg} px-5 py-4 min-w-[140px] text-center`}
            >
              <div className="text-2xl font-bold tabular-nums">
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

      {/* Effectiveness highlight */}
      <div className="rounded-lg border border-teal-800 bg-teal-950/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
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
        <div className="text-5xl font-bold text-teal-300 tabular-nums shrink-0">
          {metrics.closedLoopEffectivenessRate}%
        </div>
      </div>
    </section>
  );
}
