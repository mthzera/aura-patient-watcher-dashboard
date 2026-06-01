"use client";

import type {
  DashboardMetrics,
  InitiationActionBreakdown,
} from "@/lib/dashboard/types";
import { ArrowRight, ChevronDown } from "lucide-react";

interface Props {
  metrics: DashboardMetrics;
  initiationBreakdown?: InitiationActionBreakdown;
}

export function ClosedLoopPanel({ metrics, initiationBreakdown }: Props) {
  const noReturnRate = pct(metrics.noReturnCases, metrics.auraAlerts);

  const noReturnReasons =
    initiationBreakdown?.available && initiationBreakdown.semRetornoTotal > 0
      ? initiationBreakdown.reasons.filter(
          (r) =>
            r.key === "semContatoTelefonico" || r.key === "unidadeNaoRespondeu"
        )
      : [];

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
        retorno e ajuste de régua.
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
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
      </div>

      {/* No-return reasons highlight */}
      {noReturnReasons.length > 0 && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/40 p-3 mb-3 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <div className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-0.5">
                Além de não ter retorno, quais motivos de não retorno?
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                <strong className="text-amber-300">
                  {initiationBreakdown!.semRetornoTotal}
                </strong>{" "}
                registros sem retorno no recorte — decomposição pela coluna
                &quot;Ação Iniciação&quot;:
              </p>
            </div>
            <div className="text-3xl font-bold text-amber-300 tabular-nums shrink-0">
              {initiationBreakdown!.semRetornoTotal}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {noReturnReasons.map((r) => (
              <span
                key={r.key}
                className="rounded-md border border-amber-800/70 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-300"
              >
                <span className="font-semibold text-amber-200">{r.count}</span>{" "}
                {r.label}{" "}
                <span className="text-slate-500">({r.percent}%)</span>
              </span>
            ))}
          </div>
          <a
            href="#motivos-nao-retorno"
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition"
          >
            Ver análise completa dos motivos
            <ChevronDown className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

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
