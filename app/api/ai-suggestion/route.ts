import { NextRequest, NextResponse } from "next/server";
import type {
  ResponsivenessAnalysis,
  DashboardMetrics,
  TemporalBucket,
} from "@/lib/dashboard/types";

/**
 * AI suggestion endpoint backed by a local Ollama (Llama) model.
 *
 * Privacy: only AGGREGATED data (shift/day/hour rates, totals) is sent to the
 * model — never patient-level rows. Everything runs on localhost; no data
 * leaves the server.
 *
 * Configure via env:
 *   OLLAMA_BASE_URL  (default http://localhost:11434)
 *   OLLAMA_MODEL     (default llama3.1)
 */

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1";

interface Body {
  responsiveness: ResponsivenessAnalysis;
  metrics: DashboardMetrics;
}

function bucketLine(b: TemporalBucket): string {
  return `${b.label}: ${b.noReturnRate}% sem retorno, ${b.effectiveRate}% respostas efetivas (n=${b.total})`;
}

function buildPrompt(r: ResponsivenessAnalysis, m: DashboardMetrics): string {
  const lines: string[] = [];
  lines.push(`Total de registros analisados: ${m.totalRecords}`);
  lines.push(`Casos sem retorno: ${m.noReturnCases} (${r.overallNoReturnRate}% do total)`);
  lines.push(`Efetividade do ciclo fechado: ${m.closedLoopEffectivenessRate}%`);
  lines.push("");
  lines.push("Por turno:");
  r.byShift.forEach((b) => lines.push(`  - ${bucketLine(b)}`));
  lines.push("Por dia da semana:");
  r.byDayOfWeek.forEach((b) => lines.push(`  - ${bucketLine(b)}`));
  lines.push("Por faixa horária:");
  r.byHourBand.forEach((b) => lines.push(`  - ${bucketLine(b)}`));
  return lines.join("\n");
}

const SYSTEM_PROMPT = `Você é um consultor sênior de gestão hospitalar especializado em segurança do paciente (modelo "Patient Watcher"). Recebe métricas AGREGADAS sobre falhas no ciclo de resposta a alertas clínicos.

REGRAS OBRIGATÓRIAS:
- Responda SEMPRE com as três seções abaixo, nessa ordem e com esses títulos exatos.
- Cada seção deve existir mesmo que curta. NÃO omita nenhuma.
- A seção mais importante é "**Plano de ação**" — ela deve ter pelo menos 3 recomendações concretas.
- Use os números dos dados para justificar. Não invente dados.
- Escreva em português do Brasil, de forma direta e sem jargão genérico.

**Diagnóstico**
(1–2 frases resumindo APENAS os 2 piores períodos, com os números. Não descreva todos os períodos.)

**Por que acontece**
(1–2 frases com a hipótese mais provável: escala, passagem de plantão, cobertura reduzida, etc.)

**Plano de ação**
Liste 3 recomendações concretas e priorizáveis, numeradas. Cada uma deve responder "O QUÊ fazer", "QUANDO/ONDE aplicar" e "QUAL O RESULTADO esperado". Exemplos de nível de concretude esperado: "Criar escala de sobreaviso específica para madrugada de sábado e domingo", "Implementar alerta escalado automático após 15 min sem resposta durante a madrugada", "Revisar protocolo de passagem de plantão incluindo checklist de alertas abertos".`;

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Corpo da requisição inválido." },
      { status: 400 }
    );
  }

  if (!body?.responsiveness || !body?.metrics) {
    return NextResponse.json(
      { error: "Dados de análise ausentes." },
      { status: 400 }
    );
  }

  const userPrompt = buildPrompt(body.responsiveness, body.metrics);

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        options: { temperature: 0.6, num_predict: 600 },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      // Model not pulled yet is the most common 404
      if (res.status === 404) {
        return NextResponse.json(
          {
            error: `Modelo "${OLLAMA_MODEL}" não encontrado no Ollama. Rode: ollama pull ${OLLAMA_MODEL}`,
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: `Ollama retornou ${res.status}: ${detail.slice(0, 200)}` },
        { status: 503 }
      );
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const suggestion = data.message?.content?.trim();

    if (!suggestion) {
      return NextResponse.json(
        { error: "O modelo não retornou conteúdo." },
        { status: 503 }
      );
    }

    return NextResponse.json({ suggestion, model: OLLAMA_MODEL });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Connection refused → Ollama not running
    return NextResponse.json(
      {
        error: `Não foi possível conectar ao Ollama em ${OLLAMA_BASE_URL}. Verifique se o Ollama está rodando (comando "ollama serve"). Detalhe: ${msg}`,
      },
      { status: 503 }
    );
  }
}
