"use client";

import type { ReactNode } from "react";
import type {
  NoReturnReasonsBreakdown,
  RecordClassificationBreakdown,
} from "@/lib/dashboard/types";
import {
  Building2,
  Activity,
  HeartPulse,
  HelpCircle,
  AlertTriangle,
} from "lucide-react";

interface Props {
  noReturnReasons?: NoReturnReasonsBreakdown;
  recordClassification?: RecordClassificationBreakdown;
}

function pctOf(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function InitiationReasonsPanel({
  noReturnReasons,
  recordClassification,
}: Props) {
  const hasNoReturn =
    noReturnReasons?.available && noReturnReasons.totalNoReturn > 0;
  const hasClassification =
    recordClassification?.available && recordClassification.total > 0;

  if (!hasNoReturn && !hasClassification) {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
          Classificação dos registros
        </h2>
        <p className="text-sm text-slate-500">
          Sem dados de &quot;Ação Iniciação&quot; para o recorte atual.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 space-y-6">
      {hasNoReturn && (
        <NoReturnDistribution breakdown={noReturnReasons!} />
      )}
      {hasClassification && (
        <RecordClassificationSection breakdown={recordClassification!} />
      )}
    </section>
  );
}

function NoReturnDistribution({ breakdown: nr }: { breakdown: NoReturnReasonsBreakdown }) {
  const hierarchyValid =
    nr.classified + nr.notClassified === nr.totalNoReturn &&
    nr.unidadeNaoRespondeu + nr.semContatoTelefonico + nr.naoInformado ===
      nr.totalNoReturn;

  const unidadePct = pctOf(nr.unidadeNaoRespondeu, nr.totalNoReturn);
  const contatoPct = pctOf(nr.semContatoTelefonico, nr.totalNoReturn);
  const semClassPct = pctOf(nr.naoInformado, nr.totalNoReturn);

  return (
    <div id="motivos-nao-retorno" className="scroll-mt-4">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
        Distribuição dos casos sem retorno
      </h2>
      <p className="text-xs text-slate-500 mb-4 max-w-2xl">
        Por que os registros sem resposta da unidade não fecharam o ciclo — pela
        coluna &quot;Ação Iniciação&quot;. Percentuais sobre o total sem retorno.
      </p>

      {!hierarchyValid && (
        <ValidationBanner message="A soma dos submotivos não confere com o total sem retorno. Revise a classificação na planilha." />
      )}

      <div className="rounded-lg border-2 border-amber-700/80 bg-amber-950/50 p-4 sm:p-5">
        <div className="font-mono text-sm text-slate-300 space-y-1 leading-relaxed">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-bold text-amber-300 tabular-nums">
              {nr.totalNoReturn}
            </span>
            <span className="font-sans text-xs font-semibold uppercase tracking-wider text-amber-400">
              Total sem retorno
            </span>
          </div>

          <TreeLine prefix="├─" indent={0}>
            <span className="text-amber-200 font-semibold tabular-nums">
              {nr.classified}
            </span>{" "}
            <span className="text-slate-400">classificados</span>
          </TreeLine>

          <TreeLine prefix="│  ├─" indent={1}>
            <span className="text-red-300 tabular-nums">{nr.unidadeNaoRespondeu}</span>{" "}
            Unidade não respondeu{" "}
            <span className="text-slate-500">({unidadePct}%)</span>
          </TreeLine>

          <TreeLine prefix="│  └─" indent={1}>
            <span className="text-amber-300 tabular-nums">{nr.semContatoTelefonico}</span>{" "}
            Sem contato telefônico{" "}
            <span className="text-slate-500">({contatoPct}%)</span>
          </TreeLine>

          <TreeLine prefix="└─" indent={0}>
            <span className="text-slate-300 tabular-nums">{nr.notClassified}</span>{" "}
            <span className="text-slate-200">Sem classificação</span>{" "}
            <span className="text-slate-500">({semClassPct}%)</span>
          </TreeLine>
        </div>

        <p className="mt-4 text-xs text-slate-500 border-t border-amber-800/50 pt-3">
          <HelpCircle className="inline h-3.5 w-3.5 mr-1 -mt-0.5 text-slate-500" />
          <strong className="text-slate-400">Sem classificação:</strong> registros
          sem motivo de não retorno informado.
        </p>
      </div>
    </div>
  );
}

function RecordClassificationSection({
  breakdown: rc,
}: {
  breakdown: RecordClassificationBreakdown;
}) {
  const sum =
    rc.retornoComIntervencao + rc.retornoBasal + rc.semRetorno;
  const displaySumMatches = rc.sumMatchesTotal && sum === rc.total;

  const rows = [
    {
      key: "intervencao",
      label: "Retorno com intervenção",
      count: rc.retornoComIntervencao,
      percent: rc.retornoComIntervencaoPercent,
      dot: "bg-teal-500",
      text: "text-teal-300",
      icon: <Activity className="h-4 w-4" />,
    },
    {
      key: "basal",
      label: "Retorno basal",
      count: rc.retornoBasal,
      percent: rc.retornoBasalPercent,
      dot: "bg-sky-500",
      text: "text-sky-300",
      icon: <HeartPulse className="h-4 w-4" />,
    },
    {
      key: "semRetorno",
      label: "Sem retorno",
      count: rc.semRetorno,
      percent: rc.semRetornoPercent,
      dot: "bg-amber-500",
      text: "text-amber-300",
      icon: <Building2 className="h-4 w-4" />,
    },
  ];

  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
        Classificação dos registros
      </h2>
      <p className="text-xs text-slate-500 mb-4 max-w-2xl">
        Como o recorte filtrado se divide entre retorno (com intervenção ou basal)
        e sem retorno. Os três grupos devem somar o total de registros analisados.
      </p>

      {!displaySumMatches && (
        <ValidationBanner
          message={
            rc.unclassifiedReturns > 0
              ? `${rc.unclassifiedReturns} registro(s) com retorno não se encaixam em intervenção nem basal (Ação Iniciação). Soma parcial: ${sum} de ${rc.total}.`
              : `Soma das categorias (${sum}) difere do total filtrado (${rc.total}).`
          }
        />
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.key}
            className="rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${row.dot}`} />
              <span className={`${row.text} flex items-center gap-1.5 text-sm font-medium`}>
                {row.icon}
                {row.label}
              </span>
            </div>
            <div className="pl-5">
              <div className="text-xl font-bold tabular-nums text-white">
                {row.count}{" "}
                <span className="text-sm font-normal text-slate-500">
                  {row.count === 1 ? "registro" : "registros"}
                </span>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {row.percent}% dos registros analisados
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Total
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-200">
          {rc.total}{" "}
          <span className="font-normal text-slate-500">
            {rc.total === 1 ? "registro" : "registros"}
          </span>
        </span>
      </div>
    </div>
  );
}

function TreeLine({
  prefix,
  indent,
  children,
}: {
  prefix: string;
  indent: number;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-1" style={{ paddingLeft: indent * 12 }}>
      <span className="text-amber-700/80 shrink-0 select-none">{prefix}</span>
      <span className="font-sans">{children}</span>
    </div>
  );
}

function ValidationBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-800/80 bg-amber-950/40 px-3 py-2">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
      <p className="text-xs text-amber-200 leading-relaxed">{message}</p>
    </div>
  );
}
