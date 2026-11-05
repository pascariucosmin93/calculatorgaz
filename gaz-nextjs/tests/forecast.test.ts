import { describe, expect, it } from "vitest";
import { forecastCurrentMonth } from "@/lib/forecast";
import { HistoryEntry } from "@/lib/types";

const entry = (overrides: Partial<HistoryEntry>): HistoryEntry => ({
  id: "reading", previousReading: 0, currentReading: 0, consumptionM3: 0, consumptionKwh: 0,
  pricePerKwh: 0, pricePerM3: 0, conversionFactor: 10, fixedFee: 0, includeVat: false,
  subtotal: 0, vat: 0, total: 0, isBaseline: false, readingType: "SELF_READING",
  readingAt: "2026-03-01T12:00:00.000Z", createdAt: "2026-03-01T12:00:00.000Z", ...overrides
});

const tariffs = { pcs: 10, gasPriceMwh: 1000, transportPriceMwh: 0, distributionPriceMwh: 0, cap26PriceMwh: 0, cap6PriceMwh: 0, fixedFee: 0, vatRate: 0, includeVat: false };

describe("forecastCurrentMonth", () => {
  it("projects the calendar month from the daily rate of completed periods", () => {
    const forecast = forecastCurrentMonth([
      entry({ isBaseline: true, readingAt: "2026-03-01T12:00:00.000Z" }),
      entry({ id: "period", consumptionM3: 60, readingAt: "2026-03-11T12:00:00.000Z" })
    ], tariffs, new Date("2026-03-15T12:00:00.000Z"));

    expect(forecast?.dailyAverageM3).toBe(6);
    expect(forecast?.projectedConsumptionM3).toBe(186);
    expect(forecast?.projectedTotal).toBe(1860);
  });

  it("returns no forecast before a calculated period exists", () => {
    expect(forecastCurrentMonth([entry({ isBaseline: true })], tariffs)).toBeNull();
  });
});
