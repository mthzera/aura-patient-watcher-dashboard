"use client";

import { DecompensationAnalysis } from "@/lib/dashboard/types";

interface Props {
  decompensation?: DecompensationAnalysis;
}

export function ClinicalIndicatorsPanel({ decompensation }: Props) {
  if (!decompensation) return null;

  const d = decompensation;
  const transientPct = pct(d.transientTotal, d.scopePatientDays);
  const acutePct = pct(d.acuteTotal, d.scopePatientDays);

  // The 3 outcome buckets may not sum to the transient total — the remainder
  // are patient-days with other outcomes (erro de registro, finitude, etc.).
  const classified = d.transient.reduce((s, c) => s + c.patients, 0);
  const otherCount = Math.max(0, d.transientTotal - classified);

  const acuteMonitoring = d.acuteMonitoringPatients ?? 0;
  const acuteNonReversal = Math.max(
    0,
    d.acuteTotal - d.deteriorationReversals - acuteMonitoring
  );

  // Patient-days with no decompensation event (routine/stable monitoring).
  // Fall back if an older API response lacks decompensatedPatientDays.
  const decompUnion = Number.isFinite(d.decompensatedPatientDays)
    ? d.decompensatedPatientDays
    : Math.min(d.scopePatientDays, d.transientTotal + d.acuteTotal);
  const semDescompensacao = Math.max(0, d.scopePatientDays - decompUnion);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
          Indicadores clínicos de apoio
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Contagem por{" "}
          <strong className="text-slate-300">paciente-dia</strong> — o mesmo
          paciente no mesmo dia conta 1 vez (não importa quantas ações). Total
          no recorte:{" "}
          <strong className="text-slate-300">{d.scopePatientDays}</strong>{" "}
          pacientes-dia.
        </p>
      </div>

      {/* Reconciliation summary: where all scope patient-days go */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-xs">
        <span className="text-slate-300">
          <strong className="text-slate-100">{semDescompensacao}</strong> Sem
          descompensação ({pct(semDescompensacao, d.scopePatientDays)}%)
        </span>
        <span className="text-amber-300/90">
          <strong>{d.transientTotal}</strong> Transitória (
          {pct(d.transientTotal, d.scopePatientDays)}%)
        </span>
        <span className="text-rose-300/90">
          <strong>{d.acuteTotal}</strong> Aguda (
          {pct(d.acuteTotal, d.scopePatientDays)}%)
        </span>
        <span className="text-slate-500">= {d.scopePatientDays} no total</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transient decompensation — split in 3 (+ outros) */}
        <div className="rounded-lg border border-slate-600 bg-slate-900/60 p-4">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Descompensação Transitória
            </span>
            <span className="text-xs text-slate-400">
              <strong className="text-slate-200">{d.transientTotal}</strong> de{" "}
              {d.scopePatientDays} pacientes-dia ({transientPct}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            Desfecho dos {d.transientTotal} pacientes-dia transitórios:
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {d.transient.map((c) => (
              <Stat
                key={c.key}
                label={c.label}
                value={c.patients}
                percent={`${c.percent}%`}
                sub={`de ${d.transientTotal} transitórios`}
              />
            ))}
            <Stat
              label="Outros desfechos"
              value={otherCount}
              percent={`${pct(otherCount, d.transientTotal)}%`}
              sub="erro/finitude/monitorando"
              muted
            />
          </div>

          <div className="border-t border-slate-700 mt-3 pt-2">
            <Stat
              label="Pacientes-dia com atuação efetiva da unidade"
              value={`${d.transientEffectivePatients} de ${d.transientTotal}`}
              percent={`${d.transientEffectiveRate}%`}
              sub="o restante não teve atuação efetiva"
            />
          </div>
        </div>

        {/* Acute decompensation */}
        <div className="rounded-lg border border-slate-600 bg-slate-900/60 p-4">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">
              Descompensação Aguda
            </span>
            <span className="text-xs text-slate-400">
              <strong className="text-slate-200">{d.acuteTotal}</strong> de{" "}
              {d.scopePatientDays} pacientes-dia ({acutePct}%)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mb-3">
            Desfecho dos {d.acuteTotal} pacientes-dia agudos:
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat
              label="Reverteu a deterioração"
              value={d.deteriorationReversals}
              percent={`${pct(d.deteriorationReversals, d.acuteTotal)}%`}
              sub="desfecho favorável (melhora/basal/estabilização)"
            />
            <Stat
              label="Não reverteu"
              value={acuteNonReversal}
              percent={`${pct(acuteNonReversal, d.acuteTotal)}%`}
              sub="finitude / reinternação"
              muted
            />
          </div>
          <p className="text-[11px] text-slate-600 mt-3">
            {acuteMonitoring > 0
              ? `${acuteMonitoring} paciente${acuteMonitoring === 1 ? "" : "s"}-dia em monitoramento não entram nesta classificação (ver transitória). `
              : ""}
            Reverteu + não reverteu
            {acuteMonitoring > 0
              ? ` = ${d.deteriorationReversals + acuteNonReversal} de ${d.acuteTotal}`
              : ` = ${d.acuteTotal}`}
            . Dessas reversões, {d.avoidedReadmissions} tiveram atuação
            documentada da unidade.
          </p>
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
              Pacientes-dia de descompensação aguda com atuação documentada e
              desfecho favorável — estimativa conservadora de internações
              evitadas pela resposta oportuna.
            </p>
          </div>
          <div className="ml-4 shrink-0 text-right">
            <div className="text-3xl font-bold text-emerald-300 tabular-nums">
              {d.avoidedReadmissions}
            </div>
            <div className="text-sm font-bold text-emerald-400 tabular-nums">
              {d.avoidedReadmissions} de {d.acuteTotal} agudos (
              {pct(d.avoidedReadmissions, d.acuteTotal)}%)
            </div>
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
  muted,
}: {
  label: string;
  value: string | number;
  percent?: string;
  sub?: string;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span
          className={`text-xl font-bold tabular-nums ${
            muted ? "text-slate-400" : "text-white"
          }`}
        >
          {value}
        </span>
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
  if (!total || !Number.isFinite(part) || !Number.isFinite(total)) return 0;
  const v = Math.round((part / total) * 100);
  return Number.isFinite(v) ? v : 0;
}
