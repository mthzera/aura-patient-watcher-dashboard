import type {
  DashboardFilters,
  DashboardResponse,
  TemporalBucket,
  UnitSummary,
} from "@/lib/dashboard/types";
import { SHIFT_ORDER } from "@/lib/dashboard/shift";
import { businessUnitLabel } from "@/lib/dashboard/businessUnit";
import {
  formatDate,
  formatDateTime,
  formatInteger,
  formatPercentage,
  formatPercentagePoints,
  ratePercentOneDecimal,
  safeDivide,
  truncateText,
} from "@/lib/dashboard/pdfFormat";

export const EXECUTIVE_REPORT_VERSION = "1.2";
export const MIN_SHIFT_SAMPLE = 20;
export const MIN_UNIT_SAMPLE = 30;
export const WEEKEND_RELEVANT_GAP_PP = 8;

const WEEKEND_LABELS = new Set(["Sábado", "Domingo"]);
const SHIFT_DISPLAY: Record<string, string> = {
  MANHÃ: "Manhã",
  TARDE: "Tarde",
  NOITE: "Noite",
  MADRUGADA: "Madrugada",
};

export interface ExecutiveReportMetaInput {
  filters: DashboardFilters;
  dataSource?: string;
  generatedAt?: Date;
}

export interface ExecutiveOverview {
  uniquePatients: number;
  auraAlerts: number;
  responses: number;
  noResponse: number;
  responseRate: number | null;
  noResponseRate: number | null;
  actions: number;
  favorableOutcomes: number;
  effectiveClosedCycles: number;
  evaluatedClosedCycles: number;
  closedCycleEffectivenessRate: number | null;
  registeredOutcomes: number;
  registeredOutcomeRate: number | null;
}

export type JourneyTransitionKey =
  | "alertsToResponses"
  | "responsesToActions"
  | "actionsToFavorableOutcomes";

export interface JourneyTransition {
  key: JourneyTransitionKey;
  label: string;
  numerator: number;
  denominator: number;
  rate: number | null;
}

export interface JourneyLargestDrop {
  key: JourneyTransitionKey;
  label: string;
  rate: number;
  dropPercentagePoints: number;
}

export interface ExecutiveJourney {
  alerts: number;
  responses: number;
  actions: number;
  favorableOutcomes: number;
  alertsToResponsesRate: number | null;
  responsesToActionsRate: number | null;
  actionsToFavorableOutcomesRate: number | null;
  transitions: JourneyTransition[];
  largestDropStage: JourneyLargestDrop | null;
}

export interface ExecutiveShiftBucket {
  name: string;
  key: string;
  totalRecords: number;
  totalAlerts: number;
  noResponse: number;
  noResponseRate: number | null;
  eligibleForComparison: boolean;
  sampleReduced: boolean;
  isWorst: boolean;
  isBest: boolean;
}

export interface ExecutiveDayGroup {
  name: string;
  total: number;
  noResponse: number;
  noResponseRate: number | null;
}

export interface ExecutiveNoResponseReason {
  label: string;
  count: number;
  percentage: number | null;
}

export interface ExecutiveUnitContribution {
  unit: string;
  totalAlerts: number;
  responses: number;
  noResponse: number;
  responseRate: number | null;
  noResponseRate: number | null;
  shareOfAllNoResponses: number | null;
  eligibleForComparison: boolean;
  sampleReduced: boolean;
}

export interface ExecutiveActionPriority {
  priority: number;
  title: string;
  problem: string;
  action: string;
  expectedResult: string;
}

