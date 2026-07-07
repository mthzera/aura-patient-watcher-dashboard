"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import type { ActiveFilters } from "@/components/FiltersBar";

interface Props {
  filters: ActiveFilters;
  dataSource?: string;
  disabled?: boolean;
}

function buildQueryParams(filters: ActiveFilters, dataSource?: string): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.startDate) params.set("startDate", filters.startDate);
  if (filters.endDate) params.set("endDate", filters.endDate);
  if (filters.unit) params.set("unit", filters.unit);
  if (filters.clinicalAlteration) params.set("clinicalAlteration", filters.clinicalAlteration);
  if (filters.clinicalOutcome) params.set("clinicalOutcome", filters.clinicalOutcome);
  if (filters.auraActionStatus) params.set("auraActionStatus", filters.auraActionStatus);
  if (dataSource) params.set("dataSource", dataSource);
  return params;
}

export function ExportPdfButton({ filters, dataSource, disabled }: Props) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const params = buildQueryParams(filters, dataSource);
      const res = await fetch(`/api/export-pdf?${params.toString()}`);

      if (!res.ok) {
        let message = "Erro ao gerar PDF.";
        try {
          const json = await res.json();
          if (json.error) message = json.error;
        } catch {
          // ignore
        }
        setError(message);
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `relatorio-aura-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Erro de rede ao exportar PDF.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={disabled || exporting}
        title="Gerar PDF completo do dashboard para apresentação"
        className="flex items-center gap-2 rounded-md border border-teal-700/60 bg-teal-950/40 px-4 py-1.5 text-xs font-medium text-teal-300 transition hover:bg-teal-900/50 hover:border-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <FileDown className="h-3.5 w-3.5" />
        )}
        {exporting ? "Gerando PDF…" : "Exportar PDF"}
      </button>
      {error && (
        <span className="text-[10px] text-red-400 max-w-[200px] text-right">{error}</span>
      )}
    </div>
  );
}
