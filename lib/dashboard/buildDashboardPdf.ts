import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { DashboardFilters, DashboardResponse } from "@/lib/dashboard/types";
import { businessUnitLabel } from "@/lib/dashboard/businessUnit";

const TEAL: [number, number, number] = [20, 184, 166];
const SLATE_DARK: [number, number, number] = [15, 23, 42];
const SLATE_MED: [number, number, number] = [51, 65, 85];
const AMBER: [number, number, number] = [245, 158, 11];
const VIOLET: [number, number, number] = [139, 92, 246];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 16;
const CONTENT_W = PAGE_W - MARGIN * 2;
const MAX_LIST_ROWS = 35;

export interface DashboardPdfMeta {
  filters: DashboardFilters;
  dataSource?: string;
  generatedAt?: Date;
}

function fmtDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function pct(part: number, total: number): string {
  if (!total) return "0%";
  return `${Math.round((part / total) * 100)}%`;
}

function filterSummary(filters: DashboardFilters): string[] {
  const lines: string[] = [];
  if (filters.startDate || filters.endDate) {
    lines.push(
      `Período: ${filters.startDate ? fmtDate(filters.startDate) : "início"} → ${filters.endDate ? fmtDate(filters.endDate) : "hoje"}`
    );
  } else {
    lines.push("Período: todos os registros");
  }
  lines.push(
    `Unidade de negócio: ${businessUnitLabel(filters.businessUnit)}`
  );
  lines.push(`Unidade: ${filters.unit || "Todas"}`);
  if (filters.clinicalAlteration) {
    lines.push(`Alteração clínica: ${filters.clinicalAlteration}`);
  }
  if (filters.clinicalOutcome) {
    lines.push(`Desfecho clínico: ${filters.clinicalOutcome}`);
  }
  if (filters.auraActionStatus) {
    lines.push(`Status ação AURA: ${filters.auraActionStatus}`);
  }
  return lines;
}

type DocState = { doc: jsPDF; y: number };

function ensureSpace(state: DocState, needed: number): void {
  if (state.y + needed > PAGE_H - MARGIN) {
    state.doc.addPage();
    state.y = MARGIN;
    drawPageFooter(state);
  }
}

function drawPageFooter(state: DocState): void {
  const pageCount = state.doc.getNumberOfPages();
  const page = state.doc.getCurrentPageInfo().pageNumber;
  state.doc.setFontSize(8);
  state.doc.setTextColor(148, 163, 184);
  state.doc.text(
    `Dashboard AURA Patient Watcher — Página ${page} de ${pageCount}`,
    PAGE_W / 2,
    PAGE_H - 8,
    { align: "center" }
  );
}

function sectionTitle(state: DocState, title: string, accent: [number, number, number] = TEAL): void {
  ensureSpace(state, 18);
  state.doc.setFillColor(...accent);
  state.doc.roundedRect(MARGIN, state.y, 3, 10, 1, 1, "F");
  state.doc.setFont("helvetica", "bold");
  state.doc.setFontSize(12);
  state.doc.setTextColor(...SLATE_DARK);
  state.doc.text(title, MARGIN + 7, state.y + 7);
  state.y += 14;
}

function paragraph(state: DocState, text: string, size = 9): void {
  ensureSpace(state, 12);
  state.doc.setFont("helvetica", "normal");
  state.doc.setFontSize(size);
  state.doc.setTextColor(...SLATE_MED);
  const lines = state.doc.splitTextToSize(text, CONTENT_W);
  state.doc.text(lines, MARGIN, state.y);
  state.y += lines.length * (size * 0.45) + 4;
}

function kpiGrid(
  state: DocState,
  items: { label: string; value: string; sub?: string }[]
): void {
  const cols = 2;
  const colW = CONTENT_W / cols;
  const rowH = 22;
  const rows = Math.ceil(items.length / cols);

  ensureSpace(state, rows * rowH + 4);

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * colW;
    const y = state.y + row * rowH;

    state.doc.setFillColor(248, 250, 252);
    state.doc.setDrawColor(226, 232, 240);
    state.doc.roundedRect(x + 2, y, colW - 4, rowH - 2, 2, 2, "FD");

    state.doc.setFont("helvetica", "normal");
    state.doc.setFontSize(7.5);
    state.doc.setTextColor(100, 116, 139);
    state.doc.text(item.label, x + 6, y + 8);

    state.doc.setFont("helvetica", "bold");
    state.doc.setFontSize(14);
    state.doc.setTextColor(...SLATE_DARK);
    state.doc.text(item.value, x + 6, y + 16);

    if (item.sub) {
      state.doc.setFont("helvetica", "normal");
      state.doc.setFontSize(7);
      state.doc.setTextColor(...TEAL);
      state.doc.text(item.sub, x + 6, y + 20);
    }
  });

  state.y += rows * rowH + 6;
}

