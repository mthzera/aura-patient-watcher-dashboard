import { NextRequest, NextResponse } from "next/server";
import {
  parseIntercorrenciasBuffer,
  saveIntercorrenciaMetadata,
  INTERCORRENCIAS_NAME,
} from "@/lib/csv/parseIntercorrencias";
import { saveFile } from "@/lib/storage/fileStore";

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

  let rowCount = 0;
  try {
    rowCount = parseIntercorrenciasBuffer(buffer).length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `O arquivo não pôde ser lido: ${msg}` },
      { status: 422 }
    );
  }

  try {
    await saveFile(INTERCORRENCIAS_NAME, buffer, "text/csv");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Não foi possível salvar o arquivo: ${msg}` },
      { status: 500 }
    );
  }

  await saveIntercorrenciaMetadata({
    originalName: filename,
    uploadedAt: new Date().toISOString(),
    sizeBytes: buffer.byteLength,
    rowCount,
  });

  return NextResponse.json({ success: true, filename, rowCount });
}
