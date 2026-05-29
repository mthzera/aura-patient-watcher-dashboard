import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import {
  parseReinternacoes,
  REINTERNACOES_PATH,
  REINTERNACOES_META_PATH,
} from "@/lib/csv/parseReinternacoes";

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Requisição inválida. Envie um multipart/form-data." },
      { status: 400 }
    );
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json(
      { error: "Nenhum arquivo enviado. Use o campo 'file'." },
      { status: 400 }
    );
  }

  const filename = file.name ?? "";
  if (!filename.toLowerCase().endsWith(".csv")) {
    return NextResponse.json(
      { error: "Apenas arquivos .csv são aceitos." },
      { status: 400 }
    );
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const dataDir = path.dirname(REINTERNACOES_PATH);
  await mkdir(dataDir, { recursive: true });
  await writeFile(REINTERNACOES_PATH, buffer);

  // Validate the file is parseable and get row count
  let rowCount = 0;
  try {
    const rows = parseReinternacoes();
    rowCount = rows.length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Arquivo salvo mas não pôde ser lido: ${msg}` },
      { status: 422 }
    );
  }

  const meta = {
    originalName: filename,
    uploadedAt: new Date().toISOString(),
    sizeBytes: buffer.byteLength,
    rowCount,
  };
  await writeFile(REINTERNACOES_META_PATH, JSON.stringify(meta, null, 2));

  return NextResponse.json({ success: true, filename, rowCount });
}