export interface ExecutiveReportMetrics {
  empty: boolean;
  metadata: {
    period: string;
    businessUnit: string;
    unit: string;
    generatedAt: string;
    source: string;
    totalRecords: number;
    filteredRows: number;
    version: string;
    lastFetchAt: string | null;
  };
  overview: ExecutiveOverview;
  journey: ExecutiveJourney;
  clinicalImpact: {
    favorableOutcomes: number;
    favorableOutcomesBase: string;
    deteriorationReversals: number;
    deteriorationReversalsBase: string;
    avoidedReadmissions: number;
    avoidedReadmissionsBase: string;
  };
  quality: Array<{
    key: string;
    label: string;
    value: number | null;
    numerator: number;
    denominator: number;
  }>;
  shifts: ExecutiveShiftBucket[];
  shiftsAvailable: boolean;
  worstShift: ExecutiveShiftBucket | null;
  bestShift: ExecutiveShiftBucket | null;
  shiftConclusion: string | null;
  overallNoResponseRate: number | null;
  calendar: {
    available: boolean;
    weekend: ExecutiveDayGroup | null;
    weekdays: ExecutiveDayGroup | null;
    differencePercentagePoints: number | null;
    weekendIsWorse: boolean;
    weekendIsProblem: boolean;
  };
  noResponseReasons: ExecutiveNoResponseReason[];
  noResponseReasonsAvailable: boolean;
  units: ExecutiveUnitContribution[];
  displayedUnits: ExecutiveUnitContribution[];
  unitMode: "ranking" | "selected" | "hidden";
  selectedUnitPerformance: ExecutiveUnitContribution | null;
  insights: {
    mainOperationalGap: JourneyLargestDrop | null;
    criticalUnit: ExecutiveUnitContribution | null;
  };
  executiveSummary: string;
  operationalSummary: string;
  executiveConclusion: string | null;
  actionPlan: ExecutiveActionPriority[];
}

function percentageOrNull(numerator: number, denominator: number): number | null {
  const ratio = safeDivide(numerator, denominator);
  return ratio == null ? null : Math.round(ratio * 1000) / 10;
}

function periodLabel(filters: DashboardFilters): string {
  if (filters.startDate || filters.endDate) {
    return `${filters.startDate ? formatDate(filters.startDate) : "início"} – ${
      filters.endDate ? formatDate(filters.endDate) : "hoje"
    }`;
  }
  return "Todos os registros";
}

function unitLabel(unit: string | undefined): string {
  return unit ? truncateText(unit, 48) : "Todas as unidades";
}

export function getEligibleBestAndWorst<T>(
  items: T[],
  minimumSample: number,
  getSample: (item: T) => number,
  getRate: (item: T) => number | null
): { best: T | null; worst: T | null } {
  const eligible = items.filter((item) => {
    const rate = getRate(item);
    return getSample(item) >= minimumSample && rate != null && Number.isFinite(rate);
  });
  if (eligible.length === 0) return { best: null, worst: null };

  let best = eligible[0];
  let worst = eligible[0];
  for (const item of eligible.slice(1)) {
    const rate = getRate(item)!;
    if (rate < getRate(best)!) best = item;
    if (rate > getRate(worst)!) worst = item;
  }
  return { best, worst };
}

export function findLargestJourneyDrop(
  transitions: JourneyTransition[]
): JourneyLargestDrop | null {
  const available = transitions.filter(
    (item): item is JourneyTransition & { rate: number } =>
      item.rate != null && Number.isFinite(item.rate)
  );
  if (available.length === 0) return null;
  const largest = available.reduce((current, item) =>
    item.rate < current.rate ? item : current
  );
  return {
    key: largest.key,
    label: largest.label,
    rate: largest.rate,
    dropPercentagePoints: Math.max(0, Math.round((100 - largest.rate) * 10) / 10),
  };
}

