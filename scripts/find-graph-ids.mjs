/**
 * Utility script: finds the GRAPH_DRIVE_ID and GRAPH_ITEM_ID for a file
 * on OneDrive/SharePoint using your existing Azure credentials.
 *
 * Run: node scripts/find-graph-ids.mjs
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually
const envPath = resolve(process.cwd(), ".env.local");
const envLines = readFileSync(envPath, "utf-8").split("\n");
const env = {};
for (const line of envLines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  env[key] = value;
}

const { MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET } = env;

if (!MICROSOFT_TENANT_ID || !MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET) {
  console.error("❌  Credenciais ausentes no .env.local");
  process.exit(1);
}

// --- Get access token ---
async function getToken() {
  const url = `https://login.microsoftonline.com/${MICROSOFT_TENANT_ID}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: MICROSOFT_CLIENT_ID,
    client_secret: MICROSOFT_CLIENT_SECRET,
    scope: "https://graph.microsoft.com/.default",
  });
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Token error: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

async function graphGet(token, path) {
  const url = path.startsWith("http") ? path : `https://graph.microsoft.com/v1.0${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

// --- Main ---
const USER_EMAIL = "matheus.silva@pcpsaude.com.br";
// Possible file names extracted from the SharePoint URL
const FILE_CANDIDATES = [
  "Dash Paciente watcher - AURA v5.3.3.xlsx",
  "Dash Paciente watcher - AURA v5.3.3.xlsx.url",
];
const FOLDER = "Documents";

console.log("🔐  Obtendo token de acesso...");
const token = await getToken();
console.log("✅  Token obtido.\n");

// Try accessing the user's OneDrive drive
console.log(`🔍  Buscando drive de ${USER_EMAIL}...`);
let driveId;
try {
  const drive = await graphGet(token, `/users/${USER_EMAIL}/drive`);
  driveId = drive.id;
  console.log(`✅  Drive encontrado: ${driveId}\n`);
} catch (err) {
  console.error(`❌  Não foi possível acessar o drive do usuário: ${err.message}`);
  console.log("\n💡  Tentando via site do SharePoint...");

  try {
    const site = await graphGet(
      token,
      `/sites/redealtana1-my.sharepoint.com:/personal/matheus_silva_pcpsaude_com_br`
    );
    const siteDrive = await graphGet(token, `/sites/${site.id}/drive`);
    driveId = siteDrive.id;
    console.log(`✅  Drive via SharePoint site: ${driveId}\n`);
  } catch (err2) {
    console.error(`❌  Falhou também via site: ${err2.message}`);
    process.exit(1);
  }
}

// List Documents folder to see what's there
console.log(`📂  Listando pasta "${FOLDER}"...`);
try {
  const folder = await graphGet(token, `/drives/${driveId}/root:/${FOLDER}:/children`);
  const files = folder.value || [];
  const xlsxFiles = files.filter(f => f.name.toLowerCase().includes("aura") || f.name.toLowerCase().includes("watcher") || f.name.toLowerCase().endsWith(".xlsx"));
  
  if (xlsxFiles.length > 0) {
    console.log(`\n📋  Arquivos encontrados relacionados a AURA/Watcher:`);
    for (const f of xlsxFiles) {
      console.log(`   📄 ${f.name}`);
      console.log(`      Item ID: ${f.id}`);
    }
  } else {
    console.log(`   (Nenhum arquivo AURA/Watcher encontrado em ${FOLDER})`);
    console.log(`\n📋  Todos os arquivos em ${FOLDER}:`);
    for (const f of files.slice(0, 20)) {
      console.log(`   📄 ${f.name}  (id: ${f.id})`);
    }
  }
} catch (err) {
  console.error(`❌  Erro ao listar pasta: ${err.message}`);
}

// Try each file candidate directly
console.log(`\n🔍  Buscando arquivo diretamente...`);
for (const fileName of FILE_CANDIDATES) {
  try {
    const item = await graphGet(
      token,
      `/drives/${driveId}/root:/${FOLDER}/${encodeURIComponent(fileName)}`
    );
    console.log(`\n✅  ARQUIVO ENCONTRADO: "${fileName}"`);
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`Cole no seu .env.local:`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`EXCEL_STRATEGY=download`);
    console.log(`GRAPH_DRIVE_ID=${driveId}`);
    console.log(`GRAPH_ITEM_ID=${item.id}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  } catch {
    console.log(`   ✗ "${fileName}" não encontrado nesse caminho`);
  }
}
