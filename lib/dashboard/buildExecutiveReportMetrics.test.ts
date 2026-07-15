import { describe, expect, it } from "vitest";
import {
  buildDynamicActionPlan,
  buildDynamicExecutiveSummary,
  buildDynamicOperationalSummary,
  buildExecutiveReportMetrics,
  buildNoResponseReasons,
  buildUnitNoResponseContribution,
  findLargestJourneyDrop,
  getEligibleBestAndWorst,
  summarizeWeekendVsWeekday,
  type ExecutiveShiftBucket,
  type JourneyTransition,
} from "@/lib/dashboard/buildExecutiveReportMetrics";
import {
  formatDate,
  formatInteger,
  formatPercentage,
  formatPercentagePoints,
  ratePercentOneDecimal,
  safeDivide,
  truncateText,
} from "@/lib/dashboard/pdfFormat";
import type {
  DashboardMetrics,
  DashboardResponse,
  TemporalBucket,
  UnitSummary,
} from "@/lib/dashboard/types";

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

function temporal(
  label: string,
  auraAlerts: number,
  noReturn: number,
  total = auraAlerts
): TemporalBucket {
  return {
    label,
    total,
    auraAlerts,
    noReturn,
    noReturnRate:
      auraAlerts > 0 ? Math.round((noReturn / auraAlerts) * 100) : 0,
    effective: 0,
    effectiveRate: 0,
  };
}

function response(input?: {
  metrics?: Partial<DashboardMetrics>;
  shifts?: TemporalBucket[];
  weekdays?: TemporalBucket[];
  units?: UnitSummary[];
  filteredRows?: number;
  reasons?: Partial<DashboardResponse["noReturnReasons"]>;
}): DashboardResponse {
  return {
    metrics: { ...ZERO_METRICS, ...input?.metrics },
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
    responsiveness: {
      available: (input?.shifts?.length ?? 0) > 0,
      byShift: input?.shifts ?? [],
      byDayOfWeek: input?.weekdays ?? [],
      byHourBand: [],
      worstShift: null,
      bestShift: null,
      worstDay: null,
      bestResponseWindow: null,
      overallNoReturnRate: 0,
      actionPlan: [],
    },
    noReturnReasons: {
      available: false,
      totalNoReturn: 0,
      unidadeNaoRespondeu: 0,
      semContatoTelefonico: 0,
      semInformacao: 0,
      ...input?.reasons,
    },
    unitSummaries: input?.units ?? [],
    filteredRows: input?.filteredRows ?? 0,
    totalRows: input?.filteredRows ?? 0,
    lastFetchAt: null,
  } as unknown as DashboardResponse;
}

describe("Brazilian formatting and safe arithmetic", () => {
  it("formats integers, percentages, percentage points and dates", () => {
    expect(formatInteger(3730)).toBe("3.730");
    expect(formatPercentage(61.1)).toBe("61,1%");
    expect(formatPercentage(90)).toBe("90%");
    expect(formatPercentagePoints(39)).toBe("39 p.p.");
    expect(formatDate("2026-07-15")).toBe("15/07/2026");
  });

  it("handles zero denominators and invalid values", () => {
    expect(safeDivide(10, 0)).toBeNull();
    expect(ratePercentOneDecimal(0, 0)).toBe(0);
    expect(formatPercentage(Number.NaN)).toBe("—");
  });

  it("truncates long text safely", () => {
    expect(truncateText("Unidade com nome muito longo", 12)).toBe(
      "Unidade com…"
    );
    expect(truncateText(null, 10)).toBe("—");
  });
});

