import { describe, expect, it } from "vitest";
import { buildExecutivePdf } from "@/lib/dashboard/buildExecutivePdf";
import type { DashboardMetrics, DashboardResponse } from "@/lib/dashboard/types";

const ZERO_METRICS: DashboardMetrics = {
  totalRecords: 0,
  uniquePatients: 0,
  auraAlertFlagMissing: 0,
  auraAlerts: 0,
  triagens: 0,
  alertsWithReturn: 0,
  auraAlertsNoReturn: 0,
  alertResponseRate: 0,
  auraAlertsNoReturnRate: 0,
  unitActions: 0,
  favorableOutcomes: 0,
  registeredOutcomes: 0,
  registeredOutcomesAuraAlerts: 0,
  registeredOutcomesAuraAlertsRate: 0,
  registeredOutcomesAuraAlertsMissing: 0,
  normalClinicalReturnAlerts: 0,
  normalClinicalReturnPatients: 0,
  normalClinicalReturnAmongReturnRate: 0,
  normalClinicalReturnAlertRate: 0,
  closedLoopEffectivenessRate: 0,
  closedLoopEffectivenessDenominator: 0,
  closedLoopEffectivenessNumerator: 0,
  closedLoopMissingOutcomeAmongActions: 0,
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

function emptyDesfecho() {
  return {
    total: 0,
    melhoraClinica: 0,
    condicaoBasal: 0,
    finitude: 0,
    reintercacao: 0,
    erroRegistro: 0,
    semRetorno: 0,
    semInformacao: 0,
  };
}

function emptyDiscussaoComite() {
  return {
    total: 0,
    monitoramento: 0,
    naoMonitorado: 0,
    reinternacaoEvitada: 0,
    reinternacaoEvitavel: 0,
    reinternacaoInevitavel: 0,
    reversaoDeterioracao: 0,
    semInformacao: 0,
  };
}

function emptyResponse(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    metrics: ZERO_METRICS,
    unitSummaries: [],
    timeSeries: [],
    responsiveness: {
      available: false,
      byShift: [],
      byDayOfWeek: [],
      byHourBand: [],
      worstShift: null,
      bestShift: null,
      worstDay: null,
      bestResponseWindow: null,
      overallNoReturnRate: 0,
      actionPlan: [],
    },
    reinternacaoAlertAnalysis: {
      available: false,
      totalReinternacoes: 0,
      withPriorAlert: 0,
      withoutPriorAlert: 0,
      effectiveness: {
        acted: 0,
        notActed: 0,
        byReason: {
          sem_retorno: 0,
          retorno_estavel: 0,
          retorno_desfavoravel: 0,
          retorno_favoravel_reinternou: 0,
          outros: 0,
        },
        byAlteration: {
          aguda: { total: 0, acted: 0, notActed: 0 },
          transitoria: { total: 0, acted: 0, notActed: 0 },
          outra: { total: 0, acted: 0, notActed: 0 },
        },
      },
      matches: [],
    },
    intercorrenciaAnalysis: {
      available: false,
      totalIntercorrencias: 0,
      withPriorAlert: 0,
      withoutPriorAlert: 0,
      topReasons: [],
      urgencyBreakdown: [],
      outcomeTrajectory: [],
      timeline: [],
      matches: [],
    },
    initiationBreakdown: {
      available: false,
      total: 0,
      reasons: [],
      semRetornoTotal: 0,
    },
    noReturnReasons: {
      available: false,
      totalNoReturn: 0,
      unidadeNaoRespondeu: 0,
      semContatoTelefonico: 0,
      semInformacao: 0,
    },
    returnReasons: {
      available: false,
      totalWithReturn: 0,
      aguda: emptyDiscussaoComite(),
      esperada: emptyDesfecho(),
      outros: 0,
    },
    auraAlertSplit: {
      available: false,
      totalAuraAlerts: 0,
      alertsWithReturn: 0,
      auraAlertsNoReturn: 0,
      sumMatchesTotal: true,
    },
    decompensation: {
      scopePatientDays: 0,
      decompensatedPatientDays: 0,
      transientTotal: 0,
      transient: [],
      transientEffectiveRate: 0,
      transientEffectivePatients: 0,
      acuteTotal: 0,
      acuteUniquePatients: 0,
      acuteEffectivePatients: 0,
      acuteEffectiveRate: 0,
      deteriorationReversals: 0,
      acuteMonitoringPatients: 0,
      avoidedReadmissions: 0,
      acutePatientDetails: [],
    },
    patientAlertRanking: { limit: 20, transient: [], acute: [] },
    totalRows: 0,
    filteredRows: 0,
    lastFetchAt: null,
    warnings: [],
    ...overrides,
  };
}

