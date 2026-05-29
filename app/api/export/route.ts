/**
 * GET /api/export
 *
 * Returns an XLSX file containing all uploaded records plus a computed
 * "Resumo Interpretativo do Alerta" column. No filters applied — this
 * exports the full dataset so the consumer can slice it in Excel.
 *
 * The XLSX write happens entirely on the server; no client-side dependencies.
 */

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { loadSpreadsheetData } from "@/lib/dashboard/loadSpreadsheetData";
import { buildNarrative } from "@/lib/dashboard/buildAlertNarrative";

export async function GET() {
  try {
    const { rows } = await loadSpreadsheetData();

    // Build one export row per record: keep all normalized fields plus narrative.
    const exportRows = rows.map((r, i) => {
      const narrative = buildNarrative(r, i);
      return {
        "#": i + 1,
        Paciente: r.patient_name ?? "",
        "Data Alerta": r.date ?? "",
        Unidade: r.unit ?? "",
        "Alteração Clínica": r.clinical_alteration ?? "",
        "Alertado AURA?": r.aura_alerted ?? "",
        "Ação AURA": r.aura_action_status ?? "",
        "Resultado da Intervenção": r.intervention_result ?? "",
        "Desfecho Clínico": r.clinical_outcome ?? "",
        "Data Alta": r.discharge_date ?? "",
        "Status Monitoramento": r.monitoring_status ?? "",
        "Dias antes do Evento": narrative.daysBeforeDischarge ?? "",
        "Tipo de Evento": narrative.eventType ?? "",
        "Sem Retorno?": narrative.isNoReturn ? "Sim" : "Não",
        "Resumo Interpretativo do Alerta": narrative.summaryText,
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);

    // Auto-fit column widths (rough heuristic based on header length)
    const headers = Object.keys(exportRows[0] ?? {});
    ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
    // Give the narrative column extra width
    const narrativeColIdx = headers.indexOf("Resumo Interpretativo do Alerta");
    if (narrativeColIdx >= 0 && ws["!cols"][narrativeColIdx]) {
      ws["!cols"][narrativeColIdx] = { wch: 80 };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alertas com Narrativa");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="aura-alertas-narrativa.xlsx"',
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