function buildJourney(overview: ExecutiveOverview): ExecutiveJourney {
  const transitions: JourneyTransition[] = [
    {
      key: "alertsToResponses",
      label: "Taxa de resposta",
      numerator: overview.responses,
      denominator: overview.auraAlerts,
      rate: percentageOrNull(overview.responses, overview.auraAlerts),
    },
    {
      key: "responsesToActions",
      label: "Retornos que geraram ação",
      numerator: overview.actions,
      denominator: overview.responses,
      rate: percentageOrNull(overview.actions, overview.responses),
    },
    {
      key: "actionsToFavorableOutcomes",
      label: "Ações com desfecho favorável",
      numerator: overview.favorableOutcomes,
      denominator: overview.actions,
      rate: percentageOrNull(overview.favorableOutcomes, overview.actions),
    },
  ];

  return {
    alerts: overview.auraAlerts,
    responses: overview.responses,
    actions: overview.actions,
    favorableOutcomes: overview.favorableOutcomes,
    alertsToResponsesRate: transitions[0].rate,
    responsesToActionsRate: transitions[1].rate,
    actionsToFavorableOutcomesRate: transitions[2].rate,
    transitions,
    largestDropStage: findLargestJourneyDrop(transitions),
  };
}

function aggregateDayGroup(
  buckets: TemporalBucket[],
  name: string
): ExecutiveDayGroup | null {
  if (buckets.length === 0) return null;
  // Preserve the dashboard's current calendar-analysis base: all records.
  const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0);
  const noResponse = buckets.reduce((sum, bucket) => sum + bucket.noReturn, 0);
  if (total === 0) return null;
  return {
    name,
    total,
    noResponse,
    noResponseRate: percentageOrNull(noResponse, total),
  };
}

export function summarizeWeekendVsWeekday(byDayOfWeek: TemporalBucket[]): {
  weekend: ExecutiveDayGroup | null;
  weekdays: ExecutiveDayGroup | null;
  differencePercentagePoints: number | null;
  weekendIsWorse: boolean;
  weekendIsProblem: boolean;
} {
  const weekend = aggregateDayGroup(
    byDayOfWeek.filter((day) => WEEKEND_LABELS.has(day.label)),
    "Fim de semana"
  );
  const weekdays = aggregateDayGroup(
    byDayOfWeek.filter((day) => !WEEKEND_LABELS.has(day.label)),
    "Dias úteis"
  );
  const differencePercentagePoints =
    weekend?.noResponseRate != null && weekdays?.noResponseRate != null
      ? Math.round(
          (weekend.noResponseRate - weekdays.noResponseRate) * 10
        ) / 10
      : null;

  return {
    weekend,
    weekdays,
    differencePercentagePoints,
    weekendIsWorse:
      differencePercentagePoints != null && differencePercentagePoints > 0,
    weekendIsProblem:
      differencePercentagePoints != null &&
      differencePercentagePoints >= WEEKEND_RELEVANT_GAP_PP,
  };
}

export function buildNoResponseReasons(
  data: DashboardResponse["noReturnReasons"]
): ExecutiveNoResponseReason[] {
  if (!data.available || data.totalNoReturn <= 0) return [];
  return [
    { label: "Unidade não respondeu", count: data.unidadeNaoRespondeu },
    { label: "Sem contato telefônico", count: data.semContatoTelefonico },
    { label: "Sem informação / outros", count: data.semInformacao },
  ]
    .filter((reason) => reason.count > 0)
    .map((reason) => ({
      ...reason,
      percentage: percentageOrNull(reason.count, data.totalNoReturn),
    }));
}

export function buildUnitNoResponseContribution(
  units: UnitSummary[]
): ExecutiveUnitContribution[] {
  const totalNoResponses = units.reduce(
    (sum, unit) => sum + unit.noReturnCases,
    0
  );

  return units
    .filter((unit) => unit.auraAlerts > 0)
    .map((unit) => {
      const responses = Math.max(0, unit.auraAlerts - unit.noReturnCases);
      const eligibleForComparison = unit.auraAlerts >= MIN_UNIT_SAMPLE;
      return {
        unit: unit.unit,
        totalAlerts: unit.auraAlerts,
        responses,
        noResponse: unit.noReturnCases,
        responseRate: percentageOrNull(responses, unit.auraAlerts),
        noResponseRate: percentageOrNull(unit.noReturnCases, unit.auraAlerts),
        shareOfAllNoResponses: percentageOrNull(
          unit.noReturnCases,
          totalNoResponses
        ),
        eligibleForComparison,
        sampleReduced: !eligibleForComparison,
      };
    })
    .sort(
      (a, b) =>
        b.noResponse - a.noResponse || b.totalAlerts - a.totalAlerts
    );
}