function countPdfPages(bytes: ArrayBuffer): number {
  const text = Buffer.from(bytes).toString("latin1");
  const matches = text.match(/\/Type\s*\/Page(?!\w)/g);
  return matches?.length ?? 0;
}

describe("buildExecutivePdf", () => {
  it("generates exactly one page for empty filters", () => {
    const bytes = buildExecutivePdf(emptyResponse(), {
      filters: {},
      generatedAt: new Date("2026-07-15T12:00:00"),
    });
    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(Buffer.from(bytes).toString("latin1").startsWith("%PDF")).toBe(true);
    expect(countPdfPages(bytes)).toBe(1);
  });

  it("generates two pages separating results from improvements", () => {
    const data = emptyResponse({
      filteredRows: 100,
      totalRows: 100,
      metrics: {
        ...ZERO_METRICS,
        totalRecords: 100,
        uniquePatients: 40,
        auraAlerts: 80,
        alertsWithReturn: 50,
        alertResponseRate: 62.5,
        unitActions: 48,
        favorableOutcomes: 40,
        closedLoopEffectivenessRate: 85,
        closedLoopEffectivenessNumerator: 34,
        closedLoopEffectivenessDenominator: 40,
        deteriorationReversals: 5,
        avoidedReadmissions: 3,
      },
      decompensation: {
        ...emptyResponse().decompensation,
        deteriorationReversals: 8,
        avoidedReadmissions: 4,
      },
      responsiveness: {
        available: true,
        byShift: [
          { label: "MANHÃ", total: 30, auraAlerts: 25, noReturn: 5, noReturnRate: 20, effective: 20, effectiveRate: 66 },
          { label: "TARDE", total: 25, auraAlerts: 23, noReturn: 8, noReturnRate: 35, effective: 15, effectiveRate: 60 },
          { label: "NOITE", total: 25, auraAlerts: 22, noReturn: 10, noReturnRate: 45, effective: 12, effectiveRate: 48 },
          { label: "MADRUGADA", total: 20, auraAlerts: 17, noReturn: 12, noReturnRate: 70, effective: 6, effectiveRate: 30 },
        ],
        byDayOfWeek: [
          { label: "Segunda", total: 20, auraAlerts: 17, noReturn: 5, noReturnRate: 30, effective: 10, effectiveRate: 50 },
          { label: "Sábado", total: 15, auraAlerts: 14, noReturn: 8, noReturnRate: 55, effective: 5, effectiveRate: 33 },
          { label: "Domingo", total: 10, auraAlerts: 10, noReturn: 5, noReturnRate: 50, effective: 3, effectiveRate: 30 },
        ],
        byHourBand: [],
        worstShift: {
          label: "MADRUGADA",
          total: 20,
          auraAlerts: 17,
          noReturn: 12,
          noReturnRate: 70,
          effective: 6,
          effectiveRate: 30,
        },
        bestShift: {
          label: "MANHÃ",
          total: 30,
          auraAlerts: 25,
          noReturn: 5,
          noReturnRate: 20,
          effective: 20,
          effectiveRate: 66,
        },
        worstDay: null,
        bestResponseWindow: null,
        overallNoReturnRate: 40,
        actionPlan: [],
      },
    });

    const bytes = buildExecutivePdf(data, {
      filters: { unit: "UTI A" },
      dataSource: "planilha-operacional.csv",
      generatedAt: new Date("2026-07-15T12:00:00"),
    });
    expect(Buffer.from(bytes).toString("latin1").startsWith("%PDF")).toBe(true);
    expect(countPdfPages(bytes)).toBe(2);
  });

  it("keeps two pages when shift data is unavailable", () => {
    const data = emptyResponse({
      filteredRows: 20,
      totalRows: 20,
      metrics: {
        ...ZERO_METRICS,
        totalRecords: 20,
        uniquePatients: 8,
        auraAlerts: 15,
        alertsWithReturn: 10,
        auraAlertsNoReturn: 5,
        alertResponseRate: 66.7,
        unitActions: 9,
        favorableOutcomes: 8,
      },
    });
    const bytes = buildExecutivePdf(data, {
      filters: { unit: "Unidade teste" },
      generatedAt: new Date("2026-07-15T12:00:00"),
    });
    expect(countPdfPages(bytes)).toBe(2);
  });
});
