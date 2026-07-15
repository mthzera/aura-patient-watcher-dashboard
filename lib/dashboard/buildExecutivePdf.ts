import { jsPDF } from "jspdf";
import type { DashboardFilters, DashboardResponse } from "@/lib/dashboard/types";
import {
  buildExecutiveReportMetrics,
  type ExecutiveActionPriority,
  type ExecutiveReportMetrics,
  type ExecutiveUnitContribution,
} from "@/lib/dashboard/buildExecutiveReportMetrics";
import {
  formatInteger,
  formatPercentage,
  formatPercentagePoints,
} from "@/lib/dashboard/pdfFormat";

export interface ExecutivePdfMeta {
  filters: DashboardFilters;
  dataSource?: string;
  generatedAt?: Date;
}

type Rgb = [number, number, number];
type Tone = "positive" | "informative" | "attention" | "critical" | "neutral";

const COLORS = {
  navy: [15, 40, 70] as Rgb,
  navyText: [20, 45, 75] as Rgb,
  teal: [13, 148, 136] as Rgb,
  tealLight: [236, 253, 250] as Rgb,
  blue: [37, 99, 235] as Rgb,
  blueLight: [239, 246, 255] as Rgb,
  orange: [217, 119, 6] as Rgb,
  orangeLight: [255, 247, 237] as Rgb,
  red: [185, 28, 28] as Rgb,
  gray50: [248, 250, 252] as Rgb,
  gray100: [241, 245, 249] as Rgb,
  gray200: [226, 232, 240] as Rgb,
  gray300: [203, 213, 225] as Rgb,
  gray500: [100, 116, 139] as Rgb,
  gray600: [71, 85, 105] as Rgb,
  white: [255, 255, 255] as Rgb,
} as const;

const LAYOUT = {
  pageWidth: 297,
  pageHeight: 210,
  margin: 10,
  gapSmall: 3,
  gapMedium: 5,
  gapLarge: 8,
  headerHeight: 22,
  footerHeight: 16,
  contentTop: 26,
  contentBottom: 190,
  contentWidth: 277,
  contentHeight: 164,
} as const;

const TONE_COLORS: Record<Tone, { accent: Rgb; background: Rgb }> = {
  positive: { accent: COLORS.teal, background: COLORS.tealLight },
  informative: { accent: COLORS.blue, background: COLORS.blueLight },
  attention: { accent: COLORS.orange, background: COLORS.orangeLight },
  critical: { accent: COLORS.red, background: COLORS.orangeLight },
  neutral: { accent: COLORS.navyText, background: COLORS.gray50 },
};

function setText(doc: jsPDF, size: number, color: Rgb, bold = false): void {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
}

