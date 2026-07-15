"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { BusinessUnit, FiltersResponse } from "@/lib/dashboard/types";
import {
  BUSINESS_UNIT_OPTIONS,
  resolveBusinessUnit,
} from "@/lib/dashboard/businessUnit";

export interface ActiveFilters {
  startDate: string;
  endDate: string;
  businessUnit: BusinessUnit | "";
  unit: string;
  clinicalAlteration: string;
  clinicalOutcome: string;
  auraActionStatus: string;
}

interface Props {
  filters: ActiveFilters;
  filterOptions: FiltersResponse | null;
  onChange: (filters: ActiveFilters) => void;
  onClear: () => void;
}

export function FiltersBar({ filters, filterOptions, onChange, onClear }: Props) {
  const [isVisible, setIsVisible] = useState(true);

  function update(key: keyof ActiveFilters, value: string) {
    if (key === "businessUnit") {
      onChange({
        ...filters,
        businessUnit: value as BusinessUnit | "",
        unit: "",
      });
      return;
    }
    onChange({ ...filters, [key]: value });
  }

  const availableUnits = (filterOptions?.units ?? []).filter(
    (unit) => resolveBusinessUnit(unit) === filters.businessUnit
  );

  const hasActiveFilters =
    filters.businessUnit !== "" ||
    filters.unit !== "" ||
    filters.clinicalAlteration !== "" ||
    filters.clinicalOutcome !== "" ||
    filters.auraActionStatus !== "" ||
    filters.startDate !== "" ||
    filters.endDate !== "";

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-4">
      <div className={`flex items-center justify-between gap-3${isVisible ? " mb-4" : ""}`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Filtros
          </span>
          {!isVisible && hasActiveFilters && (
            <span className="rounded-full bg-teal-500/20 px-2 py-0.5 text-[10px] font-medium text-teal-300">
              Ativos
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsVisible((v) => !v)}
          className="flex items-center gap-1.5 rounded-md border border-slate-600 bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-600"
          aria-expanded={isVisible}
        >
          {isVisible ? (
            <>
              <ChevronUp className="h-3.5 w-3.5" />
              Ocultar filtros
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5" />
              Mostrar filtros
            </>
          )}
        </button>
      </div>

      {isVisible && (
      <div className="flex flex-wrap items-end gap-3">
        {/* Date range */}
        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-xs text-slate-400 uppercase tracking-wide">
            Data inicial
          </label>
          <input
            type="date"
            value={filters.startDate}
            min={filterOptions?.minDate ?? undefined}
            max={filterOptions?.maxDate ?? undefined}
            onChange={(e) => update("startDate", e.target.value)}
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1 min-w-[130px]">
          <label className="text-xs text-slate-400 uppercase tracking-wide">
            Data final
          </label>
          <input
            type="date"
            value={filters.endDate}
            min={filterOptions?.minDate ?? undefined}
            max={filterOptions?.maxDate ?? undefined}
            onChange={(e) => update("endDate", e.target.value)}
            className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
          />
        </div>

        {/* Business unit controls which care units are available. */}
        <SelectFilter
          label="Unidade de negócio"
          value={filters.businessUnit}
          options={BUSINESS_UNIT_OPTIONS}
          onChange={(v) => update("businessUnit", v)}
          placeholder="Selecione"
        />

        {filters.businessUnit && (
          <SelectFilter
            label="Unidade"
            value={filters.unit}
            options={availableUnits.map((unit) => ({
              value: unit,
              label: unit,
            }))}
            onChange={(v) => update("unit", v)}
            placeholder="Todas desta unidade de negócio"
          />
        )}

        <SelectFilter
          label="Alteração clínica"
          value={filters.clinicalAlteration}
          options={(filterOptions?.clinicalAlterationTypes ?? []).map((u) => ({
            value: u,
            label: u,
          }))}
          onChange={(v) => update("clinicalAlteration", v)}
          placeholder="Todas"
        />

        <SelectFilter
          label="Desfecho clínico"
          value={filters.clinicalOutcome}
          options={(filterOptions?.clinicalOutcomes ?? []).map((u) => ({
            value: u,
            label: u,
          }))}
          onChange={(v) => update("clinicalOutcome", v)}
          placeholder="Todos"
        />

        <SelectFilter
          label="Atuação AURA"
          value={filters.auraActionStatus}
          options={(filterOptions?.auraActionStatuses ?? []).map((u) => ({
            value: u,
            label: u,
          }))}
          onChange={(v) => update("auraActionStatus", v)}
          placeholder="Todas"
        />

        {/* Clear button */}
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="rounded-md border border-slate-600 bg-slate-700 px-4 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-600 self-end"
          >
            Limpar filtros
          </button>
        )}
      </div>
      )}
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
  placeholder,
  hideBlankOption,
}: {
  label: string;
  value: string;
  options:
    | ReadonlyArray<{ value: string; label: string }>
    | ReadonlyArray<string>;
  onChange: (v: string) => void;
  placeholder: string;
  hideBlankOption?: boolean;
}) {
  const normalized = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <label className="text-xs text-slate-400 uppercase tracking-wide">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-600 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:border-teal-500 focus:outline-none"
      >
        {!hideBlankOption && <option value="">{placeholder}</option>}
        {normalized.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
