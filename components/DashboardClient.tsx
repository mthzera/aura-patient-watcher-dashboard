"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { FiltersBar, type ActiveFilters } from "@/components/FiltersBar";
import { KpiCard } from "@/components/KpiCard";
import { ClosedLoopPanel } from "@/components/ClosedLoopPanel";
import { ClinicalIndicatorsPanel } from "@/components/ClinicalIndicatorsPanel";
import { PatientAlertRankingPanel } from "@/components/PatientAlertRankingPanel";
import { UnitManagementTable } from "@/components/UnitManagementTable";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { ImprovementOpportunityPanel } from "@/components/ImprovementOpportunityPanel";
import { ReinternacaoAlertPanel } from "@/components/ReinternacaoAlertPanel";
import { InitiationReasonsPanel } from "@/components/InitiationReasonsPanel";
import { UploadPrompt } from "@/components/UploadPrompt";
import {
  DashboardResponse,
  FiltersResponse,
  DashboardMetrics,
} from "@/lib/dashboard/types";
import {
  Activity,
  Users,
  Bell,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";

const REFRESH_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_DASHBOARD_REFRESH_SECONDS ?? "60",
  10
);

const EMPTY_METRICS: DashboardMetrics = {
  totalRecords: 0,
  uniquePatients: 0,
  auraAlerts: 0,
  triagens: 0,
  unitActions: 0,
  favorableOutcomes: 0,
  normalClinicalReturnAlerts: 0,
  normalClinicalReturnPatients: 0,
  normalClinicalReturnAlertRate: 0,
  closedLoopEffectivenessRate: 0,
  noReturnCases: 0,
  transientDecompensations: 0,
  transientEffectiveActions: 0,
  transientEffectiveRate: 0,
  acuteDecompensations: 0,
  acuteEffectiveActions: 0,
  acuteEffectiveRate: 0,
  deteriorationReversals: 0,
  avoidedReadmissions: 0,
};

const EMPTY_FILTERS: ActiveFilters = {
  startDate: "",
  endDate: "",
  unit: "",
  clinicalAlteration: "",
  clinicalOutcome: "",
  auraActionStatus: "",
};