export function buildDynamicExecutiveSummary(input: {
  overview: ExecutiveOverview;
  clinicalImpact: ExecutiveReportMetrics["clinicalImpact"];
}): string {
  const { overview, clinicalImpact } = input;
  const opening: string[] = [];
  if (overview.uniquePatients > 0) {
    opening.push(`${formatInteger(overview.uniquePatients)} pacientes`);
  }
  if (overview.auraAlerts > 0) {
    opening.push(`${formatInteger(overview.auraAlerts)} alertas clínicos`);
  }

  let summary =
    opening.length > 0
      ? `O AURA acompanhou ${opening.join(" e ")} no período.`
      : "O AURA acompanhou o recorte assistencial selecionado.";

  if (
    overview.closedCycleEffectivenessRate != null &&
    overview.evaluatedClosedCycles > 0
  ) {
    summary += ` Entre os ciclos avaliados, ${formatPercentage(
      overview.closedCycleEffectivenessRate
    )} foram fechados de forma efetiva.`;
  }

  const impact: string[] = [];
  if (clinicalImpact.favorableOutcomes > 0) {
    impact.push(
      `${formatInteger(clinicalImpact.favorableOutcomes)} desfechos favoráveis`
    );
  }
  if (clinicalImpact.deteriorationReversals > 0) {
    impact.push(
      `${formatInteger(clinicalImpact.deteriorationReversals)} reversões`
    );
  }
  if (clinicalImpact.avoidedReadmissions > 0) {
    impact.push(
      `${formatInteger(clinicalImpact.avoidedReadmissions)} reinternações evitadas`
    );
  }
  if (impact.length > 0) summary += ` Impacto observado: ${impact.join(", ")}.`;
  return summary;
}

export function buildDynamicOperationalSummary(input: {
  overview: ExecutiveOverview;
  worstShift: ExecutiveShiftBucket | null;
  calendar: ExecutiveReportMetrics["calendar"];
}): string {
  const { overview, worstShift, calendar } = input;
  if (overview.auraAlerts <= 0) {
    return "Não há alertas AURA suficientes para identificar oportunidades operacionais.";
  }

  let summary = `${formatInteger(
    overview.noResponse
  )} alertas ficaram sem retorno (${formatPercentage(
    overview.noResponseRate
  )} do total).`;

  if (worstShift?.noResponseRate != null) {
    summary += ` Entre os turnos com amostra suficiente, ${worstShift.name} apresentou a maior taxa (${formatPercentage(
      worstShift.noResponseRate
    )}).`;
  }

  if (
    calendar.differencePercentagePoints != null &&
    calendar.weekend?.noResponseRate != null &&
    calendar.weekdays?.noResponseRate != null
  ) {
    const direction = calendar.weekendIsWorse ? "maior" : "menor";
    summary += ` No fim de semana, a taxa foi ${formatPercentage(
      calendar.weekend.noResponseRate
    )}, ${formatPercentagePoints(
      Math.abs(calendar.differencePercentagePoints)
    )} ${direction} que nos dias úteis.`;
  }
  return summary;
}

function buildExecutiveConclusion(journey: ExecutiveJourney): string | null {
  if (
    journey.responsesToActionsRate == null ||
    journey.actionsToFavorableOutcomesRate == null
  ) {
    return null;
  }
  return `Quando há retorno da unidade, o processo mantém continuidade assistencial: ${formatPercentage(
    journey.responsesToActionsRate
  )} dos retornos geraram ação e ${formatPercentage(
    journey.actionsToFavorableOutcomesRate
  )} das ações tiveram desfecho favorável.`;
}