function dataTable(
  state: DocState,
  head: string[],
  body: (string | number)[][],
  options?: { headColor?: [number, number, number]; footnote?: string }
): void {
  ensureSpace(state, 20);

  autoTable(state.doc, {
    startY: state.y,
    margin: { left: MARGIN, right: MARGIN },
    head: [head],
    body,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: SLATE_DARK,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: options?.headColor ?? TEAL,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    tableWidth: CONTENT_W,
  });

  const finalY = (state.doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY;
  state.y = (finalY ?? state.y) + 4;

  if (options?.footnote) {
    paragraph(state, options.footnote, 7);
  }
}

function drawCover(state: DocState, meta: DashboardPdfMeta): void {
  const { doc } = state;
  const generatedAt = meta.generatedAt ?? new Date();

  doc.setFillColor(...SLATE_DARK);
  doc.rect(0, 0, PAGE_W, 90, "F");
  doc.setFillColor(...TEAL);
  doc.rect(0, 90, PAGE_W, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(255, 255, 255);
  doc.text("Dashboard AURA", MARGIN, 38);
  doc.text("Patient Watcher", MARGIN, 52);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(148, 163, 184);
  doc.text("Efetividade na gestão de casos clínicos", MARGIN, 68);
  doc.setFontSize(10);
  doc.text("Do alerta ao desfecho assistencial", MARGIN, 78);

  state.y = 108;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...SLATE_DARK);
  doc.text("Relatório para apresentação", MARGIN, state.y);
  state.y += 10;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE_MED);
  doc.text(`Gerado em: ${fmtDateTime(generatedAt)}`, MARGIN, state.y);
  state.y += 6;
  if (meta.dataSource) {
    doc.text(`Fonte de dados: ${meta.dataSource}`, MARGIN, state.y);
    state.y += 6;
  }
  state.y += 4;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(MARGIN, state.y, CONTENT_W, 42, 3, 3, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...TEAL);
  doc.text("Recorte aplicado", MARGIN + 6, state.y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_MED);
  const filters = filterSummary(meta.filters);
  filters.forEach((line, i) => {
    doc.text(line, MARGIN + 6, state.y + 18 + i * 6);
  });
  state.y += 52;
}

