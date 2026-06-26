"use client";

import {
  LazyLoadFooter,
  ScrollTable,
  STICKY_TABLE_HEAD,
} from "@/components/LazyScrollTable";
import { useLazyList } from "@/components/useLazyList";
import { UnitSummary } from "@/lib/dashboard/types";

interface Props {
  data: UnitSummary[];
}

export function UnitManagementTable({ data }: Props) {
  const {
    scrollRef,
    sentinelRef,
    visibleItems,
    visibleCount,
    totalCount,
    hasMore,
    loadMore,
  } = useLazyList(data);

  if (data.length === 0) {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-4">
          Gestão por unidade
        </h2>
        <p className="text-sm text-slate-500">Nenhum dado disponível.</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-4">
        Gestão por unidade
      </h2>

      <div className="overflow-hidden rounded-lg border border-slate-700/60">
        <ScrollTable scrollRef={scrollRef} className="rounded-none border-0">
          <table className="w-full text-sm">
            <thead>
              <tr className={STICKY_TABLE_HEAD}>
                {[
                  "Unidade",
                  "Registros",
                  "Alertas AURA",
                  "Atuações",
                  "Desfechos favoráveis",
                  "Efetividade",
                  "Sem retorno (alertas)",
                ].map((h) => (
                  <th
                    key={h}
                    className="py-2 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 first:pl-3"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((row, i) => (
                <tr
                  key={row.unit}
                  className={`border-b border-slate-800 ${
                    i % 2 === 0 ? "bg-transparent" : "bg-slate-800/20"
                  } hover:bg-slate-700/20 transition`}
                >
                  <td className="py-3 pl-3 pr-4 font-medium text-slate-200">
                    {row.unit}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-slate-300">
                    {row.totalRecords}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-blue-300">
                    {row.auraAlerts}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-amber-300">
                    {row.unitActions}
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-teal-300">
                    {row.favorableOutcomes}
                  </td>
                  <td className="py-3 pr-4">
                    <EffectivenessChip rate={row.closedLoopEffectivenessRate} />
                  </td>
                  <td className="py-3 pr-4 tabular-nums text-amber-500">
                    {row.noReturnCases}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <div ref={sentinelRef} className="h-8 shrink-0" aria-hidden />
          )}
        </ScrollTable>
        <LazyLoadFooter
          visibleCount={visibleCount}
          totalCount={totalCount}
          hasMore={hasMore}
          onLoadMore={loadMore}
        />
      </div>
    </section>
  );
}

function EffectivenessChip({ rate }: { rate: number }) {
  const color =
    rate >= 70
      ? "text-teal-300 bg-teal-950/60 border-teal-800"
      : rate >= 40
        ? "text-amber-300 bg-amber-950/60 border-amber-800"
        : "text-red-300 bg-red-950/60 border-red-900";

  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${color}`}
    >
      {rate}%
    </span>
  );
}
