import { describe, expect, it } from "vitest";
import {
  parseBusinessUnit,
  resolveBusinessUnit,
} from "@/lib/dashboard/businessUnit";
import { applyFilters } from "@/lib/dashboard/applyFilters";
import type { PatientRecord } from "@/lib/dashboard/types";

function record(unit: string | null): PatientRecord {
  return {
    date: "2026-07-15",
    unit,
  } as PatientRecord;
}

describe("resolveBusinessUnit", () => {
  it("classifies Anery - AHC as Domiciliar", () => {
    expect(resolveBusinessUnit("AHC")).toBe("domiciliar");
    expect(resolveBusinessUnit("Anery")).toBe("domiciliar");
    expect(resolveBusinessUnit("Anery AHC")).toBe("domiciliar");
    expect(resolveBusinessUnit("Anery - AHC")).toBe("domiciliar");
    expect(resolveBusinessUnit("  ANERY – AHC ")).toBe("domiciliar");
  });

  it("classifies every other named unit as Transição", () => {
    expect(resolveBusinessUnit("Unidade Centro")).toBe("transicao");
    expect(resolveBusinessUnit("ABV")).toBe("transicao");
  });

  it("does not classify blank units", () => {
    expect(resolveBusinessUnit(null)).toBeNull();
    expect(resolveBusinessUnit("")).toBeNull();
  });
});

describe("parseBusinessUnit", () => {
  it("accepts only supported query values", () => {
    expect(parseBusinessUnit("domiciliar")).toBe("domiciliar");
    expect(parseBusinessUnit("transicao")).toBe("transicao");
    expect(parseBusinessUnit("outro")).toBeUndefined();
  });
});

describe("applyFilters business unit", () => {
  const records = [
    record("AHC"),
    record("ABV"),
    record("Unidade Centro"),
    record(null),
  ];

  it("returns only AHC for Domiciliar", () => {
    expect(applyFilters(records, { businessUnit: "domiciliar" })).toHaveLength(1);
    expect(
      applyFilters(records, { businessUnit: "domiciliar" })[0].unit
    ).toBe("AHC");
  });

  it("returns all named non-Anery units for Transição", () => {
    expect(applyFilters(records, { businessUnit: "transicao" })).toHaveLength(2);
  });

  it("combines business-unit and unit filters", () => {
    const filtered = applyFilters(records, {
      businessUnit: "transicao",
      unit: "ABV",
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].unit).toBe("ABV");
  });
});
