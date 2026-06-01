"""
Validate dashboard numbers against the source CSV.

Usage: python scripts/validate_dashboard.py
"""
from __future__ import annotations

import sys
import unicodedata
from pathlib import Path

import pandas as pd

CSV_PATH = Path("Paciente Watcher - Maio Fechado 2 - Sem Noite e Madruga 1.csv")

# Column positions (1-based) per spec
COL_DATA = 1
COL_PACIENTE = 2
COL_UNIDADE = 5
COL_ALERTADO = 24
COL_INTERVENCAO = 26
COL_ALTERACAO = 32
COL_DESFECHO = 33
COL_ACAO_INI = 34
COL_ACAO_AURA = 36


# ------------------------- helpers -------------------------

EMPTY_TOKENS = {"", "n/a", "na", "n.a.", "-", "--"}


def normalize(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and pd.isna(value):
        return ""
    s = str(value).strip().lower()
    # remove diacritics
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    if s in EMPTY_TOKENS:
        return ""
    return s


def parse_date_iso(value) -> str:
    s = "" if value is None else str(value).strip()
    if not s or s.lower() in EMPTY_TOKENS:
        return ""
    # DD/MM/YYYY
    parts = s.split("/")
    if len(parts) == 3:
        d, m, y = parts
        d = d.zfill(2)
        m = m.zfill(2)
        if len(y) == 2:
            y = "20" + y
        return f"{y}-{m}-{d}"
    return ""


def month_of(value) -> int | None:
    s = "" if value is None else str(value).strip()
    if not s:
        return None
    parts = s.split("/")
    if len(parts) == 3:
        try:
            return int(parts[1])
        except ValueError:
            return None
    return None


# ------------------------- classification rules -------------------------

def is_aura_alert(row) -> bool:
    return normalize(row["alertado"]) in {"sim", "yes", "1", "true"}


def has_triagem(row) -> bool:
    iv = normalize(row["intervencao"])
    if iv != "":
        return iv == "sim" or iv == "reavaliacao"
    # fallback chain
    alt = normalize(row["alteracao"])
    if alt == "":
        return False
    out = normalize(row["desfecho"])
    if out != "":
        return True
    aura_action = normalize(row["acao_aura"])
    if aura_action == "":
        return False
    if "sem retorno" in aura_action or "nao realizada, sem retorno" in aura_action:
        return False
    return True


def com_retorno_bucket(row) -> tuple[str, str]:
    """Returns (group, sub) for AURA + hasTriagem records.
    group in {aguda, esperada, outros}. sub is sub-bucket label.
    """
    alt = normalize(row["alteracao"])
    out = normalize(row["desfecho"])
    if "aguda" in alt:
        if "melhora" in out:
            return ("aguda", "melhoraClinica")
        if "finitude" in out:
            return ("aguda", "finitude")
        if "reinternac" in out or "reinterc" in out:
            return ("aguda", "reinternacao")
        if "erro" in out:
            return ("aguda", "erroRegistro")
        return ("aguda", "semInformacao")
    if "transitoria" in alt or "esperada" in alt:
        if "melhora" in out or "estabiliz" in out:
            return ("esperada", "melhoraClinica")
        if "condicao basal" in out or out == "basal" or " basal" in (" " + out):
            # "condicao basal" or just "basal"
            return ("esperada", "condicaoBasal")
        if "sem retorno" in out:
            return ("esperada", "semRetorno")
        if "erro" in out:
            return ("esperada", "erroRegistro")
        if "finitude" in out:
            return ("esperada", "finitude")
        return ("esperada", "semInformacao")
    return ("outros", "outros")


def sem_retorno_bucket(row) -> str:
    a = normalize(row["acao_ini"])
    if "finitude" in a or "erro de registro" in a or "erro de digit" in a or "notificado erro" in a:
        return "semInformacao"
    if "contato telefon" in a:
        return "semContatoTelefonico"
    if "unidade" in a and "sem ret" in a:
        return "unidadeNaoRespondeu"
    if a == "":
        return "semInformacao"
    return "semInformacao"


def is_acute(alt: str) -> bool:
    return "descompensacao aguda" in alt or "descompensação aguda" in alt or "aguda" in alt and "transitoria" not in alt


def is_transient(alt: str) -> bool:
    keys = [
        "descompensacao transitoria basal",
        "descompensacao transitoria estavel",
        "descompensacao transitoria esperada",
        "descompensacao transitoria",
    ]
    return any(k in alt for k in keys)


def transient_outcome_class(out: str) -> str | None:
    if "condicao basal" in out or out == "basal":
        return "basal"
    if "melhora" in out:
        return "comIntervencao"
    if "estabiliza" in out:
        return "estavel"
    return None


def has_unit_action(aura_action: str) -> bool:
    if aura_action == "":
        return False
    if "sem retorno" in aura_action:
        return False
    indicators = ["realizada", "reavaliacao", "intervencao", "estabilizacao", "melhora"]
    return any(ind in aura_action for ind in indicators)


def favorable_outcome(out: str) -> bool:
    return ("melhora" in out) or ("condicao basal" in out) or ("estabilizacao" in out)


def in_monitoring(out: str) -> bool:
    return ("em monitoramento" in out) or ("monitorando" in out)


# ------------------------- main -------------------------

def main() -> int:
    print("=" * 80)
    print("DASHBOARD VALIDATION REPORT")
    print("=" * 80)

    # Load CSV
    try:
        df = pd.read_csv(CSV_PATH, sep=";", encoding="utf-8", dtype=str, keep_default_na=False)
        enc = "utf-8"
    except UnicodeDecodeError:
        df = pd.read_csv(CSV_PATH, sep=";", encoding="latin-1", dtype=str, keep_default_na=False)
        enc = "latin-1"
    print(f"Loaded CSV ({enc}). Total rows: {len(df)}  /  Columns: {len(df.columns)}")

    # Extract relevant columns by 1-based position
    cols = df.columns.tolist()

    def col(idx: int) -> str:
        return cols[idx - 1]

    work = pd.DataFrame({
        "data": df[col(COL_DATA)],
        "paciente": df[col(COL_PACIENTE)],
        "unidade": df[col(COL_UNIDADE)],
        "alertado": df[col(COL_ALERTADO)],
        "intervencao": df[col(COL_INTERVENCAO)],
        "alteracao": df[col(COL_ALTERACAO)],
        "desfecho": df[col(COL_DESFECHO)],
        "acao_ini": df[col(COL_ACAO_INI)],
        "acao_aura": df[col(COL_ACAO_AURA)],
    })

    work["unidade_n"] = work["unidade"].map(normalize)
    work["data_month"] = work["data"].map(month_of)
    work["data_iso"] = work["data"].map(parse_date_iso)
    work["paciente_n"] = work["paciente"].map(normalize)

    # Filter: May & AHC
    scope = work[(work["data_month"] == 5) & (work["unidade_n"] == "ahc")].copy()
    print(f"After filter (May + AHC): {len(scope)} rows")

    # Pre-compute classification fields
    scope["alertado_n"] = scope["alertado"].map(normalize)
    scope["alteracao_n"] = scope["alteracao"].map(normalize)
    scope["desfecho_n"] = scope["desfecho"].map(normalize)
    scope["intervencao_n"] = scope["intervencao"].map(normalize)
    scope["acao_ini_n"] = scope["acao_ini"].map(normalize)
    scope["acao_aura_n"] = scope["acao_aura"].map(normalize)

    scope["is_aura"] = scope.apply(is_aura_alert, axis=1)
    print(f"Rows where Alertado AURA = Sim (scope): {int(scope['is_aura'].sum())}")

    scope["has_triagem"] = scope.apply(lambda r: has_triagem(r) if r["is_aura"] else False, axis=1)

    aura = scope[scope["is_aura"]].copy()
    com_ret = aura[aura["has_triagem"]].copy()
    sem_ret = aura[~aura["has_triagem"]].copy()

    # =============== EXPECTED ===============
    expected = {}

    # AURA Alert Split
    expected["aura_total"] = 268
    expected["com_retorno"] = 114
    expected["sem_retorno"] = 154

    # COM RETORNO breakdown
    expected["cr_aguda_total"] = 6
    expected["cr_aguda_melhora"] = 0
    expected["cr_aguda_finitude"] = 2
    expected["cr_aguda_reinternacao"] = 1
    expected["cr_aguda_erro"] = 0
    expected["cr_aguda_seminfo"] = 3

    expected["cr_esp_total"] = 107
    expected["cr_esp_melhora"] = 80
    expected["cr_esp_basal"] = 17
    expected["cr_esp_semretorno"] = 0
    expected["cr_esp_erro"] = 3
    expected["cr_esp_finitude"] = 0
    expected["cr_esp_seminfo"] = 7

    expected["cr_outros"] = 1

    # SEM RETORNO
    expected["sr_unidade"] = 83
    expected["sr_contato_tel"] = 43
    expected["sr_seminfo"] = 28

    # Indicadores Clinicos
    expected["patient_days_total"] = 240
    expected["sem_descomp"] = 130
    expected["transient_pd"] = 106
    expected["acute_unique"] = 4

    expected["trans_basal"] = 16
    expected["trans_intervencao"] = 68
    expected["trans_estavel"] = 13
    expected["trans_outros"] = 9
    expected["trans_effective"] = 101

    expected["acute_reverteu"] = 1
    expected["acute_nao_reverteu"] = 2
    expected["acute_monitor"] = 1
    expected["internacoes_evitadas"] = 1

    # =============== COM RETORNO buckets ===============
    cr_counts = {
        ("aguda", "melhoraClinica"): 0,
        ("aguda", "finitude"): 0,
        ("aguda", "reinternacao"): 0,
        ("aguda", "erroRegistro"): 0,
        ("aguda", "semInformacao"): 0,
        ("esperada", "melhoraClinica"): 0,
        ("esperada", "condicaoBasal"): 0,
        ("esperada", "semRetorno"): 0,
        ("esperada", "erroRegistro"): 0,
        ("esperada", "finitude"): 0,
        ("esperada", "semInformacao"): 0,
        ("outros", "outros"): 0,
    }
    cr_records: dict[tuple[str, str], list] = {k: [] for k in cr_counts}
    for _, r in com_ret.iterrows():
        g, s = com_retorno_bucket(r)
        cr_counts[(g, s)] = cr_counts.get((g, s), 0) + 1
        cr_records.setdefault((g, s), []).append(r)

    cr_aguda_total = sum(v for (g, _), v in cr_counts.items() if g == "aguda")
    cr_esp_total = sum(v for (g, _), v in cr_counts.items() if g == "esperada")
    cr_outros = cr_counts[("outros", "outros")]

    # =============== SEM RETORNO buckets ===============
    sr_counts = {"unidadeNaoRespondeu": 0, "semContatoTelefonico": 0, "semInformacao": 0}
    sr_records: dict[str, list] = {k: [] for k in sr_counts}
    for _, r in sem_ret.iterrows():
        b = sem_retorno_bucket(r)
        sr_counts[b] = sr_counts.get(b, 0) + 1
        sr_records.setdefault(b, []).append(r)

    # =============== Patient-days ===============
    pd_pairs = set()
    for _, r in scope.iterrows():
        if r["data_iso"] and r["paciente_n"]:
            pd_pairs.add((r["paciente_n"], r["data_iso"]))
    total_patient_days = len(pd_pairs)

    # Acute unique patients
    acute_records = scope[scope["alteracao_n"].str.contains("descompensacao aguda", na=False)].copy()
    acute_patients = sorted(set(acute_records["paciente_n"]))

    # determine per-patient outcome
    def acute_patient_outcome(records: pd.DataFrame) -> str:
        # priority: nao_reverteu > reverteu > monitoramento
        result = None
        for _, r in records.iterrows():
            out = r["desfecho_n"]
            if favorable_outcome(out) and not in_monitoring(out):
                cand = "reverteu"
            elif in_monitoring(out):
                cand = "monitoramento"
            else:
                cand = "nao_reverteu"
            if cand == "nao_reverteu":
                return "nao_reverteu"
            if cand == "reverteu":
                result = "reverteu"
            elif cand == "monitoramento" and result is None:
                result = "monitoramento"
        return result or "monitoramento"

    acute_outcome_by_patient: dict[str, str] = {}
    for p in acute_patients:
        recs = acute_records[acute_records["paciente_n"] == p]
        acute_outcome_by_patient[p] = acute_patient_outcome(recs)

    acute_reverteu = sum(1 for o in acute_outcome_by_patient.values() if o == "reverteu")
    acute_nao_reverteu = sum(1 for o in acute_outcome_by_patient.values() if o == "nao_reverteu")
    acute_monitor = sum(1 for o in acute_outcome_by_patient.values() if o == "monitoramento")

    # Transient patient-days
    trans_mask = scope["alteracao_n"].apply(is_transient)
    trans_records = scope[trans_mask].copy()
    trans_pd_pairs = set()
    trans_pd_class: dict[tuple[str, str], str] = {}
    # For each patient-day, priority basal > comIntervencao > estavel
    priority = {"basal": 3, "comIntervencao": 2, "estavel": 1}
    for _, r in trans_records.iterrows():
        if not r["data_iso"] or not r["paciente_n"]:
            continue
        key = (r["paciente_n"], r["data_iso"])
        trans_pd_pairs.add(key)
        cls = transient_outcome_class(r["desfecho_n"])
        if cls is None:
            continue
        cur = trans_pd_class.get(key)
        if cur is None or priority[cls] > priority[cur]:
            trans_pd_class[key] = cls
    transient_pd_total = len(trans_pd_pairs)
    trans_basal = sum(1 for v in trans_pd_class.values() if v == "basal")
    trans_intervencao = sum(1 for v in trans_pd_class.values() if v == "comIntervencao")
    trans_estavel = sum(1 for v in trans_pd_class.values() if v == "estavel")
    trans_outros = transient_pd_total - trans_basal - trans_intervencao - trans_estavel

    # Transient effective: distinct transient patient-days with unit action
    trans_effective_pairs: set[tuple[str, str]] = set()
    for _, r in trans_records.iterrows():
        if not r["data_iso"] or not r["paciente_n"]:
            continue
        key = (r["paciente_n"], r["data_iso"])
        if key not in trans_pd_pairs:
            continue
        if has_unit_action(r["acao_aura_n"]):
            trans_effective_pairs.add(key)
    trans_effective = len(trans_effective_pairs)

    # Internações evitadas: distinct patient-days with acute + unit action + favorable outcome
    evitadas: set[tuple[str, str]] = set()
    for _, r in acute_records.iterrows():
        if not r["data_iso"] or not r["paciente_n"]:
            continue
        if has_unit_action(r["acao_aura_n"]) and favorable_outcome(r["desfecho_n"]):
            evitadas.add((r["paciente_n"], r["data_iso"]))
    internacoes_evitadas = len(evitadas)

    # sem_descompensacao patient-days: pairs where NO record for that patient-day has any descompensation (aguda or transitoria)
    # Build set of patient-days that have any descompensation
    descomp_pds: set[tuple[str, str]] = set()
    for _, r in scope.iterrows():
        if not r["data_iso"] or not r["paciente_n"]:
            continue
        alt = r["alteracao_n"]
        if "descompensacao aguda" in alt or is_transient(alt):
            descomp_pds.add((r["paciente_n"], r["data_iso"]))
    sem_descompensacao_pd = total_patient_days - len(descomp_pds)

    # =============== Print tables ===============
    def print_table(title: str, rows: list[tuple[str, int, int]]):
        print()
        print(f"SECTION: {title}")
        header = ("Metric", "Expected", "Calculated", "Match", "Diff")
        widths = [42, 10, 12, 7, 8]
        line = "+" + "+".join("-" * (w + 2) for w in widths) + "+"
        print(line)
        print("| " + " | ".join(h.ljust(w) for h, w in zip(header, widths)) + " |")
        print(line)
        for metric, exp, calc in rows:
            diff = calc - exp
            match = "OK" if diff == 0 else "FAIL"
            sign = "+" if diff > 0 else ""
            print("| " + " | ".join([
                metric.ljust(widths[0]),
                str(exp).rjust(widths[1]),
                str(calc).rjust(widths[2]),
                match.ljust(widths[3]),
                f"{sign}{diff}".rjust(widths[4]),
            ]) + " |")
        print(line)

    aura_total = int(aura.shape[0])
    com_total = int(com_ret.shape[0])
    sem_total = int(sem_ret.shape[0])

    print_table("AURA Alert Split", [
        ("Alertas AURA total", expected["aura_total"], aura_total),
        ("Com retorno",         expected["com_retorno"], com_total),
        ("Sem retorno",         expected["sem_retorno"], sem_total),
    ])

    print_table("COM RETORNO - Descompensacao Aguda", [
        ("Aguda total",                expected["cr_aguda_total"], cr_aguda_total),
        ("  Melhora clinica",          expected["cr_aguda_melhora"], cr_counts[("aguda","melhoraClinica")]),
        ("  Finitude",                 expected["cr_aguda_finitude"], cr_counts[("aguda","finitude")]),
        ("  Reinternacao",             expected["cr_aguda_reinternacao"], cr_counts[("aguda","reinternacao")]),
        ("  Erro de registro",         expected["cr_aguda_erro"], cr_counts[("aguda","erroRegistro")]),
        ("  Sem informacao",           expected["cr_aguda_seminfo"], cr_counts[("aguda","semInformacao")]),
    ])

    print_table("COM RETORNO - Transitoria Esperada", [
        ("Esperada total",             expected["cr_esp_total"], cr_esp_total),
        ("  Melhora/Estabilizacao",    expected["cr_esp_melhora"], cr_counts[("esperada","melhoraClinica")]),
        ("  Condicao basal",           expected["cr_esp_basal"], cr_counts[("esperada","condicaoBasal")]),
        ("  Sem retorno",              expected["cr_esp_semretorno"], cr_counts[("esperada","semRetorno")]),
        ("  Erro de registro",         expected["cr_esp_erro"], cr_counts[("esperada","erroRegistro")]),
        ("  Finitude",                 expected["cr_esp_finitude"], cr_counts[("esperada","finitude")]),
        ("  Sem informacao",           expected["cr_esp_seminfo"], cr_counts[("esperada","semInformacao")]),
    ])

    print_table("COM RETORNO - Outros", [
        ("Outros/sem alteracao",       expected["cr_outros"], cr_outros),
    ])

    print_table("SEM RETORNO", [
        ("Sem retorno da unidade",     expected["sr_unidade"],     sr_counts["unidadeNaoRespondeu"]),
        ("Sem contato telefonico",     expected["sr_contato_tel"], sr_counts["semContatoTelefonico"]),
        ("Sem informacao",             expected["sr_seminfo"],     sr_counts["semInformacao"]),
    ])

    print_table("Indicadores Clinicos", [
        ("Pacientes-dia no recorte",   expected["patient_days_total"], total_patient_days),
        ("Sem descompensacao (pd)",    expected["sem_descomp"], sem_descompensacao_pd),
        ("Transitoria (pd)",           expected["transient_pd"], transient_pd_total),
        ("Aguda (unique patients)",    expected["acute_unique"], len(acute_patients)),
    ])

    print_table("Descompensacao Transitoria (pd)", [
        ("Basal",                      expected["trans_basal"], trans_basal),
        ("Com intervencao",            expected["trans_intervencao"], trans_intervencao),
        ("Estavel",                    expected["trans_estavel"], trans_estavel),
        ("Outros desfechos",           expected["trans_outros"], trans_outros),
        ("Atuacao efetiva",            expected["trans_effective"], trans_effective),
    ])

    print_table("Descompensacao Aguda (unique patients)", [
        ("Reverteu",                   expected["acute_reverteu"], acute_reverteu),
        ("Nao reverteu",               expected["acute_nao_reverteu"], acute_nao_reverteu),
        ("Monitoramento",              expected["acute_monitor"], acute_monitor),
        ("Internacoes evitadas",       expected["internacoes_evitadas"], internacoes_evitadas),
    ])

    # =============== Acute patients list ===============
    print()
    print("ACUTE PATIENTS DETAIL (unique, normalized name -> outcome)")
    print("-" * 80)
    expected_acute_names = {
        "damiana maria de oliveira": "nao_reverteu",
        "julio cesar jorge isidorio": "nao_reverteu",
        "edna hamada": "reverteu",
        "gaucile denize leme": "monitoramento",
    }
    found_set = set()
    for p in acute_patients:
        recs = acute_records[acute_records["paciente_n"] == p]
        outcome = acute_outcome_by_patient[p]
        dates = sorted(set(recs["data_iso"]))
        # Display a friendly name (take first non-empty original)
        display = recs["paciente"].iloc[0]
        expected_o = expected_acute_names.get(p, "<NOT IN EXPECTED LIST>")
        match = "OK" if expected_o == outcome else "FAIL"
        print(f"  - {display}  ({p})")
        print(f"      days={len(dates)}  dates={dates}")
        print(f"      calculated outcome: {outcome}   expected: {expected_o}  [{match}]")
        found_set.add(p)
    missing = [n for n in expected_acute_names if n not in found_set]
    extra = [n for n in found_set if n not in expected_acute_names]
    if missing:
        print(f"  MISSING expected names: {missing}")
    if extra:
        print(f"  EXTRA names not in expected list: {extra}")

    # =============== Mismatch diagnostics ===============
    print()
    print("=" * 80)
    print("DIAGNOSTIC DUMPS for mismatched categories (sample up to 10 rows)")
    print("=" * 80)

    def dump_records(label: str, records: list, limit: int = 10):
        print()
        print(f"-- {label} (n={len(records)}) --")
        for i, r in enumerate(records[:limit]):
            print(f"  [{i+1}] {r['data']} | {r['paciente']}")
            print(f"      alteracao : {r['alteracao']!r}")
            print(f"      desfecho  : {r['desfecho']!r}")
            print(f"      interv    : {r['intervencao']!r}")
            print(f"      acao_aura : {r['acao_aura']!r}")
            print(f"      acao_ini  : {r['acao_ini']!r}")
        if len(records) > limit:
            print(f"  ... and {len(records) - limit} more")

    # Compare key categories: dump if mismatched
    checks = [
        ("CR Aguda total", expected["cr_aguda_total"], cr_aguda_total,
            [r for (g, s), recs in cr_records.items() if g == "aguda" for r in recs]),
        ("CR Aguda melhora",     expected["cr_aguda_melhora"],   cr_counts[("aguda","melhoraClinica")],    cr_records[("aguda","melhoraClinica")]),
        ("CR Aguda finitude",    expected["cr_aguda_finitude"],  cr_counts[("aguda","finitude")],          cr_records[("aguda","finitude")]),
        ("CR Aguda reinternacao",expected["cr_aguda_reinternacao"],cr_counts[("aguda","reinternacao")],   cr_records[("aguda","reinternacao")]),
        ("CR Aguda erro",        expected["cr_aguda_erro"],      cr_counts[("aguda","erroRegistro")],      cr_records[("aguda","erroRegistro")]),
        ("CR Aguda seminfo",     expected["cr_aguda_seminfo"],   cr_counts[("aguda","semInformacao")],     cr_records[("aguda","semInformacao")]),
        ("CR Esperada total",    expected["cr_esp_total"],       cr_esp_total,
            [r for (g, s), recs in cr_records.items() if g == "esperada" for r in recs]),
        ("CR Esp melhora",       expected["cr_esp_melhora"],     cr_counts[("esperada","melhoraClinica")], cr_records[("esperada","melhoraClinica")]),
        ("CR Esp basal",         expected["cr_esp_basal"],       cr_counts[("esperada","condicaoBasal")],  cr_records[("esperada","condicaoBasal")]),
        ("CR Esp semretorno",    expected["cr_esp_semretorno"],  cr_counts[("esperada","semRetorno")],     cr_records[("esperada","semRetorno")]),
        ("CR Esp erro",          expected["cr_esp_erro"],        cr_counts[("esperada","erroRegistro")],   cr_records[("esperada","erroRegistro")]),
        ("CR Esp finitude",      expected["cr_esp_finitude"],    cr_counts[("esperada","finitude")],       cr_records[("esperada","finitude")]),
        ("CR Esp seminfo",       expected["cr_esp_seminfo"],     cr_counts[("esperada","semInformacao")],  cr_records[("esperada","semInformacao")]),
        ("CR Outros",            expected["cr_outros"],          cr_outros,                                cr_records[("outros","outros")]),
        ("SR Unidade",           expected["sr_unidade"],         sr_counts["unidadeNaoRespondeu"],         sr_records["unidadeNaoRespondeu"]),
        ("SR Contato telefonico",expected["sr_contato_tel"],     sr_counts["semContatoTelefonico"],        sr_records["semContatoTelefonico"]),
        ("SR Sem informacao",    expected["sr_seminfo"],         sr_counts["semInformacao"],               sr_records["semInformacao"]),
    ]

    any_mismatch = False
    for name, exp, calc, recs in checks:
        if exp != calc:
            any_mismatch = True
            dump_records(f"MISMATCH {name}: expected={exp} calculated={calc}", recs)
    if not any_mismatch:
        print("\nAll category counts match expected values.")

    # =============== Summary footer ===============
    print()
    print("=" * 80)
    print("SUMMARY OF MATCHES")
    print("=" * 80)
    summary = [
        ("AURA total",          expected["aura_total"],       aura_total),
        ("Com retorno",         expected["com_retorno"],      com_total),
        ("Sem retorno",         expected["sem_retorno"],      sem_total),
        ("CR aguda total",      expected["cr_aguda_total"],   cr_aguda_total),
        ("CR esperada total",   expected["cr_esp_total"],     cr_esp_total),
        ("CR outros",           expected["cr_outros"],        cr_outros),
        ("SR unidade",          expected["sr_unidade"],       sr_counts["unidadeNaoRespondeu"]),
        ("SR contato tel",      expected["sr_contato_tel"],   sr_counts["semContatoTelefonico"]),
        ("SR sem info",         expected["sr_seminfo"],       sr_counts["semInformacao"]),
        ("Patient-days",        expected["patient_days_total"], total_patient_days),
        ("Sem descompensacao",  expected["sem_descomp"],      sem_descompensacao_pd),
        ("Transitoria PD",      expected["transient_pd"],     transient_pd_total),
        ("Aguda unique",        expected["acute_unique"],     len(acute_patients)),
        ("Trans basal",         expected["trans_basal"],      trans_basal),
        ("Trans intervencao",   expected["trans_intervencao"],trans_intervencao),
        ("Trans estavel",       expected["trans_estavel"],    trans_estavel),
        ("Trans outros",        expected["trans_outros"],     trans_outros),
        ("Trans effective",     expected["trans_effective"],  trans_effective),
        ("Acute reverteu",      expected["acute_reverteu"],   acute_reverteu),
        ("Acute nao_reverteu",  expected["acute_nao_reverteu"],acute_nao_reverteu),
        ("Acute monitor",       expected["acute_monitor"],    acute_monitor),
        ("Internacoes evit.",   expected["internacoes_evitadas"], internacoes_evitadas),
    ]
    n_match = sum(1 for _, e, c in summary if e == c)
    n_total = len(summary)
    print(f"{n_match}/{n_total} metrics match expected values.")
    for label, e, c in summary:
        mark = "OK  " if e == c else "FAIL"
        print(f"  [{mark}] {label:25s} expected={e:>5}  calc={c:>5}  diff={c-e:+d}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
