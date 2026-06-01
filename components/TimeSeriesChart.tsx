"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
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

// Reference bands (média diária por quinzena). Ajuste estes valores para
// recalibrar os patamares de baixo / médio / alto.
const REFERENCE_LINES = [
  { value: 8, label: "Baixo", color: "#34d399" },
  { value: 16, label: "Médio", color: "#fbbf24" },
  { value: 24, label: "Alto", color: "#f87171" },
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

  // Each point is a 15-day bucket starting at `date`; the range label
  // (início – fim) is shown in the tooltip.
  const formatted = data.map((d) => ({
    ...d,
    dateLabel: formatDateLabel(d.date),
    rangeLabel: formatRangeLabel(d.date),
  }));

  return (
    <section className="rounded-xl border border-slate-700 bg-slate-800/40 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300 mb-1">
        Evolução no tempo
      </h2>
      <p className="text-xs text-slate-500 mb-5">
        Média diária por quinzena (janelas de 15 dias)
      </p>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={formatted}
          margin={{ top: 4, right: 52, left: -16, bottom: 4 }}
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
            allowDecimals
          />
          {REFERENCE_LINES.map((ref) => (
            <ReferenceLine
              key={ref.label}
              y={ref.value}
              stroke={ref.color}
              strokeDasharray="5 5"
              strokeOpacity={0.55}
              label={{
                value: ref.label,
                position: "right",
                fill: ref.color,
                fontSize: 10,
                fillOpacity: 0.9,
              }}
            />
          ))}
          <Tooltip
            contentStyle={{
              background: "#1e293b",
              border: "1px solid #334155",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#e2e8f0", marginBottom: 4 }}
            itemStyle={{ color: "#cbd5e1" }}
            labelFormatter={(_label, payload) =>
              payload?.[0]?.payload?.rangeLabel ?? _label
            }
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

/** "05/01 – 19/01": the 15-day window starting at the bucket date. */
function formatRangeLabel(iso: string): string {
  const startMs = Date.parse(`${iso}T00:00:00Z`);
  const endMs = startMs + 14 * 86_400_000;
  const end = new Date(endMs).toISOString().slice(0, 10);
  return `${formatDateLabel(iso)} – ${formatDateLabel(end)}`;
}
