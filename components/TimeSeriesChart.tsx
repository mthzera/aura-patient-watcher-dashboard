"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TimeSeriesPoint } from "@/lib/dashboard/types";

interface Props {
  data: TimeSeriesPoint[];
}

const SERIES = [
  { key: "auraAlerts", label: "Alertas AURA", color: "#60a5fa" },
  { key: "unitActions", label: "Atuações da unidade", color: "#fbbf24" },
  { key: "favorableOutcomes", label: "Desfechos favoráveis", color: "#2dd4bf" },
  { key: "noReturnCases", label: "Sem retorno", color: "#f87171" },
] as const;

export function TimeSeriesChart({ data }: Props) {
  if (data.length === 0) {
    return (
      <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-4">
          Evolução no tempo
        </h2>
        <p className="text-sm text-slate-500">
          Nenhum dado com data disponível para exibir o gráfico.
        </p>
      </section>
    );
  }

  // One point per day so the day-to-day variation shows. To keep the axis
  // readable we only label every ~15 days (computed below).
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: formatDateLabel(d.date),
  }));
  const ticks = pickTicks(formatted);

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
        Evolução no tempo
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        Valores diários (eixo marcado a cada 15 dias)
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={formatted}
          margin={{ top: 4, right: 8, left: -16, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="dateLabel"
            ticks={ticks}
            interval={0}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={{ stroke: "#334155" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e2e8f0", marginBottom: 4 }}
            itemStyle={{ color: "#cbd5e1" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#94a3b8", paddingTop: 12 }}
          />
          {SERIES.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
}

function formatDateLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}/${month}`;
}

const LABEL_EVERY_DAYS = 15;
const DAY_MS = 86_400_000;

/**
 * Pick X-axis tick labels spaced ~15 calendar days apart. We walk the daily
 * points and select the first one at/after each 15-day grid line, always
 * including the last point so the most recent date is labeled.
 */
function pickTicks(points: { date: string; dateLabel: string }[]): string[] {
  if (points.length === 0) return [];

  const ticks: string[] = [];
  let threshold = Date.parse(`${points[0].date}T00:00:00Z`);

  for (const p of points) {
    const ms = Date.parse(`${p.date}T00:00:00Z`);
    if (ms >= threshold) {
      ticks.push(p.dateLabel);
      while (threshold <= ms) threshold += LABEL_EVERY_DAYS * DAY_MS;
    }
  }

  const last = points[points.length - 1].dateLabel;
  if (ticks[ticks.length - 1] !== last) ticks.push(last);

  return ticks;
}