function fitText(
  doc: jsPDF,
  value: string,
  maxWidth: number,
  fontSize: number
): string {
  const safe = value || "-";
  doc.setFontSize(fontSize);
  if (doc.getTextWidth(safe) <= maxWidth) return safe;
  let text = safe;
  while (text.length > 1 && doc.getTextWidth(`${text}...`) > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text.trimEnd()}...`;
}

function splitLimited(
  doc: jsPDF,
  value: string,
  maxWidth: number,
  maxLines: number
): string[] {
  return (doc.splitTextToSize(value || "-", maxWidth) as string[]).slice(
    0,
    maxLines
  );
}

function sectionTitle(
  doc: jsPDF,
  title: string,
  x: number,
  y: number,
  tone: Tone = "neutral"
): void {
  const color = TONE_COLORS[tone].accent;
  doc.setFillColor(...color);
  doc.rect(x, y - 2.5, 1.3, 3.4, "F");
  setText(doc, 10.5, COLORS.navyText, true);
  doc.text(title, x + 3.5, y);
}

function drawStatusBadge(
  doc: jsPDF,
  label: string,
  right: number,
  y: number,
  tone: Tone
): void {
  const { accent, background } = TONE_COLORS[tone];
  setText(doc, 6.5, accent, true);
  const width = doc.getTextWidth(label) + 5;
  const x = right - width;
  doc.setFillColor(...background);
  doc.roundedRect(x, y, width, 5, 1, 1, "F");
  doc.text(label, x + 2.5, y + 3.4);
}

function ExecutiveHeader(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  subtitle: string
): void {
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, LAYOUT.pageWidth, LAYOUT.headerHeight, "F");
  doc.setFillColor(...COLORS.teal);
  doc.rect(0, LAYOUT.headerHeight - 1, LAYOUT.pageWidth, 1, "F");

  setText(doc, 20, COLORS.white, true);
  doc.text("AURA Patient Watcher", LAYOUT.margin, 9.5);
  setText(doc, 10, [186, 230, 253]);
  doc.text(subtitle, LAYOUT.margin, 16);

  const right = LAYOUT.pageWidth - LAYOUT.margin;
  const metadata = [
    `Período: ${report.metadata.period}`,
    `Negócio: ${report.metadata.businessUnit} | Unidade: ${report.metadata.unit}`,
    `Gerado em: ${report.metadata.generatedAt}`,
  ];
  setText(doc, 7.5, COLORS.gray200);
  metadata.forEach((line, index) => {
    doc.text(fitText(doc, line, 105, 7.5), right, 6 + index * 5, {
      align: "right",
    });
  });
}

function ExecutiveFooter(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  page: number,
  totalPages: number
): void {
  const top = LAYOUT.pageHeight - LAYOUT.footerHeight;
  doc.setDrawColor(...COLORS.gray300);
  doc.setLineWidth(0.25);
  doc.line(
    LAYOUT.margin,
    top,
    LAYOUT.pageWidth - LAYOUT.margin,
    top
  );

  const update = report.metadata.lastFetchAt ?? report.metadata.generatedAt;
  const source = `Fonte: Dashboard AURA Patient Watcher | Atualização: ${update} | ${formatInteger(
    report.metadata.filteredRows
  )} registros`;
  const version = `v${report.metadata.version} | ${page} de ${totalPages}`;

  setText(doc, 7, COLORS.gray600);
  doc.text(
    fitText(doc, source, LAYOUT.contentWidth - 32, 7),
    LAYOUT.margin,
    top + 5
  );
  setText(doc, 7, COLORS.navyText, true);
  doc.text(version, LAYOUT.pageWidth - LAYOUT.margin, top + 5, {
    align: "right",
  });

  setText(doc, 7, COLORS.gray500);
  doc.text(
    "Indicadores podem utilizar bases distintas: alertas, pacientes únicos ou pacientes-dia.",
    LAYOUT.margin,
    top + 11
  );
}

function ExecutiveSummaryBox(
  doc: jsPDF,
  title: string,
  text: string,
  y: number,
  tone: "positive" | "attention"
): number {
  const { accent, background } = TONE_COLORS[tone];
  const height = 20;
  doc.setFillColor(...background);
  doc.roundedRect(
    LAYOUT.margin,
    y,
    LAYOUT.contentWidth,
    height,
    1.5,
    1.5,
    "F"
  );
  doc.setFillColor(...accent);
  doc.rect(LAYOUT.margin, y, 1.5, height, "F");
  setText(doc, 8, accent, true);
  doc.text(title.toUpperCase(), LAYOUT.margin + 5, y + 5);
  setText(doc, 8.5, COLORS.navyText);
  doc.text(
    splitLimited(doc, text, LAYOUT.contentWidth - 10, 3),
    LAYOUT.margin + 5,
    y + 10
  );
  return y + height;
}

function PrimaryKpiCard(
  doc: jsPDF,
  input: {
    x: number;
    y: number;
    width: number;
    label: string;
    value: string;
    detail: string;
    status: string;
    tone: Tone;
    emphasized?: boolean;
  }
): void {
  const { accent, background } = TONE_COLORS[input.tone];
  const height = 27;
  doc.setFillColor(...background);
  doc.roundedRect(input.x, input.y, input.width, height, 1.2, 1.2, "F");
  doc.setFillColor(...accent);
  doc.rect(input.x, input.y, 1.3, height, "F");

  setText(doc, 7.5, COLORS.gray600, true);
  doc.text(
    fitText(doc, input.label.toUpperCase(), input.width - 17, 7.5),
    input.x + 4,
    input.y + 6
  );
  setText(doc, input.emphasized ? 25 : 22, accent, true);
  doc.text(input.value, input.x + 4, input.y + 17);
  setText(doc, 7.5, COLORS.gray600);
  doc.text(
    fitText(doc, input.detail, input.width - 8, 7.5),
    input.x + 4,
    input.y + 23
  );
  drawStatusBadge(
    doc,
    input.status,
    input.x + input.width - 3,
    input.y + 2.5,
    input.tone
  );
}

function drawVectorArrow(
  doc: jsPDF,
  x1: number,
  x2: number,
  y: number,
  color: Rgb
): void {
  doc.setDrawColor(...color);
  doc.setFillColor(...color);
  doc.setLineWidth(0.7);
  doc.line(x1, y, x2 - 2.5, y);
  doc.triangle(x2 - 2.5, y - 1.6, x2, y, x2 - 2.5, y + 1.6, "F");
}

function JourneyStage(
  doc: jsPDF,
  input: {
    x: number;
    y: number;
    width: number;
    value: number;
    label: string;
    final?: boolean;
  }
): void {
  doc.setFillColor(...(input.final ? COLORS.tealLight : COLORS.gray50));
  doc.roundedRect(input.x, input.y, input.width, 28, 1.2, 1.2, "F");
  setText(
    doc,
    20,
    input.final ? COLORS.teal : COLORS.navyText,
    true
  );
  doc.text(formatInteger(input.value), input.x + input.width / 2, input.y + 12, {
    align: "center",
  });
  setText(doc, 8, COLORS.gray600, true);
  doc.text(fitText(doc, input.label, input.width - 5, 8), input.x + input.width / 2, input.y + 20, {
    align: "center",
  });
}

function JourneyFlow(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  y: number
): number {
  sectionTitle(doc, "Jornada assistencial", LAYOUT.margin, y);
  const boxY = y + 4;
  const boxHeight = 38;
  doc.setFillColor(...COLORS.white);
  doc.setDrawColor(...COLORS.gray200);
  doc.roundedRect(
    LAYOUT.margin,
    boxY,
    LAYOUT.contentWidth,
    boxHeight,
    1.2,
    1.2,
    "FD"
  );

  const stageWidth = 48;
  const connectorWidth =
    (LAYOUT.contentWidth - stageWidth * 4 - 8) / 3;
  const stages = [
    { value: report.journey.alerts, label: "Alertas AURA" },
    { value: report.journey.responses, label: "Retornos" },
    { value: report.journey.actions, label: "Ações realizadas" },
    {
      value: report.journey.favorableOutcomes,
      label: "Desfechos favoráveis",
      final: true,
    },
  ];

  let x = LAYOUT.margin + 4;
  stages.forEach((stage, index) => {
    JourneyStage(doc, {
      x,
      y: boxY + 5,
      width: stageWidth,
      ...stage,
    });
    if (index < 3) {
      const transition = report.journey.transitions[index];
      const connectorX = x + stageWidth;
      const largest =
        report.journey.largestDropStage?.key === transition.key;
      const color = largest ? COLORS.orange : COLORS.teal;
      const center = connectorX + connectorWidth / 2;

      setText(doc, 7.2, color, true);
      const rateLabel =
        transition.rate == null
          ? "Dados insuficientes"
          : formatPercentage(transition.rate);
      const label =
        transition.key === "alertsToResponses"
          ? ["Taxa de resposta", rateLabel]
          : transition.key === "responsesToActions"
            ? ["Retornos que", "geraram ação", rateLabel]
            : ["Ações com desfecho", "favorável", rateLabel];
      doc.text(
        label,
        center,
        boxY + 9,
        { align: "center" }
      );
      drawVectorArrow(
        doc,
        connectorX + 3,
        connectorX + connectorWidth - 3,
        boxY + 22,
        color
      );
      if (largest) {
        setText(doc, 6.5, COLORS.orange, true);
        doc.text("MAIOR PERDA", center, boxY + 31, { align: "center" });
      }
      x += stageWidth + connectorWidth;
    }
  });

  return boxY + boxHeight;
}

function ClinicalImpactCard(
  doc: jsPDF,
  input: {
    x: number;
    y: number;
    width: number;
    label: string;
    value: number;
    base: string;
    emphasized: boolean;
  }
): void {
  doc.setFillColor(
    ...(input.emphasized ? COLORS.tealLight : COLORS.gray50)
  );
  doc.roundedRect(input.x, input.y, input.width, 27, 1.2, 1.2, "F");
  setText(doc, 7.5, COLORS.gray600, true);
  doc.text(
    fitText(doc, input.label.toUpperCase(), input.width - 6, 7.5),
    input.x + 3,
    input.y + 6
  );
  setText(
    doc,
    input.emphasized ? 20 : 18,
    input.emphasized ? COLORS.teal : COLORS.navyText,
    true
  );
  doc.text(formatInteger(input.value), input.x + 3, input.y + 16);
  setText(doc, 7, COLORS.gray500);
  doc.text(input.base, input.x + 3, input.y + 23);
}

function SecondaryMetric(
  doc: jsPDF,
  input: {
    x: number;
    y: number;
    width: number;
    label: string;
    value: number | null;
    numerator: number;
    denominator: number;
  }
): void {
  setText(doc, 7.5, COLORS.gray600, true);
  doc.text(
    fitText(doc, input.label.toUpperCase(), input.width - 22, 7.5),
    input.x,
    input.y
  );
  setText(doc, 9, COLORS.navyText, true);
  doc.text(formatPercentage(input.value), input.x + input.width, input.y, {
    align: "right",
  });
  const rate = Math.max(0, Math.min(100, input.value ?? 0));
  doc.setFillColor(...COLORS.gray200);
  doc.roundedRect(input.x, input.y + 2.5, input.width, 2.5, 0.6, 0.6, "F");
  doc.setFillColor(...COLORS.teal);
  doc.roundedRect(
    input.x,
    input.y + 2.5,
    (input.width * rate) / 100,
    2.5,
    0.6,
    0.6,
    "F"
  );
  setText(doc, 7, COLORS.gray500);
  doc.text(
    `${formatInteger(input.numerator)} de ${formatInteger(input.denominator)}`,
    input.x,
    input.y + 8
  );
}

function ImpactAndQuality(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  y: number
): number {
  const leftWidth = 148;
  const rightX = LAYOUT.margin + leftWidth + LAYOUT.gapMedium;
  const rightWidth = LAYOUT.contentWidth - leftWidth - LAYOUT.gapMedium;

  sectionTitle(doc, "Impacto clínico", LAYOUT.margin, y, "positive");
  sectionTitle(doc, "Qualidade do acompanhamento", rightX, y, "informative");
  const contentY = y + 4;
  const cardGap = 3;
  const cardWidth = (leftWidth - cardGap * 2) / 3;
  const impact = [
    {
      label: "Desfechos favoráveis",
      value: report.clinicalImpact.favorableOutcomes,
      base: report.clinicalImpact.favorableOutcomesBase,
      emphasized: false,
    },
    {
      label: "Reversões",
      value: report.clinicalImpact.deteriorationReversals,
      base: report.clinicalImpact.deteriorationReversalsBase,
      emphasized: true,
    },
    {
      label: "Reinternações evitadas",
      value: report.clinicalImpact.avoidedReadmissions,
      base: report.clinicalImpact.avoidedReadmissionsBase,
      emphasized: true,
    },
  ];
  impact.forEach((item, index) =>
    ClinicalImpactCard(doc, {
      x: LAYOUT.margin + index * (cardWidth + cardGap),
      y: contentY,
      width: cardWidth,
      ...item,
    })
  );

  report.quality.slice(0, 2).forEach((metric, index) =>
    SecondaryMetric(doc, {
      x: rightX,
      y: contentY + 5 + index * 13,
      width: rightWidth,
      ...metric,
    })
  );
  return contentY + 27;
}

function ExecutiveConclusion(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  y: number
): void {
  if (!report.executiveConclusion) return;
  doc.setFillColor(...COLORS.blueLight);
  doc.roundedRect(LAYOUT.margin, y, LAYOUT.contentWidth, 15, 1, 1, "F");
  setText(doc, 7.5, COLORS.blue, true);
  doc.text("CONCLUSÃO EXECUTIVA", LAYOUT.margin + 4, y + 5);
  setText(doc, 8.2, COLORS.navyText);
  doc.text(
    splitLimited(doc, report.executiveConclusion, LAYOUT.contentWidth - 8, 2),
    LAYOUT.margin + 4,
    y + 10
  );
}

function AttentionKpis(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  y: number
): number {
  sectionTitle(doc, "Pontos de atenção", LAYOUT.margin, y, "attention");
  const cardY = y + 4;
  const gap = 4;
  const width = (LAYOUT.contentWidth - gap * 2) / 3;
  const weekend = report.calendar.weekend;
  const cards = [
    {
      label: "Alertas sem retorno",
      value: formatInteger(report.overview.noResponse),
      detail:
        report.overview.noResponseRate == null
          ? "Dados insuficientes"
          : `${formatPercentage(
              report.overview.noResponseRate
            )} dos alertas AURA`,
      tone: "critical" as Tone,
      status: "GAP",
    },
    {
      label: "Turno mais crítico",
      value: report.worstShift?.name ?? "Dados insuficientes",
      detail:
        report.worstShift?.noResponseRate == null
          ? "Sem amostra elegível"
          : `${formatPercentage(
              report.worstShift.noResponseRate
            )} sem retorno`,
      tone: "attention" as Tone,
      status: report.worstShift ? "PRIORIDADE" : "SEM AMOSTRA",
    },
    {
      label: "Fim de semana",
      value:
        weekend?.noResponseRate == null
          ? "Dados insuficientes"
          : formatPercentage(weekend.noResponseRate),
      detail:
        report.calendar.weekdays?.noResponseRate == null
          ? "Sem comparação disponível"
          : `Dias úteis: ${formatPercentage(
              report.calendar.weekdays.noResponseRate
            )}`,
      tone: report.calendar.weekendIsProblem
        ? ("attention" as Tone)
        : ("informative" as Tone),
      status: report.calendar.weekendIsProblem ? "ATENÇÃO" : "COMPARATIVO",
    },
  ];

  cards.forEach((card, index) =>
    PrimaryKpiCard(doc, {
      x: LAYOUT.margin + index * (width + gap),
      y: cardY,
      width,
      emphasized: index === 0,
      ...card,
    })
  );
  return cardY + 27;
}

function HorizontalRateBar(
  doc: jsPDF,
  input: {
    x: number;
    y: number;
    width: number;
    label: string;
    rate: number | null;
    detail: string;
    tone: Tone;
    sampleReduced?: boolean;
    labelWidth?: number;
    detailWidth?: number;
  }
): void {
  const rate = Math.max(0, Math.min(100, input.rate ?? 0));
  const labelWidth = input.labelWidth ?? 27;
  const detailWidth = input.detailWidth ?? 47;
  const barWidth = input.width - labelWidth - detailWidth;
  setText(doc, 7.5, COLORS.navyText, true);
  doc.text(
    fitText(doc, input.label, labelWidth - 2, 7.5),
    input.x,
    input.y + 2.8
  );
  doc.setFillColor(...COLORS.gray200);
  doc.roundedRect(
    input.x + labelWidth,
    input.y,
    barWidth,
    4,
    0.8,
    0.8,
    "F"
  );
  doc.setFillColor(...TONE_COLORS[input.tone].accent);
  doc.roundedRect(
    input.x + labelWidth,
    input.y,
    (barWidth * rate) / 100,
    4,
    0.8,
    0.8,
    "F"
  );
  setText(doc, 7.2, COLORS.gray600);
  doc.text(
    fitText(doc, input.detail, detailWidth - 2, 7.2),
    input.x + input.width,
    input.y + 2.8,
    { align: "right" }
  );
  if (input.sampleReduced) {
    setText(doc, 6.5, COLORS.orange);
    doc.text("Amostra reduzida", input.x + labelWidth, input.y + 7);
  }
}

function ShiftAnalysis(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  x: number,
  y: number,
  width: number
): void {
  sectionTitle(doc, "Sem retorno por turno", x, y, "attention");
  if (report.shiftConclusion) {
    setText(doc, 6.8, COLORS.gray600);
    doc.text(
      fitText(doc, report.shiftConclusion, width - 62, 6.8),
      x + width,
      y,
      { align: "right" }
    );
  }
  const boxY = y + 4;
  const height = 40;
  doc.setFillColor(...COLORS.gray50);
  doc.roundedRect(x, boxY, width, height, 1.2, 1.2, "F");

  if (!report.shiftsAvailable) {
    setText(doc, 8, COLORS.gray600);
    doc.text(
      splitLimited(
        doc,
        "Dados por turno ausentes. Priorize a leitura por unidade e período.",
        width - 8,
        2
      ),
      x + 4,
      boxY + 18
    );
    return;
  }

  if (report.overallNoResponseRate != null) {
    const innerWidth = width - 8;
    const barWidth = innerWidth - 27 - 47;
    const referenceX =
      x +
      4 +
      27 +
      (barWidth * Math.max(0, Math.min(100, report.overallNoResponseRate))) /
        100;
    doc.setDrawColor(...COLORS.gray500);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([1, 1], 0);
    doc.line(referenceX, boxY + 3, referenceX, boxY + 32);
    doc.setLineDashPattern([], 0);
    setText(doc, 6.5, COLORS.gray500);
    doc.text(
      `Média ${formatPercentage(report.overallNoResponseRate)}`,
      referenceX,
      boxY + 37,
      { align: "center" }
    );
  }

  report.shifts.forEach((shift, index) => {
    const detail =
      shift.noResponseRate == null
        ? "Dados insuficientes"
        : `${formatInteger(shift.noResponse)} de ${formatInteger(
            shift.totalAlerts
          )} | ${formatPercentage(shift.noResponseRate)}`;
    HorizontalRateBar(doc, {
      x: x + 4,
      y: boxY + 4 + index * 7,
      width: width - 8,
      label: shift.name,
      rate: shift.noResponseRate,
      detail,
      tone: shift.isWorst ? "attention" : "informative",
      sampleReduced: shift.sampleReduced,
    });
  });

}

function NoResponseReasons(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  x: number,
  y: number,
  width: number
): void {
  sectionTitle(doc, "Principais causas do não retorno", x, y, "attention");
  const boxY = y + 4;
  doc.setFillColor(...COLORS.gray50);
  doc.roundedRect(x, boxY, width, 40, 1.2, 1.2, "F");
  report.noResponseReasons.slice(0, 3).forEach((reason, index) => {
    HorizontalRateBar(doc, {
      x: x + 4,
      y: boxY + 7 + index * 10,
      width: width - 8,
      label: reason.label,
      rate: reason.percentage,
      detail: `${formatInteger(reason.count)} | ${formatPercentage(
        reason.percentage
      )}`,
      tone: index === 0 ? "attention" : "informative",
      labelWidth: 38,
      detailWidth: 32,
    });
  });
}

function WeekendComparison(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  x: number,
  y: number,
  width: number
): void {
  sectionTitle(doc, "Fim de semana x dias úteis", x, y, "informative");
  const boxY = y + 4;
  doc.setFillColor(...COLORS.gray50);
  doc.roundedRect(x, boxY, width, 28, 1.2, 1.2, "F");
  const weekend = report.calendar.weekend;
  const weekdays = report.calendar.weekdays;
  if (!weekend || !weekdays) {
    setText(doc, 8, COLORS.gray600);
    doc.text("Dados de calendário insuficientes.", x + 4, boxY + 15);
    return;
  }

  const column = (width - 8) / 3;
  const entries = [
    {
      label: "FIM DE SEMANA",
      value: formatPercentage(weekend.noResponseRate),
      detail: `${formatInteger(weekend.noResponse)} de ${formatInteger(
        weekend.total
      )} registros`,
    },
    {
      label: "DIAS ÚTEIS",
      value: formatPercentage(weekdays.noResponseRate),
      detail: `${formatInteger(weekdays.noResponse)} de ${formatInteger(
        weekdays.total
      )} registros`,
    },
    {
      label: "DIFERENÇA",
      value: formatPercentagePoints(
        report.calendar.differencePercentagePoints == null
          ? null
          : Math.abs(report.calendar.differencePercentagePoints)
      ),
      detail: report.calendar.weekendIsWorse
        ? "fim de semana maior"
        : "fim de semana menor",
    },
  ];
  entries.forEach((entry, index) => {
    const itemX = x + 4 + index * column;
    setText(doc, 6.8, COLORS.gray600, true);
    doc.text(entry.label, itemX, boxY + 6);
    setText(
      doc,
      13,
      index === 2 && report.calendar.weekendIsProblem
        ? COLORS.orange
        : COLORS.navyText,
      true
    );
    doc.text(entry.value, itemX, boxY + 15);
    setText(doc, 6.8, COLORS.gray500);
    doc.text(fitText(doc, entry.detail, column - 3, 6.8), itemX, boxY + 22);
  });
}

function UnitContributionCard(
  doc: jsPDF,
  unit: ExecutiveUnitContribution,
  x: number,
  y: number,
  width: number
): void {
  doc.setFillColor(...COLORS.blueLight);
  doc.roundedRect(x, y, width, 20, 1, 1, "F");
  setText(doc, 8, COLORS.navyText, true);
  doc.text(fitText(doc, unit.unit, width - 6, 8), x + 3, y + 5);
  setText(doc, 7, COLORS.gray600);
  doc.text(
    `${formatInteger(unit.noResponse)} sem retorno de ${formatInteger(
      unit.totalAlerts
    )}`,
    x + 3,
    y + 10
  );
  doc.text(
    `${formatPercentage(unit.noResponseRate)} da unidade | ${formatPercentage(
      unit.shareOfAllNoResponses
    )} do gap`,
    x + 3,
    y + 15
  );
  if (unit.sampleReduced) {
    setText(doc, 6.5, COLORS.orange);
    doc.text("Amostra reduzida", x + 3, y + 19);
  }
}

function UnitAnalysis(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  x: number,
  y: number,
  width: number
): void {
  const selected = report.selectedUnitPerformance;
  sectionTitle(
    doc,
    selected
      ? "Desempenho da unidade selecionada"
      : "Concentração dos alertas sem retorno",
    x,
    y,
    "informative"
  );
  const boxY = y + 4;
  doc.setFillColor(...COLORS.gray50);
  doc.roundedRect(x, boxY, width, 28, 1.2, 1.2, "F");

  if (selected) {
    const cardWidth = Math.min(width - 8, 90);
    UnitContributionCard(doc, selected, x + 4, boxY + 4, cardWidth);
    setText(doc, 8, COLORS.navyText, true);
    doc.text(
      `Taxa de resposta: ${formatPercentage(selected.responseRate)}`,
      x + cardWidth + 9,
      boxY + 10
    );
    setText(doc, 7.2, COLORS.gray600);
    doc.text(
      `${formatInteger(selected.responses)} alertas com retorno`,
      x + cardWidth + 9,
      boxY + 17
    );
    return;
  }

  const units = report.displayedUnits;
  if (units.length === 0) {
    setText(doc, 8, COLORS.gray600);
    doc.text("Sem unidades com amostra mínima para comparação.", x + 4, boxY + 15);
    return;
  }
  const gap = 3;
  const cardWidth = (width - 8 - gap * (units.length - 1)) / units.length;
  units.forEach((unit, index) =>
    UnitContributionCard(
      doc,
      unit,
      x + 4 + index * (cardWidth + gap),
      boxY + 4,
      cardWidth
    )
  );
}

function ActionPriorityCard(
  doc: jsPDF,
  action: ExecutiveActionPriority,
  x: number,
  y: number,
  width: number
): void {
  doc.setFillColor(...COLORS.tealLight);
  doc.roundedRect(x, y, width, 20, 1.2, 1.2, "F");
  doc.setFillColor(...COLORS.teal);
  doc.rect(x, y, 1.2, 20, "F");
  setText(doc, 7.5, COLORS.teal, true);
  doc.text(
    `PRIORIDADE ${action.priority} - ${action.title.toUpperCase()}`,
    x + 4,
    y + 4.5
  );
  setText(doc, 6.8, COLORS.navyText);
  doc.text(
    fitText(doc, `Problema: ${action.problem}`, width - 8, 6.8),
    x + 4,
    y + 8.5
  );
  doc.text(
    fitText(doc, `Ação: ${action.action}`, width - 8, 6.8),
    x + 4,
    y + 13
  );
  doc.text(
    fitText(doc, `Resultado: ${action.expectedResult}`, width - 8, 6.8),
    x + 4,
    y + 17.5
  );
}

function ActionPlan(
  doc: jsPDF,
  report: ExecutiveReportMetrics,
  y: number
): void {
  sectionTitle(doc, "Plano de ação priorizado", LAYOUT.margin, y, "positive");
  const cardY = y + 4;
  const gap = 4;
  const width = (LAYOUT.contentWidth - gap * 2) / 3;
  report.actionPlan.slice(0, 3).forEach((action, index) =>
    ActionPriorityCard(
      doc,
      action,
      LAYOUT.margin + index * (width + gap),
      cardY,
      width
    )
  );
}

function EmptyState(doc: jsPDF, report: ExecutiveReportMetrics): void {
  ExecutiveHeader(
    doc,
    report,
    "Resumo Executivo de Efetividade Assistencial"
  );
  doc.setFillColor(...COLORS.gray50);
  doc.roundedRect(
    LAYOUT.margin,
    LAYOUT.contentTop,
    LAYOUT.contentWidth,
    48,
    2,
    2,
    "F"
  );
  setText(doc, 14, COLORS.navyText, true);
  doc.text(
    "Nenhum dado encontrado para os filtros selecionados.",
    LAYOUT.pageWidth / 2,
    LAYOUT.contentTop + 21,
    { align: "center" }
  );
  setText(doc, 8.5, COLORS.gray600);
  doc.text(
    `Período: ${report.metadata.period} | Unidade: ${report.metadata.unit}`,
    LAYOUT.pageWidth / 2,
    LAYOUT.contentTop + 31,
    { align: "center" }
  );
  ExecutiveFooter(doc, report, 1, 1);
}

function drawPageOne(doc: jsPDF, report: ExecutiveReportMetrics): void {
  ExecutiveHeader(doc, report, "Resultados e Impacto Assistencial");
  let y = LAYOUT.contentTop;
  y =
    ExecutiveSummaryBox(
      doc,
      "Síntese executiva",
      report.executiveSummary,
      y,
      "positive"
    ) + LAYOUT.gapMedium;

  sectionTitle(doc, "Indicadores principais", LAYOUT.margin, y);
  const kpiY = y + 4;
  const gap = 4;
  const width = (LAYOUT.contentWidth - gap * 3) / 4;
  const kpis = [
    {
      label: "Pacientes monitorados",
      value: formatInteger(report.overview.uniquePatients),
      detail: "pacientes únicos no recorte",
      status: "ALCANCE",
      tone: "informative" as Tone,
    },
    {
      label: "Alertas AURA",
      value: formatInteger(report.overview.auraAlerts),
      detail: "alertas clínicos identificados no período",
      status: "VOLUME",
      tone: "informative" as Tone,
    },
    {
      label: "Taxa de resposta",
      value: formatPercentage(report.overview.responseRate),
      detail: `${formatInteger(report.overview.responses)} alertas com retorno`,
      status:
        report.insights.mainOperationalGap?.key === "alertsToResponses"
          ? "ATENÇÃO"
          : "POSITIVO",
      tone:
        report.insights.mainOperationalGap?.key === "alertsToResponses"
          ? ("attention" as Tone)
          : ("positive" as Tone),
      emphasized: true,
    },
    {
      label: "Efetividade do ciclo fechado",
      value: formatPercentage(
        report.overview.closedCycleEffectivenessRate
      ),
      detail: `${formatInteger(
        report.overview.effectiveClosedCycles
      )} de ${formatInteger(report.overview.evaluatedClosedCycles)} ciclos`,
      status: "POSITIVO",
      tone: "positive" as Tone,
      emphasized: true,
    },
  ];
  kpis.forEach((kpi, index) =>
    PrimaryKpiCard(doc, {
      x: LAYOUT.margin + index * (width + gap),
      y: kpiY,
      width,
      ...kpi,
    })
  );

  y = kpiY + 27 + LAYOUT.gapMedium;
  y = JourneyFlow(doc, report, y) + LAYOUT.gapMedium;
  y = ImpactAndQuality(doc, report, y) + LAYOUT.gapMedium;
  ExecutiveConclusion(doc, report, y);
  ExecutiveFooter(doc, report, 1, 2);
}

function drawPageTwo(doc: jsPDF, report: ExecutiveReportMetrics): void {
  ExecutiveHeader(
    doc,
    report,
    "Oportunidades de Melhoria e Prioridades de Ação"
  );
  let y = LAYOUT.contentTop;
  y =
    ExecutiveSummaryBox(
      doc,
      "Diagnóstico operacional",
      report.operationalSummary,
      y,
      "attention"
    ) + LAYOUT.gapMedium;
  y = AttentionKpis(doc, report, y) + LAYOUT.gapMedium;

  const reasonsVisible = report.noResponseReasonsAvailable;
  const analysisGap = 5;
  const shiftWidth = reasonsVisible ? 169 : LAYOUT.contentWidth;
  ShiftAnalysis(doc, report, LAYOUT.margin, y, shiftWidth);
  if (reasonsVisible) {
    NoResponseReasons(
      doc,
      report,
      LAYOUT.margin + shiftWidth + analysisGap,
      y,
      LAYOUT.contentWidth - shiftWidth - analysisGap
    );
  }
  y += 44 + LAYOUT.gapSmall;

  const unitsVisible = report.unitMode !== "hidden";
  const weekendWidth = unitsVisible ? 96 : LAYOUT.contentWidth;
  WeekendComparison(doc, report, LAYOUT.margin, y, weekendWidth);
  if (unitsVisible) {
    UnitAnalysis(
      doc,
      report,
      LAYOUT.margin + weekendWidth + analysisGap,
      y,
      LAYOUT.contentWidth - weekendWidth - analysisGap
    );
  }
  y += 32 + LAYOUT.gapSmall;
  ActionPlan(doc, report, y);
  ExecutiveFooter(doc, report, 2, 2);
}

/**
 * Builds a fixed A4 landscape report. A populated report has exactly two
 * pages; the empty state has one page. No component can call addPage.
 */
export function buildExecutivePdf(
  data: DashboardResponse,
  meta: ExecutivePdfMeta
): ArrayBuffer {
  const report = buildExecutiveReportMetrics(data, meta);
  const doc = new jsPDF({
    unit: "mm",
    format: "a4",
    orientation: "landscape",
    compress: true,
  });

  if (report.empty) {
    EmptyState(doc, report);
    return doc.output("arraybuffer");
  }

  drawPageOne(doc, report);
  doc.addPage("a4", "landscape");
  drawPageTwo(doc, report);

  while (doc.getNumberOfPages() > 2) {
    doc.deletePage(doc.getNumberOfPages());
  }
  return doc.output("arraybuffer");
}
