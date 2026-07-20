"use client";

import {
  DashboardMetrics,
  ResponsivenessAnalysis,
  TemporalBucket,
} from "@/lib/dashboard/types";
import {
  AlertTriangle,
  Clock,
  CalendarDays,
  Sun,
  TrendingDown,
  TrendingUp,
  Lightbulb,
} from "lucide-react";

interface Props {
  metrics: DashboardMetrics;
  responsiveness?: ResponsivenessAnalysis;
}

export function ImprovementOpportunityPanel({ metrics, responsiveness }: Props) {
  const noReturnAlertsPct = metrics.auraAlertsNoReturnRate;

  const r = responsiveness;
  const hasTemporal = r?.available ?? false;

  return (
    <section className="rounded-xl border border-amber-900/50 bg-amber-950/20 p-6 space-y-6">
      {/* Header + intro */}
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-400" />
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-300 mb-2">
            Oportunidade de melhoria
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
            <strong className="text-amber-300">
              {metrics.auraAlertsNoReturn} alertas AURA
            </strong>{" "}
            ({noReturnAlertsPct}% dos {metrics.auraAlerts} alertas) estão sem
            retorno. A análise
            abaixo mostra <em>quando</em> o ciclo
            assistencial mais falha — por turno, dia da semana e horário — para
            direcionar o plano de ação.
          </p>
          {metrics.normalClinicalReturnAlerts > 0 && (
            <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-3xl">
              Entre os alertas com retorno,{" "}
              <strong className="text-sky-300">
                {metrics.normalClinicalReturnAlerts} alerta
                {metrics.normalClinicalReturnAlerts !== 1 ? "s" : ""}
              </strong>{" "}
              ({metrics.normalClinicalReturnAmongReturnRate}%) tiveram desfecho
              normal, basal ou estável (
              {metrics.normalClinicalReturnAlertRate}% de todos os alertas AURA).
            </p>
          )}
        </div>
      </div>

      {metrics.normalClinicalReturnAlerts > 0 && (
        <div className="rounded-lg border border-sky-900/50 bg-sky-950/20 p-5">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-4 w-4 text-sky-300 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-sky-300 mb-1">
                Ajuste de régua do alerta
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Como {metrics.normalClinicalReturnAlerts} alerta
                {metrics.normalClinicalReturnAlerts !== 1 ? "s" : ""} com retorno
                indicaram quadro normal/basal/estável, vale revisar os critérios de
                disparo e considerar subir a régua do AURA para reduzir alertas de
                baixa prioridade sem perder sensibilidade para casos agudos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Highlight cards */}
      {hasTemporal && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <HighlightCard
            icon={<Sun className="h-4 w-4" />}
            tone="danger"
            title="Turno mais crítico"
            bucket={r!.worstShift}
            metric="noReturn"
          />
          <HighlightCard
            icon={<CalendarDays className="h-4 w-4" />}
            tone="danger"
            title="Dia mais frágil"
            bucket={r!.worstDay}
            metric="noReturn"
          />
          <HighlightCard
            icon={<TrendingUp className="h-4 w-4" />}
            tone="success"
            title="Melhor janela de resposta"
            bucket={r!.bestResponseWindow}
            metric="effective"
          />
        </div>
      )}

      {/* Temporal breakdown bars */}
      {hasTemporal && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <BreakdownColumn
            icon={<Sun className="h-3.5 w-3.5" />}
            title="Por turno"
            buckets={r!.byShift}
            baseline={r!.overallNoReturnRate}
          />
          <BreakdownColumn
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            title="Por dia da semana"
            buckets={r!.byDayOfWeek}
            baseline={r!.overallNoReturnRate}
          />
          <BreakdownColumn
            icon={<Clock className="h-3.5 w-3.5" />}
            title="Por faixa horária"
            buckets={r!.byHourBand}
            baseline={r!.overallNoReturnRate}
          />
        </div>
      )}

      {/* Action plan */}
      {(() => {
        const fixedItems = [
          "Anery: aumentar o registro de SSVV para viabilizar a geração dos alertas AURA nos pacientes monitorados.",
          "Avaliar contatos com dificuldades nas ligações: identificar pacientes e familiares com baixa taxa de resposta e mapear barreiras (telefone errado, disponibilidade, etc.).",
          "Avaliar a régua / pertinência dos alertas: revisar os critérios de disparo para equilibrar sensibilidade e especificidade, reduzindo alertas de baixa prioridade sem perder casos críticos.",
        ];

        const dynamicItems: string[] = [];
        if (metrics.normalClinicalReturnAlerts > 0) {
          dynamicItems.push(
            `Subir a régua dos critérios de alerta: ${metrics.normalClinicalReturnAlerts} alerta${metrics.normalClinicalReturnAlerts !== 1 ? "s" : ""} com retorno indicaram quadro normal/basal/estável (${metrics.normalClinicalReturnAmongReturnRate}% dos alertas com retorno). Revise limiares e combinações de sinais para reduzir alertas de baixa prioridade.`
          );
        }
        if (hasTemporal && r!.actionPlan.length > 0) {
          dynamicItems.push(...r!.actionPlan);
        }

        const allItems = [...dynamicItems, ...fixedItems];

        return (
          <div className="rounded-lg border border-teal-900/50 bg-teal-950/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-teal-300" />
              <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-300">
                Oportunidades de melhoria · Plano de ação sugerido
              </h3>
            </div>
            <ul className="space-y-2.5">
              {allItems.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-slate-300">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-900/60 text-xs font-bold text-teal-300">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Legend / no data */}
      {!hasTemporal && (
        <p className="text-sm text-slate-400">
          A análise temporal precisa das colunas de turno e/ou horário no CSV
          (ex.: <code className="text-amber-300">Turno Escala</code>,{" "}
          <code className="text-amber-300">Hora</code>). Verifique se o arquivo
          importado contém esses campos.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Highlight card
// ---------------------------------------------------------------------------

function HighlightCard({
  icon,
  tone,
  title,
  bucket,
  metric,
}: {
  icon: React.ReactNode;
  tone: "danger" | "success";
  title: string;
  bucket: TemporalBucket | null;
  metric: "noReturn" | "effective";
}) {
  const color = tone === "danger" ? "text-amber-300" : "text-teal-300";
  const border =
    tone === "danger" ? "border-amber-900/40" : "border-teal-900/40";

  if (!bucket) {
    return (
      <div className={`rounded-lg border ${border} bg-slate-900/40 p-4`}>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
          {icon}
          {title}
        </div>
        <div className="text-sm text-slate-500">Sem dados suficientes</div>
      </div>
    );
  }

  const value =
    metric === "noReturn" ? bucket.noReturnRate : bucket.effectiveRate;
  const sub =
    metric === "noReturn"
      ? `${bucket.noReturn} de ${bucket.total} sem retorno`
      : `${bucket.effective} de ${bucket.total} respostas efetivas`;

  return (
    <div className={`rounded-lg border ${border} bg-slate-900/40 p-4`}>
      <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
        {icon}
        {title}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-lg font-bold text-white">{bucket.label}</span>
        <span className={`text-sm font-semibold tabular-nums ${color}`}>
          {value}%
        </span>
      </div>
      <div className="text-xs text-slate-500 mt-0.5">{sub}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breakdown column (bars)
// ---------------------------------------------------------------------------

function BreakdownColumn({
  icon,
  title,
  buckets,
  baseline,
}: {
  icon: React.ReactNode;
  title: string;
  buckets: TemporalBucket[];
  baseline: number;
}) {
  if (buckets.length === 0) return null;
  const max = Math.max(...buckets.map((b) => b.noReturnRate), 1);

  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
        {icon}
        {title}
      </div>
      <div className="space-y-2.5">
        {buckets.map((b) => {
          const aboveBaseline = b.noReturnRate > baseline;
          return (
            <div key={b.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-300">{b.label}</span>
                <span
                  className={`tabular-nums font-medium ${
                    aboveBaseline ? "text-amber-300" : "text-slate-400"
                  }`}
                >
                  {b.noReturnRate}%{" "}
                  <span className="text-slate-600">({b.total})</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    aboveBaseline ? "bg-amber-500/70" : "bg-slate-600"
                  }`}
                  style={{ width: `${(b.noReturnRate / max) * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-500">
        <TrendingDown className="h-3 w-3" />
        Barras = % de casos sem retorno · média geral {baseline}%
      </div>
    </div>
  );
}