describe("journey calculations", () => {
  const report = buildExecutiveReportMetrics(
    response({
      filteredRows: 100,
      metrics: {
        uniquePatients: 40,
        auraAlerts: 100,
        alertsWithReturn: 60,
        auraAlertsNoReturn: 40,
        alertResponseRate: 60,
        unitActions: 54,
        favorableOutcomes: 45,
        closedLoopEffectivenessNumerator: 42,
        closedLoopEffectivenessDenominator: 50,
        closedLoopEffectivenessRate: 84,
        registeredOutcomesAuraAlerts: 80,
      },
    }),
    { filters: {} }
  );

  it("calculates response and no-response rates", () => {
    expect(report.overview.responseRate).toBe(60);
    expect(report.overview.noResponseRate).toBe(40);
  });

  it("keeps closed-loop effectiveness from the dashboard metrics", () => {
    expect(report.overview.closedCycleEffectivenessRate).toBe(84);
    expect(report.overview.effectiveClosedCycles).toBe(42);
    expect(report.overview.evaluatedClosedCycles).toBe(50);
  });

  it("calculates all three journey conversions", () => {
    expect(report.journey.alertsToResponsesRate).toBe(60);
    expect(report.journey.responsesToActionsRate).toBe(90);
    expect(report.journey.actionsToFavorableOutcomesRate).toBe(83.3);
  });

  it("identifies the largest journey loss", () => {
    expect(report.journey.largestDropStage?.key).toBe("alertsToResponses");
    expect(report.journey.largestDropStage?.dropPercentagePoints).toBe(40);
  });

  it("calculates registered-outcome quality", () => {
    expect(report.overview.registeredOutcomeRate).toBe(80);
    expect(report.quality[0].numerator).toBe(80);
    expect(report.quality[0].denominator).toBe(100);
  });
});

describe("findLargestJourneyDrop", () => {
  it("ignores unavailable transitions", () => {
    const transitions: JourneyTransition[] = [
      {
        key: "alertsToResponses",
        label: "Taxa de resposta",
        numerator: 0,
        denominator: 0,
        rate: null,
      },
      {
        key: "responsesToActions",
        label: "Retornos que geraram ação",
        numerator: 8,
        denominator: 10,
        rate: 80,
      },
    ];
    expect(findLargestJourneyDrop(transitions)?.key).toBe(
      "responsesToActions"
    );
  });
});

describe("eligible best and worst shifts", () => {
  const shifts: ExecutiveShiftBucket[] = [
    {
      name: "Manhã",
      key: "MANHÃ",
      totalRecords: 100,
      totalAlerts: 100,
      noResponse: 20,
      noResponseRate: 20,
      eligibleForComparison: true,
      sampleReduced: false,
      isWorst: false,
      isBest: false,
    },
    {
      name: "Madrugada",
      key: "MADRUGADA",
      totalRecords: 10,
      totalAlerts: 10,
      noResponse: 9,
      noResponseRate: 90,
      eligibleForComparison: false,
      sampleReduced: true,
      isWorst: false,
      isBest: false,
    },
    {
      name: "Noite",
      key: "NOITE",
      totalRecords: 50,
      totalAlerts: 50,
      noResponse: 30,
      noResponseRate: 60,
      eligibleForComparison: true,
      sampleReduced: false,
      isWorst: false,
      isBest: false,
    },
  ];

  it("excludes reduced samples from best/worst classification", () => {
    const extremes = getEligibleBestAndWorst(
      shifts,
      20,
      (shift) => shift.totalAlerts,
      (shift) => shift.noResponseRate
    );
    expect(extremes.best?.key).toBe("MANHÃ");
    expect(extremes.worst?.key).toBe("NOITE");
  });
});

describe("weekend comparison", () => {
  it("preserves the dashboard record base and calculates pp difference", () => {
    const result = summarizeWeekendVsWeekday([
      temporal("Segunda", 100, 30, 140),
      temporal("Sábado", 50, 25, 90),
      temporal("Domingo", 50, 15, 80),
    ]);
    expect(result.weekdays?.noResponseRate).toBe(21.4);
    expect(result.weekend?.noResponseRate).toBe(23.5);
    expect(result.differencePercentagePoints).toBe(2.1);
    expect(result.weekendIsWorse).toBe(true);
    expect(result.weekendIsProblem).toBe(false);
  });

  it("does not claim weekend is worse when its rate is lower", () => {
    const result = summarizeWeekendVsWeekday([
      temporal("Segunda", 100, 40),
      temporal("Sábado", 50, 10),
    ]);
    expect(result.differencePercentagePoints).toBe(-20);
    expect(result.weekendIsWorse).toBe(false);
    expect(result.weekendIsProblem).toBe(false);
  });
});

