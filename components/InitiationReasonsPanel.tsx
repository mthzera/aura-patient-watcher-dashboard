"use client";

import type { ReactNode } from "react";
import type {
  AuraAlertSplitBreakdown,
  DesfechoBreakdown,
  NoReturnReasonsBreakdown,
  ReturnReasonsBreakdown,
} from "@/lib/dashboard/types";
import { HelpCircle, AlertTriangle } from "lucide-react";

interface Props {
  noReturnReasons?: NoReturnReasonsBreakdown;
  returnReasons?: ReturnReasonsBreakdown;
  auraAlertSplit?: AuraAlertSplitBreakdown;
}

function pctOf(part: number | undefined | null, total: number): number {
  if (!total || part == null || !Number.isFinite(part)) return 0;
  return Math.round((part / total) * 100);
}

export function InitiationReasonsPanel({
  noReturnReasons,
  returnReasons,
  auraAlertSplit,
}: Props) {
  const hasSplit = Boolean(
    auraAlertSplit?.available && auraAlertSplit.totalAuraAlerts > 0
  );
  const hasNoReturn = Boolean(
    noReturnReasons?.available && noReturnReasons.totalNoReturn > 0
  );
  const hasReturn = Boolean(
    returnReasons?.available && returnReasons.totalWithReturn > 0
  );

  if (!hasSplit && !hasNoReturn && !hasReturn) {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
          Classificação dos alertas AURA
        </h2>
        <p className="text-sm text-slate-500">
          Sem alertas AURA ou sem coluna &quot;Ação Iniciação&quot; no recorte.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-5 space-y-5">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
          Classificação dos alertas AURA
        </h2>
        <p className="text-xs text-slate-500 max-w-2xl">
          Cada alerta AURA teve retorno da unidade ou não — os dois grupos somam o
          total de alertas. Abaixo, o funil de cada grupo pela coluna &quot;Ação
          Iniciação&quot; (e desfecho clínico nos retornos).
        </p>
      </div>

      {hasSplit && (
        <AuraSplitOverview split={auraAlertSplit!} hasNoReturn={hasNoReturn} hasReturn={hasReturn} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {hasReturn && (
          <ReturnDistribution breakdown={returnReasons!} />
        )}
        {hasNoReturn && (
          <NoReturnDistribution breakdown={noReturnReasons!} />
        )}
      </div>
    </section>
  );
}

function AuraSplitOverview({
  split,
  hasNoReturn,
  hasReturn,
}: {
  split: AuraAlertSplitBreakdown;
  hasNoReturn: boolean;
  hasReturn: boolean;
}) {
  const withReturnPct = pctOf(split.alertsWithReturn, split.totalAuraAlerts);
  const noReturnPct = pctOf(split.auraAlertsNoReturn, split.totalAuraAlerts);

  return (
    <div className="rounded-lg border border-blue-800/60 bg-blue-950/30 px-4 py-3">
      {!split.sumMatchesTotal && (
        <ValidationBanner message="Com retorno + sem retorno não fecha o total de alertas AURA. Revise os dados." />
      )}
      <div className="font-mono text-sm text-slate-300 space-y-1">
        <div className="flex flex-wrap items-baseline gap-2 mb-2">
          <span className="text-lg font-bold text-blue-300 tabular-nums">
            {split.totalAuraAlerts}
          </span>
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-blue-400">
            Alertas AURA no recorte
          </span>
        </div>
        <TreeLine prefix="├─" indent={0}>
          <span className="text-violet-300 tabular-nums font-semibold">
            {split.alertsWithReturn}
          </span>{" "}
          com retorno <span className="text-slate-500">({withReturnPct}%)</span>
          {hasReturn && (
            <span className="text-slate-600 font-sans text-[10px] ml-1">
              → detalhe à esquerda
            </span>
          )}
        </TreeLine>
        <TreeLine prefix="└─" indent={0}>
          <span className="text-amber-300 tabular-nums font-semibold">
            {split.auraAlertsNoReturn}
          </span>{" "}
          sem retorno <span className="text-slate-500">({noReturnPct}%)</span>
          {hasNoReturn && (
            <span className="text-slate-600 font-sans text-[10px] ml-1">
              → detalhe à direita
            </span>
          )}
        </TreeLine>
      </div>
    </div>
  );
}

function DesfechoGroup({
  label,
  color,
  data,
  total,
  categories,
}: {
  label: string;
  color: string;
  data: DesfechoBreakdown;
  total: number;
  categories: { key: keyof Omit<DesfechoBreakdown, "total">; label: string }[];
}) {
  if (data.total === 0) return null;
  return (
    <>
      <TreeLine prefix="├─" indent={0}>
        <span className={`font-semibold tabular-nums ${color}`}>{data.total}</span>{" "}
        <span className="text-slate-300">{label}</span>{" "}
        <span className="text-slate-500">({pctOf(data.total, total)}%)</span>
      </TreeLine>
      {categories.map(({ key, label: catLabel }, i) => {
        const val = data[key] ?? 0;
        if (val === 0) return null;
        const isLast = i === categories.length - 1 || categories.slice(i + 1).every(c => (data[c.key] ?? 0) === 0);
        return (
          <TreeLine key={key} prefix={isLast ? "│  └─" : "│  ├─"} indent={1}>
            <span className="tabular-nums text-slate-200">{val}</span>{" "}
            <span className="text-slate-400">{catLabel}</span>{" "}
            <span className="text-slate-600">({pctOf(val, data.total)}%)</span>
          </TreeLine>
        );
      })}
    </>
  );
}

const EMPTY_DESFECHO: DesfechoBreakdown = {
  total: 0, melhoraClinica: 0, condicaoBasal: 0, finitude: 0,
  reintercacao: 0, erroRegistro: 0, semRetorno: 0, semInformacao: 0,
};

function ReturnDistribution({
  breakdown: rr,
}: {
  breakdown: ReturnReasonsBreakdown;
}) {
  const AGUDA_CATS: { key: keyof Omit<DesfechoBreakdown, "total">; label: string }[] = [
    { key: "melhoraClinica", label: "Melhora clínica" },
    { key: "finitude",       label: "Finitude" },
    { key: "reintercacao",   label: "Reinternação" },
    { key: "erroRegistro",   label: "Erro de registro" },
    { key: "semInformacao",  label: "Sem informação" },
  ];

  const ESPERADA_CATS: { key: keyof Omit<DesfechoBreakdown, "total">; label: string }[] = [
    { key: "melhoraClinica", label: "Melhora clínica / Estabilização" },
    { key: "condicaoBasal",  label: "Condição basal" },
    { key: "semRetorno",     label: "Sem retorno" },
    { key: "erroRegistro",   label: "Erro de registro" },
    { key: "finitude",       label: "Finitude" },
    { key: "semInformacao",  label: "Sem informação" },
  ];

  const t = rr.totalWithReturn;
  const aguda = rr.aguda ?? EMPTY_DESFECHO;
  const esperada = rr.esperada ?? EMPTY_DESFECHO;
  const outros = rr.outros ?? 0;
  const sumCheck = aguda.total + esperada.total + outros;

  return (
    <div className="rounded-lg border-2 border-violet-700/80 bg-violet-950/40 p-4 sm:p-5 h-full">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-violet-300 mb-1">
        Alertas com retorno
      </h3>
      <p className="text-[10px] text-slate-500 mb-3">
        Intervenção Unidade = Sim ou Reavaliação · {t} alertas.
      </p>

      <div className="font-mono text-sm text-slate-300 space-y-1 leading-relaxed">
        <div className="flex flex-wrap items-baseline gap-2 mb-1">
          <span className="text-lg font-bold text-violet-300 tabular-nums">{t}</span>
          <span className="font-sans text-xs font-semibold uppercase tracking-wider text-violet-400">
            Total com retorno
          </span>
        </div>

        <DesfechoGroup
          label="Descompensação Aguda"
          color="text-rose-300"
          data={aguda}
          total={t}
          categories={AGUDA_CATS}
        />

        <DesfechoGroup
          label="Transitória Esperada"
          color="text-amber-300"
          data={esperada}
          total={t}
          categories={ESPERADA_CATS}
        />

        {outros > 0 && (
          <TreeLine prefix="└─" indent={0}>
            <span className="tabular-nums text-slate-400 font-semibold">{outros}</span>{" "}
            <span className="text-slate-400">Outros / sem alteração clínica</span>{" "}
            <span className="text-slate-500">({pctOf(outros, t)}%)</span>
          </TreeLine>
        )}
      </div>

      <p className="mt-3 text-[10px] text-slate-500 border-t border-violet-800/50 pt-2">
        Desfecho Clínico por tipo de Alteração Clínica ·{" "}
        {sumCheck === t
          ? `${aguda.total} + ${esperada.total} + ${outros} = ${t} ✓`
          : "verifique os dados"}
      </p>
    </div>
  );
}

function NoReturnDistribution({
  breakdown: nr,
}: {
  breakdown: NoReturnReasonsBreakdown;
}) {
  const semInfoCount = nr.semInformacao ?? 0;
  const unidadePct = pctOf(nr.unidadeNaoRespondeu, nr.totalNoReturn);
  const contatoPct = pctOf(nr.semContatoTelefonico, nr.totalNoReturn);
  const semInfoPct = pctOf(semInfoCount, nr.totalNoReturn);

  return (
    <div
      id="motivos-nao-retorno"
      className="rounded-lg border-2 border-amber-700/80 bg-amber-950/50 p-4 sm:p-5 h-full scroll-mt-4"
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-1">
        Alertas sem retorno
      </h3>
      <p className="text-[10px] text-slate-500 mb-3">
        Percentuais sobre o total sem retorno ({nr.totalNoReturn} alertas).
      </p>

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
          <span className="text-red-300 tabular-nums font-semibold">{nr.unidadeNaoRespondeu}</span>{" "}
          Sem retorno da unidade{" "}
          <span className="text-slate-500">({unidadePct}%)</span>
        </TreeLine>

        <TreeLine prefix="├─" indent={0}>
          <span className="text-amber-300 tabular-nums font-semibold">{nr.semContatoTelefonico}</span>{" "}
          Sem retorno contato telefônico{" "}
          <span className="text-slate-500">({contatoPct}%)</span>
        </TreeLine>

        <TreeLine prefix="└─" indent={0}>
          <span className="text-slate-400 tabular-nums font-semibold">{semInfoCount}</span>{" "}
          <span className="text-slate-300">Sem informação</span>{" "}
          <span className="text-slate-500">({semInfoPct}%)</span>
        </TreeLine>
      </div>

      <p className="mt-3 text-[10px] text-slate-500 border-t border-amber-800/50 pt-2">
        <HelpCircle className="inline h-3 w-3 mr-0.5 -mt-0.5" />
        <strong className="text-slate-400">Sem informação:</strong> campo &quot;Ação
        Iniciação&quot; em branco, erro de registro ou outro valor não reconhecido.
      </p>
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
      <span className="text-slate-600 shrink-0 select-none">{prefix}</span>
      <span className="font-sans">{children}</span>
    </div>
  );
}

function ValidationBanner({ message }: { message: string }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-800/80 bg-amber-950/40 px-2.5 py-2">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400 mt-0.5" />
      <p className="text-[10px] text-amber-200 leading-relaxed">{message}</p>
    </div>
  );
}
