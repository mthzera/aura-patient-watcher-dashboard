import { NextResponse } from "next/server";
import {
  hasReinternacoes,
  getReinternacaoMetadata,
} from "@/lib/csv/parseReinternacoes";

export async function GET() {
  const loaded = await hasReinternacoes();
  const meta = await getReinternacaoMetadata();
  return NextResponse.json({ loaded, meta });
}
