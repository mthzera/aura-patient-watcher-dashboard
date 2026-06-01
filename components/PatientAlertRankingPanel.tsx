"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type {
  PatientAlertRanking,
  RankedPatientAlerts,
  TransientAlertBreakdown,
} from "@/lib/dashboard/types";

interface Props {
  ranking?: PatientAlertRanking;
}

const PAGE_SIZE = 5;

const TRANSIENT_SEGMENTS: {
  key: keyof TransientAlertBreakdown;
  label: string;
  bar: string;
}[] = [
  { key: "basal", label: "Basal", bar: "bg-sky-500" },
  { key: "comIntervencao", label: "Interv.", bar: "bg-emerald-500" },
  { key: "estavel", label: "Estável", bar: "bg-violet-500" },
  { key: "outros", label: "Outros", bar: "bg-slate-500" },
];

export function PatientAlertRankingPanel({ ranking }: Props) {
  if (!ranking) return null;

  const { transient, acute } = ranking;
  const hasAny = transient.length > 0 || acute.length > 0;

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
      <div className="mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">
          Ranking de alertas
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">
          Leaderboard por volume de alertas no recorte · barras relativas ao 1º
          lugar
        </p>
      </div>

      {!hasAny ? (
        <p className="text-sm text-slate-500 py-6 text-center">
          Nenhum alerta transitório ou agudo no período.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Leaderboard
            title="Transitória"
            subtitle="basal · intervenção · estável · outros"
            tone="amber"
            rows={transient}
            showBreakdown
          />
          <Leaderboard
            title="Aguda"
            subtitle="total de alertas"
            tone="rose"
            rows={acute}
          />
        </div>
      )}
    </section>
  );
}

