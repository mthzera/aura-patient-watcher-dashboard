import { NextResponse } from "next/server";
import {
  hasReinternacoes,
  getReinternacaoMetadata,
} from "@/lib/csv/parseReinternacoes";

export async function GET() {
  const loaded = hasReinternacoes();
  const meta = getReinternacaoMetadata();
  return NextResponse.json({ loaded, meta });
}
