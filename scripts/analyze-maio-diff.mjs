import * as XLSX from "xlsx";
import { readFileSync } from "fs";
import path from "path";

const CSV_PATH = path.join(
  process.cwd(),
  "Paciente Watcher - Maio Fechado 2 - Sem Noite e Madruga.csv"
);

const NO_RETURN_PHRASES = ["nao realizada, sem retorno", "sem retorno"];
const ACTION_INDICATORS = [
  "realizada",
  "atuacao realizada",
  "reavaliacao",
  "intervencao",
  "estabilizacao",
  "melhora",
  "conduta realizada",
  "notificado",
  "acionado",
  "avaliado",
  "monitorado",
  "sim",
];
const NA = new Set(["n/a", "na", "n.a.", "-", "--"]);

function norm(v) {
  const s = String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  return NA.has(s) ? "" : s;
}

function isAura(row) {
  const v = norm(row.alertado);
  return v === "sim" || v === "yes" || v === "1" || v === "true";
}

function hasTriagem(row) {
  if (!norm(row.alteracao)) return false;
  const s = norm(row.acaoAura);
  if (!s) return false;
  if (NO_RETURN_PHRASES.some((p) => s.includes(p))) return false;
  return true;
}

function hasUnitAction(row) {
  const s = norm(row.acaoAura);
  if (!s) return false;
  if (NO_RETURN_PHRASES.some((p) => s.includes(p))) return false;
  return ACTION_INDICATORS.some((ind) => s.includes(ind));
}

function hasRegisteredOutcome(row) {
  return Boolean(norm(row.desfecho));
}

const buf = readFileSync(CSV_PATH);
const wb = XLSX.read(buf, { type: "buffer", raw: true });
const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
  defval: "",
  raw: true,
});

const rows = raw.map((r, i) => ({
  line: i + 2,
  data: String(r["Data"] ?? r["data"] ?? ""),
  paciente: String(r["Paciente"] ?? ""),
  alertado: String(r["Alertado AURA?"] ?? ""),
  alteracao: String(r["Alteração Clínica"] ?? r["Alteracao Clinica"] ?? ""),
  acaoAura: String(r["Ação AURA"] ?? r["Acao AURA"] ?? ""),
  desfecho: String(r["Desfecho Clínico"] ?? r["Desfecho Clinico"] ?? ""),
  mes: String(r["Mês"] ?? r["Mes"] ?? ""),
  turno: String(r["Turno Escala"] ?? ""),
}));

// Full file
let total = rows.length;
let aura = 0;
let withReturn = 0;
let unitAct = 0;
let outcomes = 0;

const onlyUnit = [];
const onlyReturn = [];
const both = [];
const neitherButAura = [];

for (const row of rows) {
  const ua = hasUnitAction(row);
  const tr = isAura(row) && hasTriagem(row);
  const al = isAura(row);

  if (ua) unitAct++;
  if (al) aura++;
  if (tr) withReturn++;

  if (hasRegisteredOutcome(row)) outcomes++;

  if (ua && !tr) onlyUnit.push(row);
  if (tr && !ua) onlyReturn.push(row);
  if (ua && tr) both.push(row);
  if (al && !ua && !tr) neitherButAura.push(row);
}

console.log("=== ARQUIVO INTEIRO ===");
console.log({
  total,
  aura,
  alertsWithReturn: withReturn,
  unitActions: unitAct,
  registeredOutcomes: outcomes,
  sumReturnNoReturn: withReturn + (aura - withReturn),
});

console.log("\n=== CRUZAMENTO ===");
console.log({
  both_unit_and_return: both.length,
  only_unitAction_not_alertReturn: onlyUnit.length,
  only_alertReturn_not_unitAction: onlyReturn.length,
});

console.log("\n--- Só ATUAÇÃO (não entra em alerta com retorno) ---");
for (const r of onlyUnit.slice(0, 15)) {
  console.log({
    line: r.line,
    paciente: r.paciente.slice(0, 40),
    alertado: r.alertado || "(vazio)",
    alteracao: r.alteracao ? r.alteracao.slice(0, 50) : "(vazio)",
    acaoAura: r.acaoAura.slice(0, 60),
    reason: !isAura(r)
      ? "nao e alerta AURA"
      : !norm(r.alteracao)
        ? "sem alteracao clinica"
        : !norm(r.acaoAura)
          ? "acao aura vazia"
          : NO_RETURN_PHRASES.some((p) => norm(r.acaoAura).includes(p))
            ? "sem retorno na acao"
            : "outro",
  });
}
if (onlyUnit.length > 15) console.log(`... +${onlyUnit.length - 15} linhas`);

console.log("\n--- Só ALERTA COM RETORNO (não entra em atuação) ---");
for (const r of onlyReturn.slice(0, 15)) {
  console.log({
    line: r.line,
    paciente: r.paciente.slice(0, 40),
    acaoAura: r.acaoAura.slice(0, 80),
  });
}
if (onlyReturn.length > 15) console.log(`... +${onlyReturn.length - 15} linhas`);

// Breakdown onlyUnit by reason
const reasons = { notAura: 0, noAlteracao: 0, semRetorno: 0, emptyAcao: 0, other: 0 };
for (const r of onlyUnit) {
  if (!isAura(r)) reasons.notAura++;
  else if (!norm(r.alteracao)) reasons.noAlteracao++;
  else if (!norm(r.acaoAura)) reasons.emptyAcao++;
  else if (NO_RETURN_PHRASES.some((p) => norm(r.acaoAura).includes(p)))
    reasons.semRetorno++;
  else reasons.other++;
}
console.log("\n--- Motivos: só atuação ---", reasons);

// Try filter mes=5 or 05 for dashboard-like 290
const mes5 = rows.filter((r) => r.mes === "5" || r.mes === "05" || r.mes === "5 ");
const mes5NoNight = mes5.filter(
  (r) => !["NOITE", "MADRUGADA"].includes((r.turno || "").toUpperCase())
);

for (const [label, subset] of [
  ["mes=5", mes5],
  ["mes=5 sem noite/madruga", mes5NoNight],
]) {
  let a = 0,
    wr = 0,
    u = 0;
  const ou = [];
  for (const row of subset) {
    const ua = hasUnitAction(row);
    const tr = isAura(row) && hasTriagem(row);
    if (isAura(row)) a++;
    if (tr) wr++;
    if (ua) u++;
    if (ua && !tr) ou.push(row);
  }
  console.log(`\n=== ${label} (n=${subset.length}) ===`);
  console.log({ aura: a, withReturn: wr, unitActions: u, onlyUnit: ou.length });
}

// Unique Ação AURA values for onlyReturn
const acaoValues = new Map();
for (const r of onlyReturn) {
  const k = r.acaoAura.trim() || "(vazio)";
  acaoValues.set(k, (acaoValues.get(k) || 0) + 1);
}
console.log("\n--- Valores Ação AURA (só retorno, sem atuação) ---");
console.log([...acaoValues.entries()].sort((a, b) => b[1] - a[1]));
