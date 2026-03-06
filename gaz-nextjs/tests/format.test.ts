import { describe, expect, it } from "vitest";

import { formatCurrency, formatIndex } from "../lib/format";

describe("formatCurrency", () => {
  it("formats positive RON values", () => {
    const result = formatCurrency(123.45);
    expect(result).toContain("123");
    expect(result).toContain("45");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0");
  });

  it("formats negative values", () => {
    const result = formatCurrency(-10.5);
    expect(result).toContain("10");
  });
});

describe("formatIndex", () => {
  it("returns dash for null", () => {
    expect(formatIndex(null)).toBe("-");
  });

  it("returns dash for NaN", () => {
    expect(formatIndex(NaN)).toBe("-");
  });

  it("formats integer with 3 decimal places", () => {
    const result = formatIndex(12345);
    expect(result).toContain("12");
    expect(result).toContain("345");
    expect(result).toContain("000");
  });

  it("formats decimal values", () => {
    const result = formatIndex(100.5);
    expect(result).toContain("100");
    expect(result).toContain("500");
  });

  it("formats zero", () => {
    const result = formatIndex(0);
    expect(result).toContain("0");
  });
});