function Leaderboard({
  title,
  subtitle,
  tone,
  rows,
  showBreakdown,
}: {
  title: string;
  subtitle: string;
  tone: "amber" | "rose";
  rows: RankedPatientAlerts[];
  showBreakdown?: boolean;
}) {
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const slice = rows.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const leaderScore = rows[0]?.total ?? 1;

  const accent = tone === "amber" ? "text-amber-400" : "text-rose-400";
  const barFill =
    tone === "amber"
      ? "bg-gradient-to-r from-amber-600 to-amber-400"
      : "bg-gradient-to-r from-rose-600 to-rose-400";
  const border =
    tone === "amber" ? "border-amber-900/40" : "border-rose-900/40";

  return (
    <div className={`rounded-lg border ${border} bg-slate-950/50 flex flex-col`}>
      <div className="px-3 pt-3 pb-2 border-b border-slate-800/80 shrink-0">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className={`text-xs font-bold uppercase tracking-wider ${accent}`}>
            {title}
          </h3>
          <span className="text-[10px] text-slate-500 tabular-nums">
            {rows.length} jogadores
          </span>
        </div>
        <p className="text-[10px] text-slate-600 mt-0.5">{subtitle}</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500 p-4 text-center">Vazio</p>
      ) : (
        <>
          <ul
            className="overflow-y-auto overscroll-contain px-2 py-2 space-y-1.5 min-h-0 max-h-[min(280px,50vh)]"
            role="list"
          >
            {slice.map((row, i) => {
              const rank = safePage * PAGE_SIZE + i + 1;
              return (
                <LeaderboardRow
                  key={`${row.patientName}-${rank}`}
                  rank={rank}
                  row={row}
                  leaderScore={leaderScore}
                  barFill={barFill}
                  showBreakdown={showBreakdown}
                />
              );
            })}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-slate-800/80 shrink-0">
              <button
                type="button"
                disabled={safePage === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="flex items-center gap-0.5 rounded px-2 py-1 text-[10px] font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>
              <span className="text-[10px] text-slate-500 tabular-nums">
                {safePage + 1} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                className="flex items-center gap-0.5 rounded px-2 py-1 text-[10px] font-medium text-slate-400 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none"
              >
                Próxima
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function LeaderboardRow({
  rank,
  row,
  leaderScore,
  barFill,
  showBreakdown,
}: {
  rank: number;
  row: RankedPatientAlerts;
  leaderScore: number;
  barFill: string;
  showBreakdown?: boolean;
}) {
  const pct = leaderScore > 0 ? Math.round((row.total / leaderScore) * 100) : 0;
  const barWidth = leaderScore > 0 ? (row.total / leaderScore) * 100 : 0;

  return (
    <li className="rounded-md bg-slate-900/70 px-2 py-1.5 hover:bg-slate-900 transition-colors">
      <div className="flex items-center gap-2">
        <RankBadge rank={rank} />
        <News2Badge score={row.news2Score} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-100 truncate leading-tight">
              {row.patientName}
            </p>
            <div className="flex items-baseline gap-1.5 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 tabular-nums">
                {pct}%
              </span>
              <span className="text-sm font-black tabular-nums text-white leading-none">
                {row.total}
              </span>
              <span className="text-[9px] text-slate-600 uppercase">alertas</span>
            </div>
          </div>
          {row.unit && (
            <p className="text-[9px] text-slate-600 truncate -mt-0.5">{row.unit}</p>
          )}
          <div className="mt-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${barFill} transition-all duration-500`}
              style={{ width: `${barWidth}%` }}
            />
          </div>
          {showBreakdown && row.transientBreakdown && row.total > 0 && (
            <SegmentedBreakdown
              breakdown={row.transientBreakdown}
              total={row.total}
            />
          )}
        </div>
      </div>
    </li>
  );
}

function News2Badge({ score }: { score: number | null }) {
  const style = news2Style(score);

  return (
    <div
      className={`flex flex-col items-center justify-center w-11 shrink-0 rounded-lg border px-1 py-1 ${style.box}`}
      title="NEWS2 (Último) — maior valor no recorte"
    >
      <span className="text-[8px] font-bold uppercase tracking-wider text-slate-500 leading-none">
        NEWS
      </span>
      <span
        className={`text-xl font-black tabular-nums leading-none mt-0.5 ${style.text}`}
      >
        {score !== null ? score : "—"}
      </span>
    </div>
  );
}

function news2Style(score: number | null): { box: string; text: string } {
  if (score === null) {
    return {
      box: "border-slate-700 bg-slate-900/80",
      text: "text-slate-600",
    };
  }
  if (score >= 7) {
    return {
      box: "border-red-500/60 bg-red-950/80 shadow-[0_0_12px_-2px_rgba(248,113,113,0.4)]",
      text: "text-red-300",
    };
  }
  if (score >= 5) {
    return {
      box: "border-amber-500/50 bg-amber-950/80",
      text: "text-amber-300",
    };
  }
  return {
    box: "border-emerald-600/40 bg-emerald-950/60",
    text: "text-emerald-300",
  };
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-300 to-amber-600 text-[10px] font-black text-amber-950 shadow-sm shadow-amber-900/50">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-slate-300 to-slate-500 text-[10px] font-black text-slate-900">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-amber-700 to-amber-900 text-[10px] font-black text-amber-100">
        3
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-800 text-[10px] font-bold tabular-nums text-slate-500">
      {rank}
    </span>
  );
}

function SegmentedBreakdown({
  breakdown,
  total,
}: {
  breakdown: TransientAlertBreakdown;
  total: number;
}) {
  const segments = TRANSIENT_SEGMENTS.map((s) => ({
    ...s,
    count: breakdown[s.key],
    width: (breakdown[s.key] / total) * 100,
  })).filter((s) => s.count > 0);

  if (segments.length === 0) return null;

  return (
    <div className="mt-1">
      <div className="flex h-1 rounded-sm overflow-hidden bg-slate-800/80">
        {segments.map((s) => (
          <div
            key={s.key}
            className={`${s.bar} min-w-0`}
            style={{ width: `${s.width}%` }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-2 gap-y-0 mt-0.5">
        {segments.map((s) => (
          <span
            key={s.key}
            className="text-[9px] text-slate-500 tabular-nums"
          >
            <span className={`inline-block w-1 h-1 rounded-full ${s.bar} mr-0.5 align-middle`} />
            {s.label} {s.count}
          </span>
        ))}
      </div>
    </div>
  );
}