describe("no-response reasons", () => {
  it("calculates dynamic reason shares", () => {
    const reasons = buildNoResponseReasons({
      available: true,
      totalNoReturn: 100,
      unidadeNaoRespondeu: 65,
      semContatoTelefonico: 20,
      semInformacao: 15,
    });
    expect(reasons.map((reason) => reason.percentage)).toEqual([65, 20, 15]);
  });

  it("hides unavailable reasons", () => {
    expect(
      buildNoResponseReasons({
        available: false,
        totalNoReturn: 0,
        unidadeNaoRespondeu: 0,
        semContatoTelefonico: 0,
        semInformacao: 0,
      })
    ).toEqual([]);
  });
});

describe("unit contribution", () => {
  const units: UnitSummary[] = [
    {
      unit: "AHC",
      totalRecords: 200,
      auraAlerts: 100,
      unitActions: 40,
      favorableOutcomes: 30,
      closedLoopEffectivenessRate: 80,
      noReturnCases: 40,
    },
    {
      unit: "ABV",
      totalRecords: 120,
      auraAlerts: 50,
      unitActions: 30,
      favorableOutcomes: 20,
      closedLoopEffectivenessRate: 75,
      noReturnCases: 10,
    },
  ];

  it("sorts by absolute contribution and calculates share of gap", () => {
    const result = buildUnitNoResponseContribution(units);
    expect(result[0].unit).toBe("AHC");
    expect(result[0].noResponseRate).toBe(40);
    expect(result[0].shareOfAllNoResponses).toBe(80);
    expect(result[0].responseRate).toBe(60);
  });

  it("uses selected-unit mode instead of ranking one unit", () => {
    const report = buildExecutiveReportMetrics(
      response({ filteredRows: 100, units: [units[0]] }),
      { filters: { unit: "AHC" } }
    );
    expect(report.unitMode).toBe("selected");
    expect(report.selectedUnitPerformance?.unit).toBe("AHC");
    expect(report.displayedUnits).toEqual([]);
  });
});

describe("dynamic narratives and actions", () => {
  it("never emits undefined, NaN or Infinity", () => {
    const overview = {
      uniquePatients: 10,
      auraAlerts: 20,
      responses: 0,
      noResponse: 20,
      responseRate: 0,
      noResponseRate: 100,
      actions: 0,
      favorableOutcomes: 0,
      effectiveClosedCycles: 0,
      evaluatedClosedCycles: 0,
      closedCycleEffectivenessRate: null,
      registeredOutcomes: 0,
      registeredOutcomeRate: 0,
    };
    const clinicalImpact = {
      favorableOutcomes: 0,
      favorableOutcomesBase: "Base: registros",
      deteriorationReversals: 0,
      deteriorationReversalsBase: "Base: pacientes-dia",
      avoidedReadmissions: 0,
      avoidedReadmissionsBase: "Base: pacientes-dia",
    };
    const calendar = {
      available: false,
      weekend: null,
      weekdays: null,
      differencePercentagePoints: null,
      weekendIsWorse: false,
      weekendIsProblem: false,
    };
    const text = [
      buildDynamicExecutiveSummary({ overview, clinicalImpact }),
      buildDynamicOperationalSummary({
        overview,
        worstShift: null,
        calendar,
      }),
    ].join(" ");
    expect(text).not.toMatch(/undefined|null|NaN|Infinity/);
  });

  it("replaces weekend action when weekend is not a problem", () => {
    const actions = buildDynamicActionPlan({
      worstShift: null,
      calendar: {
        available: true,
        weekend: { name: "Fim de semana", total: 50, noResponse: 10, noResponseRate: 20 },
        weekdays: { name: "Dias úteis", total: 100, noResponse: 30, noResponseRate: 30 },
        differencePercentagePoints: -10,
        weekendIsWorse: false,
        weekendIsProblem: false,
      },
      topReason: {
        label: "Unidade não respondeu",
        count: 30,
        percentage: 75,
      },
      criticalUnit: null,
    });
    expect(actions).toHaveLength(3);
    expect(actions[2].title).toBe("Causa prioritária");
  });
});

describe("empty dataset", () => {
  it("produces a safe empty report model", () => {
    const report = buildExecutiveReportMetrics(response(), { filters: {} });
    expect(report.empty).toBe(true);
    expect(report.journey.largestDropStage).toBeNull();
    expect(report.actionPlan).toEqual([]);
    expect(report.executiveSummary).toContain("Nenhum dado");
  });
});
