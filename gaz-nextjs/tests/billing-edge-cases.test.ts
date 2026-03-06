import { describe, expect, it } from "vitest";

import { calculateBilling } from "../lib/billing";

const BASE_INPUT = {
  previousReading: 100,
  currentReading: 110,
  pcs: 10.5,
  gasPriceMwh: 170,
  transportPriceMwh: 10,
  distributionPriceMwh: 70,
  cap26PriceMwh: -20,
  cap6PriceMwh: -0.1,
  fixedFee: 5,
  vatRate: 0.19,
  includeVat: true
};

describe("calculateBilling edge cases", () => {
  it("handles zero consumption", () => {
    const result = calculateBilling({
      ...BASE_INPUT,
      previousReading: 100,
      currentReading: 100
    });
    expect(result.consumptionM3).toBe(0);
    expect(result.consumptionKwh).toBe(0);
    expect(result.consumptionMwh).toBe(0);
    expect(result.variableCost).toBe(0);
    expect(result.subtotal).toBe(5); // fixedFee only
  });

  it("handles negative consumption (meter rollback)", () => {
    const result = calculateBilling({
      ...BASE_INPUT,
      previousReading: 110,
      currentReading: 100
    });
    expect(result.consumptionM3).toBe(-10);
    expect(result.total).toBeLessThan(0);
  });

  it("handles very large readings", () => {
    const result = calculateBilling({
      ...BASE_INPUT,
      previousReading: 99990,
      currentReading: 100000
    });
    expect(result.consumptionM3).toBe(10);
    expect(result.total).toBeGreaterThan(0);
    expect(Number.isFinite(result.total)).toBe(true);
  });

  it("handles zero PCS", () => {
    const result = calculateBilling({
      ...BASE_INPUT,
      pcs: 0
    });
    expect(result.consumptionKwh).toBe(0);
    expect(result.consumptionMwh).toBe(0);
  });

  it("handles zero VAT rate with includeVat true", () => {
    const result = calculateBilling({
      ...BASE_INPUT,
      vatRate: 0,
      includeVat: true
    });
    expect(result.vat).toBe(0);
    expect(result.total).toBe(result.subtotal);
  });

  it("handles zero fixedFee", () => {
    const result = calculateBilling({
      ...BASE_INPUT,
      fixedFee: 0
    });
    expect(result.subtotal).toBe(result.variableCost);
  });

  it("all breakdown items sum to variableCost", () => {
    const result = calculateBilling(BASE_INPUT);
    const breakdownSum =
      result.breakdown.gas.value +
      result.breakdown.transport.value +
      result.breakdown.distribution.value +
      result.breakdown.cap26.value +
      result.breakdown.cap6.value;
    expect(breakdownSum).toBeCloseTo(result.variableCost, 10);
  });

  it("subtotal equals variableCost + fixedFee", () => {
    const result = calculateBilling(BASE_INPUT);
    expect(result.subtotal).toBeCloseTo(result.variableCost + result.fixedFee, 10);
  });

  it("total equals subtotal + vat", () => {
    const result = calculateBilling(BASE_INPUT);
    expect(result.total).toBeCloseTo(result.subtotal + result.vat, 10);
  });

  it("pricePerKwhWithVat equals pricePerKwh * (1 + vatRate) when VAT included", () => {
    const result = calculateBilling(BASE_INPUT);
    expect(result.pricePerKwhWithVat).toBeCloseTo(
      result.pricePerKwh * (1 + BASE_INPUT.vatRate),
      10
    );
  });
});
