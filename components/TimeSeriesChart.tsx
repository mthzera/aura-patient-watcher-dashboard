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

  // Format date labels for the X axis
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: formatDateLabel(d.date),
  }));

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-5">
        Evolução no tempo
      </h2>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={formatted}
          margin={{ top: 4, right: 8, left: -16, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="dateLabel"
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
