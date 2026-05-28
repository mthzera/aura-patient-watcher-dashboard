"use client";

import { FiltersResponse } from "@/lib/dashboard/types";

interface ActiveFilters {
  startDate: string;
  endDate: string;
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
  function update(key: keyof ActiveFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-5 py-4">
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

        {/* Unit */}
        <SelectFilter
          label="Unidade"
          value={filters.unit}
          options={filterOptions?.units ?? []}
          onChange={(v) => update("unit", v)}
          placeholder="Todas as unidades"
        />

        {/* Clinical alteration */}
        <SelectFilter
          label="Alteração clínica"
          value={filters.clinicalAlteration}
          options={filterOptions?.clinicalAlterationTypes ?? []}
          onChange={(v) => update("clinicalAlteration", v)}
          placeholder="Todas"
        />

        {/* Clinical outcome */}
        <SelectFilter
          label="Desfecho clínico"
          value={filters.clinicalOutcome}
          options={filterOptions?.clinicalOutcomes ?? []}
          onChange={(v) => update("clinicalOutcome", v)}
          placeholder="Todos"
        />

        {/* AURA action status */}
        <SelectFilter
          label="Atuação AURA"
          value={filters.auraActionStatus}
          options={filterOptions?.auraActionStatuses ?? []}
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
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
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
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