export function buildDynamicActionPlan(input: {
  worstShift: ExecutiveShiftBucket | null;
  calendar: ExecutiveReportMetrics["calendar"];
  topReason: ExecutiveNoResponseReason | null;
  criticalUnit: ExecutiveUnitContribution | null;
}): ExecutiveActionPriority[] {
  const actions: ExecutiveActionPriority[] = [];

  if (input.worstShift?.noResponseRate != null) {
    actions.push({
      priority: 1,
      title: "Turno crítico",
      problem: `${formatPercentage(
        input.worstShift.noResponseRate
      )} sem retorno no turno ${input.worstShift.name}.`,
      action:
        "Definir responsável e reforçar a validação dos alertas no turno.",
      expectedResult:
        "Reduzir alertas sem retorno e manter a continuidade.",
    });
  } else if (input.criticalUnit) {
    actions.push({
      priority: 1,
      title: "Concentração por unidade",
      problem: `${input.criticalUnit.unit} concentra ${formatPercentage(
        input.criticalUnit.shareOfAllNoResponses
      )} dos alertas sem retorno.`,
      action:
        "Pactuar meta de resposta e acompanhamento diário com a liderança.",
      expectedResult: "Reduzir o maior volume absoluto do gap.",
    });
  } else {
    actions.push({
      priority: 1,
      title: "Adesão inicial",
      problem: "Há alertas sem retorno no recorte analisado.",
      action:
        "Definir responsável por turno e revisar as pendências diariamente.",
      expectedResult: "Aumentar a taxa de resposta das unidades.",
    });
  }

  actions.push({
    priority: 2,
    title: "Passagem de plantão",
    problem: "Alertas podem permanecer abertos entre mudanças de equipe.",
    action:
      "Formalizar lista de pendências, responsável e prazo.",
    expectedResult: "Evitar perda de continuidade entre plantões.",
  });

  if (
    input.calendar.weekendIsProblem &&
    input.calendar.weekend?.noResponseRate != null &&
    input.calendar.differencePercentagePoints != null
  ) {
    actions.push({
      priority: 3,
      title: "Fim de semana",
      problem: `${formatPercentage(
        input.calendar.weekend.noResponseRate
      )} sem retorno, ${formatPercentagePoints(
        input.calendar.differencePercentagePoints
      )} acima dos dias úteis.`,
      action:
        "Revisar pendências no fim de semana e na segunda-feira.",
      expectedResult: "Reduzir o acúmulo fora dos dias úteis.",
    });
  } else if (input.topReason) {
    actions.push({
      priority: 3,
      title: "Causa prioritária",
      problem: `${input.topReason.label}: ${formatPercentage(
        input.topReason.percentage
      )} dos casos sem retorno.`,
      action:
        input.topReason.label === "Unidade não respondeu"
          ? "Escalonar alertas sem resposta e pactuar prazo de retorno."
          : "Revisar contatos e completar o motivo de não retorno.",
      expectedResult: "Atuar diretamente sobre a principal causa.",
    });
  } else if (input.criticalUnit) {
    actions.push({
      priority: 3,
      title: "Unidade prioritária",
      problem: `${input.criticalUnit.unit} responde por ${formatPercentage(
        input.criticalUnit.shareOfAllNoResponses
      )} do gap.`,
      action: "Executar plano focal com monitoramento semanal.",
      expectedResult: "Reduzir a concentração dos alertas sem retorno.",
    });
  } else {
    actions.push({
      priority: 3,
      title: "Qualidade do registro",
      problem: "O recorte não apresenta um concentrador operacional elegível.",
      action: "Manter revisão ativa e qualificar os desfechos.",
      expectedResult: "Aprimorar a rastreabilidade do ciclo assistencial.",
    });
  }

  return actions;
}

