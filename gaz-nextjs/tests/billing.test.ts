import { describe, expect, it } from "vitest";

import { calculateBilling } from "../lib/billing";

describe("calculateBilling", () => {
  it("computes totals with VAT", () => {
    const result = calculateBilling({
      previousReading: 100,
      currentReading: 120,
      pcs: 10.5,
      gasPriceMwh: 170,
      transportPriceMwh: 10,
      distributionPriceMwh: 70,
      cap26PriceMwh: -20,
      cap6PriceMwh: -0.1,
      fixedFee: 5,
      vatRate: 0.21,
      includeVat: true
    });

    expect(result.consumptionM3).toBeCloseTo(20, 8);
    expect(result.consumptionKwh).toBeCloseTo(210, 8);
    expect(result.consumptionMwh).toBeCloseTo(0.21, 8);
    expect(result.subtotal).toBeCloseTo(53.279, 3);
    expect(result.vat).toBeCloseTo(11.18859, 5);
    expect(result.total).toBeCloseTo(64.46759, 5);
  });

  it("sets VAT to zero when includeVat is false", () => {
    const result = calculateBilling({
      previousReading: 200,
      currentReading: 210,
      pcs: 10,
      gasPriceMwh: 150,
      transportPriceMwh: 10,
      distributionPriceMwh: 60,
      cap26PriceMwh: -10,
      cap6PriceMwh: 0,
      fixedFee: 0,
      vatRate: 0.21,
      includeVat: false
    });

    expect(result.vat).toBe(0);
    expect(result.total).toBeCloseTo(result.subtotal, 8);
    expect(result.pricePerKwhWithVat).toBeCloseTo(result.pricePerKwh, 8);
    expect(result.pricePerM3WithVat).toBeCloseTo(result.pricePerM3, 8);
  });
});
