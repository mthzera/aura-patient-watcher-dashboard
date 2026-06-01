"use client";

import { Info } from "lucide-react";

interface Props {
  text: string;
  className?: string;
}

export function MetricTooltip({ text, className = "" }: Props) {
  return (
    <span className={`relative inline-flex group ${className}`}>
      <Info
        className="h-3.5 w-3.5 text-slate-500 cursor-help shrink-0"
        aria-label="Explicação"
      />
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 w-56 -translate-x-1/2 rounded-md border border-slate-600 bg-slate-900 px-2.5 py-2 text-xs leading-snug text-slate-300 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