export function buildExecutiveReportMetrics(
  data: DashboardResponse,
  meta: ExecutiveReportMetaInput
): ExecutiveReportMetrics {
  const generatedAt = meta.generatedAt ?? new Date();
  const metrics = data.metrics;
  const empty = data.filteredRows === 0;

  const overview: ExecutiveOverview = {
    uniquePatients: metrics.uniquePatients,
    auraAlerts: metrics.auraAlerts,
    responses: metrics.alertsWithReturn,
    noResponse: metrics.auraAlertsNoReturn,
    responseRate:
      metrics.auraAlerts > 0 ? metrics.alertResponseRate : null,
    noResponseRate: percentageOrNull(
      metrics.auraAlertsNoReturn,
      metrics.auraAlerts
    ),
    actions: metrics.unitActions,
    favorableOutcomes: metrics.favorableOutcomes,
    effectiveClosedCycles: metrics.closedLoopEffectivenessNumerator,
    evaluatedClosedCycles: metrics.closedLoopEffectivenessDenominator,
    closedCycleEffectivenessRate:
      metrics.closedLoopEffectivenessDenominator > 0
        ? metrics.closedLoopEffectivenessRate
        : null,
    registeredOutcomes: metrics.registeredOutcomesAuraAlerts,
    registeredOutcomeRate:
      metrics.auraAlerts > 0
        ? ratePercentOneDecimal(
            metrics.registeredOutcomesAuraAlerts,
            metrics.auraAlerts
          )
        : null,
  };

  const journey = buildJourney(overview);
  const clinicalImpact = {
    favorableOutcomes: metrics.favorableOutcomes,
    favorableOutcomesBase: "Base: registros",
    deteriorationReversals: data.decompensation.deteriorationReversals,
    deteriorationReversalsBase: "Base: pacientes-dia",
    avoidedReadmissions: data.decompensation.avoidedReadmissions,
    avoidedReadmissionsBase: "Base: pacientes-dia",
  };

  const quality = [
    {
      key: "registeredOutcomes",
      label: "Desfechos registrados",
      value: overview.registeredOutcomeRate,
      numerator: overview.registeredOutcomes,
      denominator: overview.auraAlerts,
    },
    {
      key: "returnsWithAction",
      label: "Retornos com ação",
      value: journey.responsesToActionsRate,
      numerator: overview.actions,
      denominator: overview.responses,
    },
    {
      key: "actionsWithFavorableOutcome",
      label: "Ações com desfecho favorável",
      value: journey.actionsToFavorableOutcomesRate,
      numerator: overview.favorableOutcomes,
      denominator: overview.actions,
    },
  ].filter((item) => item.value != null && item.denominator > 0);

  const shiftMap = new Map(
    data.responsiveness.byShift.map((bucket) => [bucket.label, bucket])
  );
  const shifts: ExecutiveShiftBucket[] = SHIFT_ORDER.flatMap((key) => {
    const bucket = shiftMap.get(key);
    if (!bucket) return [];
    const totalAlerts = bucket.auraAlerts;
    const eligibleForComparison = totalAlerts >= MIN_SHIFT_SAMPLE;
    return [
      {
        name: SHIFT_DISPLAY[key] ?? key,
        key,
        totalRecords: bucket.total,
        totalAlerts,
        noResponse: bucket.noReturn,
        noResponseRate: percentageOrNull(bucket.noReturn, totalAlerts),
        eligibleForComparison,
        sampleReduced: !eligibleForComparison,
        isWorst: false,
        isBest: false,
      },
    ];
  });

  const shiftExtremes = getEligibleBestAndWorst(
    shifts,
    MIN_SHIFT_SAMPLE,
    (shift) => shift.totalAlerts,
    (shift) => shift.noResponseRate
  );
  const shiftsWithFlags = shifts.map((shift) => ({
    ...shift,
    isWorst: shiftExtremes.worst?.key === shift.key,
    isBest: shiftExtremes.best?.key === shift.key,
  }));
  const worstShift =
    shiftsWithFlags.find((shift) => shift.isWorst) ?? null;
  const bestShift = shiftsWithFlags.find((shift) => shift.isBest) ?? null;
  const shiftDifference =
    worstShift?.noResponseRate != null && bestShift?.noResponseRate != null
      ? Math.round(
          (worstShift.noResponseRate - bestShift.noResponseRate) * 10
        ) / 10
      : null;
  const shiftConclusion =
    worstShift && bestShift && shiftDifference != null
      ? `${worstShift.name} apresenta ${formatPercentage(
          worstShift.noResponseRate
        )} sem retorno, ${formatPercentagePoints(
          shiftDifference
        )} acima de ${bestShift.name}, melhor turno elegível (${formatPercentage(
          bestShift.noResponseRate
        )}).`
      : null;

  const calendarSummary = summarizeWeekendVsWeekday(
    data.responsiveness.byDayOfWeek
  );
  const calendar = {
    available:
      calendarSummary.weekend != null && calendarSummary.weekdays != null,
    ...calendarSummary,
  };

  const noResponseReasons = buildNoResponseReasons(data.noReturnReasons);
  const units = buildUnitNoResponseContribution(data.unitSummaries);
  const eligibleUnits = units.filter((unit) => unit.eligibleForComparison);
  const selectedUnitPerformance = meta.filters.unit
    ? units.find(
        (unit) =>
          unit.unit.trim().toLowerCase() ===
          meta.filters.unit!.trim().toLowerCase()
      ) ?? units[0] ?? null
    : units.length === 1
      ? units[0]
      : null;
  const unitMode: ExecutiveReportMetrics["unitMode"] = selectedUnitPerformance
    ? "selected"
    : eligibleUnits.length > 1
      ? "ranking"
      : "hidden";
  const displayedUnits =
    unitMode === "ranking" ? eligibleUnits.slice(0, 3) : [];
  const criticalUnit = eligibleUnits[0] ?? null;

  const reportBase = {
    overview,
    clinicalImpact,
    calendar,
  };
  const topReason = noResponseReasons[0]
    ? [...noResponseReasons].sort((a, b) => b.count - a.count)[0]
    : null;

  return {
    empty,
    metadata: {
      period: periodLabel(meta.filters),
      businessUnit: businessUnitLabel(meta.filters.businessUnit),
      unit: unitLabel(meta.filters.unit),
      generatedAt: formatDateTime(generatedAt),
      source: "Dashboard AURA Patient Watcher",
      totalRecords: data.totalRows,
      filteredRows: data.filteredRows,
      version: EXECUTIVE_REPORT_VERSION,
      lastFetchAt: data.lastFetchAt
        ? formatDateTime(new Date(data.lastFetchAt))
        : null,
    },
    overview,
    journey,
    clinicalImpact,
    quality,
    shifts: shiftsWithFlags,
    shiftsAvailable: shiftsWithFlags.length > 0,
    worstShift,
    bestShift,
    shiftConclusion,
    overallNoResponseRate: overview.noResponseRate,
    calendar,
    noResponseReasons,
    noResponseReasonsAvailable: noResponseReasons.length > 0,
    units,
    displayedUnits,
    unitMode,
    selectedUnitPerformance,
    insights: {
      mainOperationalGap: journey.largestDropStage,
      criticalUnit,
    },
    executiveSummary: empty
      ? "Nenhum dado encontrado para os filtros selecionados."
      : buildDynamicExecutiveSummary(reportBase),
    operationalSummary: empty
      ? "Nenhum dado encontrado para os filtros selecionados."
      : buildDynamicOperationalSummary({
          overview,
          worstShift,
          calendar,
        }),
    executiveConclusion: buildExecutiveConclusion(journey),
    actionPlan: empty
      ? []
      : buildDynamicActionPlan({
          worstShift,
          calendar,
          topReason,
          criticalUnit,
        }),
  };
}
