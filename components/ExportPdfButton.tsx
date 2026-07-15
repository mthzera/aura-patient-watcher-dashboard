"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, FileDown, FileText, Loader2, Presentation } from "lucide-react";
import type { ActiveFilters } from "@/components/FiltersBar";

export type PdfExportType = "executive" | "analytical";

interface Props {
  filters: ActiveFilters;
  dataSource?: string;
  disabled?: boolean;
}

function buildQueryParams(
  filters: ActiveFilters,
  dataSource: string | undefined,
  type: PdfExportType
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.businessUnit) params.set("businessUnit", filters.businessUnit);
  if (filters.unit) params.set("unit", filters.unit);
  if (filters.clinicalAlteration) params.set("clinicalAlteration", filters.clinicalAlteration);
  if (filters.clinicalOutcome) params.set("clinicalOutcome", filters.clinicalOutcome);
  if (filters.auraActionStatus) params.set("auraActionStatus", filters.auraActionStatus);
  if (dataSource) params.set("dataSource", dataSource);
  params.set("type", type);
  return params;
}

const OPTIONS: {
  type: PdfExportType;
  title: string;
  description: string;
  icon: typeof Presentation;
}[] = [
  {
    type: "executive",
    title: "Resumo Executivo",
    description: "2 páginas · resultados e melhorias",
    icon: Presentation,
  },
  {
    type: "analytical",
    title: "Relatório Analítico",
    description: "Relatório completo do dashboard",
    icon: FileText,
  },
];

export function ExportPdfButton({ filters, dataSource, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<PdfExportType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleExport(type: PdfExportType) {
    setOpen(false);
    setExporting(type);
    setError(null);
    try {
      const params = buildQueryParams(filters, dataSource, type);
      const res = await fetch(`/api/export-pdf?${params.toString()}`);

      if (!res.ok) {
        let message = "Erro ao gerar PDF.";
        try {
          const json = await res.json();
          if (json.error) message = json.error;
        } catch {
          // ignore parse errors
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const dateStamp = new Date().toISOString().slice(0, 10);
      anchor.download =
        type === "executive"
          ? `resumo-executivo-aura-${dateStamp}.pdf`
          : `relatorio-aura-${dateStamp}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erro de rede ao exportar PDF.");
    } finally {
      setExporting(null);
    }
  }

  const busy = exporting != null;

  return (
    <div className="relative flex flex-col items-end gap-1" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Escolher tipo de PDF para exportar"
        className="flex items-center gap-2 rounded-md border border-teal-700/60 bg-teal-950/40 px-4 py-1.5 text-xs font-medium text-teal-300 transition hover:bg-teal-900/50 hover:border-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileDown className="h-3.5 w-3.5" />
        )}
        {busy ? "Gerando PDF…" : "Exportar PDF"}
        <ChevronDown className={`h-3 w-3 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && !busy && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-lg border border-slate-700 bg-slate-900 shadow-xl"
        >
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.type}
                type="button"
                role="menuitem"
                onClick={() => handleExport(option.type)}
                className="flex w-full items-start gap-3 px-3.5 py-3 text-left transition hover:bg-slate-800"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                <span>
                  <span className="block text-xs font-semibold text-slate-100">
                    {option.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400">
                    {option.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <span className="text-[10px] text-red-400 max-w-[240px] text-right">{error}</span>
      )}
    </div>
  );
}
