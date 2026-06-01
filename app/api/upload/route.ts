import { NextRequest, NextResponse } from "next/server";
import { invalidateCache } from "@/lib/cache/dashboardCache";
import {
  parseCsvBuffer,
  saveMetadata,
  CSV_NAME,
} from "@/lib/csv/parseCsvFile";
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

  // Validate the file is parseable BEFORE persisting it, so a bad upload never
  // overwrites a good one.
  let rowCount = 0;
  try {
    rowCount = parseCsvBuffer(buffer).length;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `O arquivo não pôde ser lido: ${msg}` },
      { status: 422 }
    );
  }

  await saveFile(CSV_NAME, buffer, "text/csv");

  await saveMetadata({
    originalName: filename,
    uploadedAt: new Date().toISOString(),
    sizeBytes: buffer.byteLength,
    rowCount,
  });

  // Bust the data cache so the next dashboard request re-reads the file
  invalidateCache();

  return NextResponse.json({
    success: true,
    filename,
    sizeBytes: buffer.byteLength,
    rowCount,
  });
}
