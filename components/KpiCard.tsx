"use client";

import { ReactNode } from "react";

interface Props {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  tooltip?: ReactNode;
  highlight?: boolean; // dominant KPI (closed-loop effectiveness)
  variant?: "default" | "warning" | "success";
}

export function KpiCard({
  label,
  value,
  subtitle,
  icon,
  tooltip,
  highlight = false,
  variant = "default",
}: Props) {
  const borderColor = highlight
    ? "border-teal-500"
    : variant === "warning"
    ? "border-amber-700"
    : variant === "success"
    ? "border-emerald-700"
    : "border-slate-700";

  const valueColor = highlight
    ? "text-teal-300"
    : variant === "warning"
    ? "text-amber-300"
    : variant === "success"
    ? "text-emerald-300"
    : "text-white";

  const bgColor = highlight ? "bg-teal-950/60" : "bg-slate-800/60";

  return (
    <div
      className={`rounded-xl border ${borderColor} ${bgColor} p-4 flex flex-col gap-1.5 ${
        highlight ? "ring-1 ring-teal-500/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-slate-400 inline-flex items-center gap-1">
          {label}
          {tooltip}
        </span>
        {icon && <span className="text-slate-500 shrink-0">{icon}</span>}
      </div>

      <div className={`text-3xl font-bold tabular-nums ${valueColor}`}>
        {value}
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 leading-snug">{subtitle}</p>
      )}
    </div>
  );
}