// True when the error message indicates no file has been uploaded yet
function isNoFileError(msg: string): boolean {
  return msg.toLowerCase().includes("nenhum arquivo csv");
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [filterOptions, setFilterOptions] = useState<FiltersResponse | null>(null);
  const [filters, setFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [dataSource, setDataSource] = useState("CSV local");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [reinternacaoRowCount, setReinternacaoRowCount] = useState<number | null>(null);

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const fetchDashboard = useCallback(async (currentFilters: ActiveFilters) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentFilters.startDate) params.set("startDate", currentFilters.startDate);
      if (currentFilters.endDate) params.set("endDate", currentFilters.endDate);
      if (currentFilters.unit) params.set("unit", currentFilters.unit);
      if (currentFilters.clinicalAlteration)
        params.set("clinicalAlteration", currentFilters.clinicalAlteration);
      if (currentFilters.clinicalOutcome)
        params.set("clinicalOutcome", currentFilters.clinicalOutcome);
      if (currentFilters.auraActionStatus)
        params.set("auraActionStatus", currentFilters.auraActionStatus);

      const res = await fetch(`/api/dashboard?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Erro ao carregar dados.");
      } else {
        setData(json as DashboardResponse);
        setWarnings(json.warnings ?? []);
        setError(null);
      }
    } catch {
      setError("Erro de rede ao conectar com a API.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch("/api/filters");
      if (res.ok) setFilterOptions(await res.json());
    } catch {
      // non-critical
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      if (res.ok) {
        const h = await res.json();
        if (h.dataSource) setDataSource(h.dataSource);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchReinternacaoStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/reinternacoes-status");
      if (res.ok) {
        const json = await res.json();
        if (json.loaded && json.meta?.rowCount) {
          setReinternacaoRowCount(json.meta.rowCount);
        }
      }
    } catch {
      // non-critical
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    await fetch("/api/refresh", { method: "POST" });
    await Promise.all([fetchDashboard(filtersRef.current), fetchFilters()]);
  }, [fetchDashboard, fetchFilters]);

  // Called after a successful CSV upload — reload everything
  const handleUploadSuccess = useCallback(async () => {
    setError(null);
    setFilters(EMPTY_FILTERS);
    await Promise.all([
      fetchDashboard(EMPTY_FILTERS),
      fetchFilters(),
      fetchHealth(),
    ]);
  }, [fetchDashboard, fetchFilters, fetchHealth]);

  useEffect(() => {
    fetchDashboard(EMPTY_FILTERS);
    fetchFilters();
    fetchHealth();
    fetchReinternacaoStatus();
  }, [fetchDashboard, fetchFilters, fetchHealth, fetchReinternacaoStatus]);

  useEffect(() => {
    fetchDashboard(filters);
  }, [filters, fetchDashboard]);

  // Sem auto-refresh: os dados vêm de um CSV físico importado e só mudam
  // quando o usuário faz um novo upload ou clica em "Recarregar". Nada de
  // polling em segundo plano alterando os números sozinho.

  // Show upload screen when no file has been uploaded yet
  if (!isLoading && error && isNoFileError(error)) {
    return <UploadPrompt onUploadSuccess={handleUploadSuccess} />;
  }

  const metrics = data?.metrics ?? EMPTY_METRICS;
  const lastFetchAt = data?.lastFetchAt ?? null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <DashboardHeader
        lastFetchAt={lastFetchAt}
        isLoading={isLoading}
        isConnected={!error}
        onRefresh={handleRefresh}
        onUploadSuccess={handleUploadSuccess}
        onReinternacaoUpload={(count) => {
          setReinternacaoRowCount(count);
          fetchDashboard(filtersRef.current);
        }}
        reinternacaoRowCount={reinternacaoRowCount}
        autoRefreshSeconds={REFRESH_SECONDS}
        dataSource={dataSource}
      />

      <main className="mx-auto max-w-screen-2xl px-6 py-4 space-y-4">
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="rounded-lg border border-amber-800 bg-amber-950/30 px-4 py-3 space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-300">
                ⚠ {w}
              </p>
            ))}
          </div>
        )}

        {/* Error state (only if data was previously loaded) */}
        {error && !isNoFileError(error) && (
          <div className="rounded-xl border border-red-800 bg-red-950/30 p-5 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-300 mb-1">
                Erro ao carregar dados
              </p>
              <p className="text-xs text-slate-400">{error}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <FiltersBar
          filters={filters}
          filterOptions={filterOptions}
          onChange={setFilters}
          onClear={() => setFilters(EMPTY_FILTERS)}
        />

        {/* Record count */}
        {data && (
          <p className="text-xs text-slate-500">
            Exibindo{" "}
            <span className="text-slate-300 font-medium">{data.filteredRows}</span>{" "}
            de{" "}
            <span className="text-slate-300 font-medium">{data.totalRows}</span>{" "}
            registros
          </p>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Registros analisados"
            value={metrics.totalRecords}
            subtitle="Total no período filtrado"
            icon={<Activity className="h-4 w-4" />}
          />
          <KpiCard
            label="Pacientes únicos"
            value={metrics.uniquePatients}
            subtitle="Identificados na planilha"
            icon={<Users className="h-4 w-4" />}
          />
          <KpiCard
            label="Alertas AURA"
            value={metrics.auraAlerts}
            subtitle='Registros com "Alertado: Sim"'
            icon={<Bell className="h-4 w-4" />}
          />
          <KpiCard
            label="Atuação da unidade"
            value={metrics.unitActions}
            subtitle="Respostas documentadas"
            icon={<CheckCircle className="h-4 w-4" />}
            variant="success"
          />
          <KpiCard
            label="Casos sem retorno"
            value={metrics.noReturnCases}
            subtitle="Ciclo assistencial não fechado"
            icon={<XCircle className="h-4 w-4" />}
            variant="warning"
          />
        </div>

        {/* Main sections */}
        {data && (
          <>
            <ClosedLoopPanel
              metrics={metrics}
              initiationBreakdown={data.initiationBreakdown}
            />
            <InitiationReasonsPanel breakdown={data.initiationBreakdown} />
            <ClinicalIndicatorsPanel decompensation={data.decompensation} />
            <PatientAlertRankingPanel ranking={data.patientAlertRanking} />
            <ReinternacaoAlertPanel
              analysis={data.reinternacaoAlertAnalysis}
            />
            <UnitManagementTable data={data.unitSummaries} />
            <TimeSeriesChart data={data.timeSeries} />
            <ImprovementOpportunityPanel
              metrics={metrics}
              responsiveness={data.responsiveness}
            />
          </>
        )}

        {/* Loading skeleton */}
        {isLoading && !data && !error && (
          <div className="space-y-4 animate-pulse">
            <div className="h-40 rounded-xl bg-slate-800/60" />
            <div className="h-40 rounded-xl bg-slate-800/60" />
          </div>
        )}
      </main>
    </div>
  );
}
