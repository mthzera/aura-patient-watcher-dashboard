import { NextResponse } from "next/server";
import {
  hasIntercorrencias,
  getIntercorrenciaMetadata,
} from "@/lib/csv/parseIntercorrencias";

export async function GET() {
  const loaded = await hasIntercorrencias();
  const meta = await getIntercorrenciaMetadata();
  return NextResponse.json({ loaded, meta });
}
