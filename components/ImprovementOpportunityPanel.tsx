"use client";

import { useState } from "react";
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
  Sparkles,
  Loader2,
  Lightbulb,
} from "lucide-react";

interface Props {
  metrics: DashboardMetrics;
  responsiveness?: ResponsivenessAnalysis;
}

export function ImprovementOpportunityPanel({ metrics, responsiveness }: Props) {
  const noReturnPct =
    metrics.totalRecords > 0
      ? Math.round((metrics.noReturnCases / metrics.totalRecords) * 100)
      : 0;

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
              {metrics.noReturnCases} casos
            </strong>{" "}
            ({noReturnPct}% do total) estão registrados como &quot;sem
            retorno&quot;. A análise abaixo mostra <em>quando</em> o ciclo
            assistencial mais falha — por turno, dia da semana e horário — para
            direcionar o plano de ação.
          </p>
        </div>
      </div>

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
      {hasTemporal && r!.actionPlan.length > 0 && (
        <div className="rounded-lg border border-teal-900/50 bg-teal-950/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-4 w-4 text-teal-300" />
            <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-300">
              Plano de ação sugerido
            </h3>
          </div>
          <ul className="space-y-2.5">
            {r!.actionPlan.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-slate-300">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-900/60 text-xs font-bold text-teal-300">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* AI suggestion */}
      {hasTemporal && <AiSuggestion responsiveness={r!} metrics={metrics} />}

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

// ---------------------------------------------------------------------------
// AI suggestion (Llama)
// ---------------------------------------------------------------------------

function AiSuggestion({
  responsiveness,
  metrics,
}: {
  responsiveness: ResponsivenessAnalysis;
  metrics: DashboardMetrics;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );
  const [text, setText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  async function generate() {
    setState("loading");
    setText("");
    setErrorMsg("");
    try {
      const res = await fetch("/api/ai-suggestion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responsiveness, metrics }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error ?? "Falha ao gerar a sugestão.");
        setState("error");
        return;
      }
      setText(json.suggestion ?? "");
      setState("done");
    } catch {
      setErrorMsg("Erro de rede ao contatar o serviço de IA.");
      setState("error");
    }
  }

  return (
    <div className="rounded-lg border border-violet-900/50 bg-violet-950/20 p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-300" />
          <h3 className="text-xs font-semibold uppercase tracking-widest text-violet-300">
            Sugestão com IA (Llama)
          </h3>
        </div>
        <button
          onClick={generate}
          disabled={state === "loading"}
          className="flex items-center gap-1.5 rounded-md border border-violet-700 bg-violet-900/40 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-800/60 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {state === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {state === "loading"
            ? "Gerando…"
            : state === "done"
            ? "Gerar novamente"
            : "Gerar análise"}
        </button>
      </div>

      {state === "idle" && (
        <p className="text-sm text-slate-400 leading-relaxed">
          Gere uma análise interpretativa dos padrões temporais e recomendações
          de plano de ação a partir de um modelo Llama.
        </p>
      )}

      {state === "loading" && (
        <p className="text-sm text-slate-400">
          O modelo está analisando os dados de responsividade…
        </p>
      )}

      {state === "error" && (
        <p className="text-sm text-red-300">{errorMsg}</p>
      )}

      {state === "done" && text && (
        <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}