export function buildDashboardPdf(
  data: DashboardResponse,
  meta: DashboardPdfMeta
): ArrayBuffer {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const state: DocState = { doc, y: MARGIN };
  const m = data.metrics;

  drawCover(state, meta);

  // --- KPIs ---
  sectionTitle(state, "Indicadores principais");
  kpiGrid(state, [
    { label: "Registros no recorte", value: String(data.filteredRows), sub: `${data.totalRows} no arquivo` },
    { label: "Pacientes únicos", value: String(m.uniquePatients) },
    { label: "Alertas AURA", value: String(m.auraAlerts) },
    { label: "Taxa de resposta", value: `${m.alertResponseRate}%`, sub: `${m.alertsWithReturn} com retorno` },
    { label: "Sem retorno", value: String(m.auraAlertsNoReturn), sub: `${m.auraAlertsNoReturnRate}% dos alertas` },
    { label: "Ciclo fechado efetivo", value: `${m.closedLoopEffectivenessRate}%`, sub: `${m.closedLoopEffectivenessNumerator}/${m.closedLoopEffectivenessDenominator}` },
    { label: "Ações da unidade", value: String(m.unitActions) },
    { label: "Desfechos favoráveis", value: String(m.favorableOutcomes) },
    { label: "Descomp. transitória", value: String(m.transientDecompensations), sub: `${m.transientEffectiveRate}% efetivas` },
    { label: "Descomp. aguda", value: String(m.acuteDecompensations), sub: `${m.acuteEffectiveRate}% efetivas` },
    { label: "Reversões de deterioração", value: String(m.deteriorationReversals) },
    { label: "Reinternações evitadas", value: String(m.avoidedReadmissions) },
  ]);

  // --- Closed loop ---
  sectionTitle(state, "Ciclo fechado assistencial", VIOLET);
  dataTable(
    state,
    ["Indicador", "Valor"],
    [
      ["Alertas AURA no recorte", m.auraAlerts],
      ["Com retorno da unidade", `${m.alertsWithReturn} (${m.alertResponseRate}%)`],
      ["Sem retorno", `${m.auraAlertsNoReturn} (${m.auraAlertsNoReturnRate}%)`],
      ["Desfechos registrados (alertas AURA)", `${m.registeredOutcomesAuraAlerts} (${m.registeredOutcomesAuraAlertsRate}%)`],
      ["Retorno clínico normal/basal/estável", `${m.normalClinicalReturnAlerts} (${m.normalClinicalReturnAmongReturnRate}% dos retornos)`],
      ["Efetividade do ciclo fechado", `${m.closedLoopEffectivenessRate}%`],
      ["Numerador / denominador", `${m.closedLoopEffectivenessNumerator} / ${m.closedLoopEffectivenessDenominator}`],
    ]
  );

  // --- AURA alert split ---
  const split = data.auraAlertSplit;
  if (split.available && split.totalAuraAlerts > 0) {
    sectionTitle(state, "Classificação dos alertas AURA");
    kpiGrid(state, [
      { label: "Total alertas AURA", value: String(split.totalAuraAlerts) },
      { label: "Com retorno", value: String(split.alertsWithReturn), sub: pct(split.alertsWithReturn, split.totalAuraAlerts) },
      { label: "Sem retorno", value: String(split.auraAlertsNoReturn), sub: pct(split.auraAlertsNoReturn, split.totalAuraAlerts) },
    ]);

    const nr = data.noReturnReasons;
    if (nr.available && nr.totalNoReturn > 0) {
      paragraph(state, "Motivos dos alertas sem retorno (Ação Iniciação):");
      dataTable(state, ["Motivo", "Qtd", "%"], [
        ["Unidade não respondeu", nr.unidadeNaoRespondeu, pct(nr.unidadeNaoRespondeu, nr.totalNoReturn)],
        ["Sem contato telefônico", nr.semContatoTelefonico, pct(nr.semContatoTelefonico, nr.totalNoReturn)],
        ["Sem informação / outro", nr.semInformacao, pct(nr.semInformacao, nr.totalNoReturn)],
      ]);
    }

    const rr = data.returnReasons;
    if (rr.available && rr.totalWithReturn > 0) {
      paragraph(
        state,
        "Discussão Comitê Aura nos alertas com retorno — Descompensação Aguda (fallback: Desfecho Clínico):"
      );
      const ag = rr.aguda;
      dataTable(state, ["Discussão Comitê Aura", "Qtd"], [
        ["Reversão de deterioração", ag.reversaoDeterioracao],
        ["Reinternação evitada", ag.reinternacaoEvitada],
        ["Reinternação evitável", ag.reinternacaoEvitavel],
        ["Reinternação inevitável", ag.reinternacaoInevitavel],
        ["Monitoramento", ag.monitoramento],
        ["Não monitorado", ag.naoMonitorado],
        ["Total aguda", ag.total],
      ]);

      paragraph(
        state,
        "Descompensação Transitória Esperada (Desfecho; fallback Ação AURA / Histórico):"
      );
      const es = rr.esperada;
      dataTable(state, ["Desfecho", "Qtd"], [
        ["Melhora clínica", es.melhoraClinica],
        ["Condição basal", es.condicaoBasal],
        ["Finitude", es.finitude],
        ["Reinternação", es.reintercacao],
        ["Erro de registro", es.erroRegistro],
        ["Sem retorno", es.semRetorno],
        ["Total esperada", es.total],
      ]);
    }
  }

  // --- Patient ranking ---
  const ranking = data.patientAlertRanking;
  if (ranking.transient.length > 0 || ranking.acute.length > 0) {
    sectionTitle(state, "Ranking de alertas por paciente");
    if (ranking.transient.length > 0) {
      paragraph(state, `Top ${ranking.limit} — Descompensação transitória esperada:`);
      dataTable(
        state,
        ["#", "Paciente", "Unidade", "Alertas"],
        ranking.transient.map((p, i) => [i + 1, p.patientName, p.unit ?? "—", p.total])
      );
    }
    if (ranking.acute.length > 0) {
      paragraph(state, `Top ${ranking.limit} — Descompensação aguda:`);
      dataTable(
        state,
        ["#", "Paciente", "Unidade", "Alertas"],
        ranking.acute.map((p, i) => [i + 1, p.patientName, p.unit ?? "—", p.total])
      );
    }
  }

  // --- Reinternações ---
  const rein = data.reinternacaoAlertAnalysis;
  if (rein.available && rein.totalReinternacoes > 0) {
    sectionTitle(state, "Reinternações × alertas AURA", AMBER);
    kpiGrid(state, [
      { label: "Total reinternações", value: String(rein.totalReinternacoes) },
      { label: "Com alerta AURA prévio (10d)", value: String(rein.withPriorAlert), sub: pct(rein.withPriorAlert, rein.totalReinternacoes) },
      { label: "Sem alerta prévio", value: String(rein.withoutPriorAlert), sub: pct(rein.withoutPriorAlert, rein.totalReinternacoes) },
      { label: "Atuamos (c/ alerta)", value: String(rein.effectiveness.acted) },
      { label: "Não atuamos (c/ alerta)", value: String(rein.effectiveness.notActed) },
    ]);

    if (rein.withPriorAlert > 0) {
      paragraph(state, "Motivos entre reinternados com alerta prévio:");
      dataTable(state, ["Motivo", "Qtd"], [
        ["Alerta sem retorno", rein.effectiveness.byReason.sem_retorno],
        ["Retorno estável", rein.effectiveness.byReason.retorno_estavel],
        [
          "Retorno desfavorável",
          rein.effectiveness.byReason.retorno_desfavoravel,
        ],
        [
          "Retorno favorável (reinternação posterior)",
          rein.effectiveness.byReason.retorno_favoravel_reinternou,
        ],
        ["Outros", rein.effectiveness.byReason.outros],
        [
          "Aguda — atuamos / total",
          `${rein.effectiveness.byAlteration.aguda.acted} / ${rein.effectiveness.byAlteration.aguda.total}`,
        ],
        [
          "Transitória — atuamos / total",
          `${rein.effectiveness.byAlteration.transitoria.acted} / ${rein.effectiveness.byAlteration.transitoria.total}`,
        ],
      ]);
    }

    const rows = rein.matches.slice(0, MAX_LIST_ROWS);
    dataTable(
      state,
      ["Paciente", "Data", "Unidade", "Motivo / condição", "Alerta prévio"],
      rows.map((r) => [
        r.patientName,
        fmtDate(r.reinternacaoDate),
        r.unit ?? r.filial ?? "—",
        r.conditionOnDischarge ?? "—",
        r.hadPriorAlert ? `Sim (${r.priorAlerts.length})` : "Não",
      ]),
      {
        footnote:
          rein.matches.length > MAX_LIST_ROWS
            ? `Exibindo ${MAX_LIST_ROWS} de ${rein.matches.length} registros.`
            : undefined,
      }
    );
  }

  // --- Intercorrências (Anery) ---
  const inter = data.intercorrenciaAnalysis;
  if (inter.available && inter.totalIntercorrencias > 0) {
    sectionTitle(state, "Intercorrências Anery × alertas AURA", AMBER);
    kpiGrid(state, [
      { label: "Total intercorrências", value: String(inter.totalIntercorrencias) },
      { label: "Com alerta AURA prévio (5d)", value: String(inter.withPriorAlert), sub: pct(inter.withPriorAlert, inter.totalIntercorrencias) },
      { label: "Sem alerta prévio", value: String(inter.withoutPriorAlert), sub: pct(inter.withoutPriorAlert, inter.totalIntercorrencias) },
    ]);

    if (inter.topReasons.length > 0) {
      paragraph(state, "Principais motivos (classificação):");
      dataTable(
        state,
        ["Motivo", "Qtd"],
        inter.topReasons.map((r) => [r.label, r.count])
      );
    }

    if (inter.urgencyBreakdown.length > 0) {
      dataTable(
        state,
        ["Grau de urgência", "Qtd"],
        inter.urgencyBreakdown.map((r) => [r.label, r.count])
      );
    }

    const interRows = inter.matches.slice(0, MAX_LIST_ROWS);
    if (interRows.length > 0) {
      dataTable(
        state,
        ["Paciente", "Data", "Classificação", "Urgência", "Alerta prévio"],
        interRows.map((r) => [
          r.patientName,
          fmtDate(r.intercorrenciaDate),
          r.classificacao ?? "—",
          r.grauUrgencia ?? "—",
          r.hadPriorAlert ? `Sim (${r.priorAlerts.length})` : "Não",
        ]),
        {
          footnote:
            inter.matches.length > MAX_LIST_ROWS
              ? `Exibindo ${MAX_LIST_ROWS} de ${inter.matches.length} registros.`
              : undefined,
        }
      );
    }
  }

  // --- Unit management ---
  if (data.unitSummaries.length > 0) {
    sectionTitle(state, "Gestão por unidade");
    dataTable(
      state,
      ["Unidade", "Registros", "Alertas AURA", "Ações", "Desf. favoráveis", "Ciclo fechado", "Sem retorno"],
      data.unitSummaries.map((u) => [
        u.unit,
        u.totalRecords,
        u.auraAlerts,
        u.unitActions,
        u.favorableOutcomes,
        `${u.closedLoopEffectivenessRate}%`,
        u.noReturnCases,
      ])
    );
  }

  // --- Time series ---
  if (data.timeSeries.length > 0) {
    sectionTitle(state, "Evolução temporal");
    dataTable(
      state,
      ["Data", "Alertas AURA", "Ações", "Desf. favoráveis", "Sem retorno"],
      data.timeSeries.map((p) => [
        fmtDate(p.date),
        p.auraAlerts,
        p.unitActions,
        p.favorableOutcomes,
        p.noReturnCases,
      ])
    );
  }

  // --- Improvement opportunity ---
  const resp = data.responsiveness;
  sectionTitle(state, "Oportunidade de melhoria", AMBER);
  paragraph(
    state,
    `${m.auraAlertsNoReturn} alertas AURA (${m.auraAlertsNoReturnRate}%) estão sem retorno. A análise temporal indica quando o ciclo assistencial mais falha.`
  );

  if (resp.available) {
    if (resp.worstShift) {
      paragraph(
        state,
        `Turno mais crítico: ${resp.worstShift.label} — ${resp.worstShift.noReturnRate}% sem retorno.`
      );
    }
    if (resp.bestShift) {
      paragraph(
        state,
        `Melhor turno: ${resp.bestShift.label} — ${resp.bestShift.noReturnRate}% sem retorno.`
      );
    }

    if (resp.byShift.length > 0) {
      dataTable(
        state,
        ["Turno", "Registros", "Sem retorno", "% sem retorno", "Efetivos", "% efetivo"],
        resp.byShift.map((b) => [
          b.label,
          b.total,
          b.noReturn,
          `${b.noReturnRate}%`,
          b.effective,
          `${b.effectiveRate}%`,
        ])
      );
    }

    if (resp.byDayOfWeek.length > 0) {
      dataTable(
        state,
        ["Dia da semana", "Registros", "Sem retorno", "% sem retorno"],
        resp.byDayOfWeek.map((b) => [b.label, b.total, b.noReturn, `${b.noReturnRate}%`])
      );
    }

    if (resp.actionPlan.length > 0) {
      paragraph(state, "Plano de ação sugerido:");
      resp.actionPlan.forEach((item, i) => {
        paragraph(state, `${i + 1}. ${item}`, 8.5);
      });
    }
  }

  if (data.warnings.length > 0) {
    sectionTitle(state, "Avisos de qualidade de dados");
    data.warnings.forEach((w) => paragraph(state, `• ${w}`, 8));
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dashboard AURA Patient Watcher — Página ${p} de ${totalPages}`,
      PAGE_W / 2,
      PAGE_H - 8,
      { align: "center" }
    );
  }

  return doc.output("arraybuffer");
}
