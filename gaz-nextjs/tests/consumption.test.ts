import { describe, expect, it } from "vitest";

import { aggregateMonthlyConsumption, compareConsumptionPeriods } from "../lib/consumption";
import { HistoryEntry } from "../lib/types";

const reading = (overrides: Partial<HistoryEntry>): HistoryEntry => ({
  id: "reading",
  previousReading: 0,
  currentReading: 10,
  consumptionM3: 10,
  consumptionKwh: 105,
  pricePerKwh: 0.3,
  pricePerM3: 3,
  conversionFactor: 10.5,
  fixedFee: 0,
  includeVat: true,
  subtotal: 30,
  vat: 6,
  total: 36,
  isBaseline: false,
  readingType: "SELF_READING",
  readingAt: "2026-01-01T10:00:00.000Z",
  createdAt: "2026-01-01T10:00:00.000Z",
  ...overrides
});

describe("aggregateMonthlyConsumption", () => {
  it("cumulates multiple readings in the same calendar month", () => {
    const result = aggregateMonthlyConsumption([
      reading({ consumptionM3: 10, consumptionKwh: 105, total: 36, readingAt: "2026-01-05T10:00:00.000Z" }),
      reading({ id: "reading-2", consumptionM3: 12, consumptionKwh: 126, total: 42, readingAt: "2026-01-25T10:00:00.000Z" })
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ consumptionM3: 22, consumptionKwh: 231, total: 78 });
  });

  it("uses creation time for readings created before readingAt existed", () => {
    const legacyReading = reading({ readingAt: "not-a-date", createdAt: "2026-02-03T10:00:00.000Z" });

    expect(aggregateMonthlyConsumption([legacyReading])[0].key).toBe("2026-02");
  });

  it("excludes the initial meter index from consumption totals", () => {
    const result = aggregateMonthlyConsumption([reading({ isBaseline: true })]);

    expect(result).toEqual([]);
  });
});

describe("compareConsumptionPeriods", () => {
  it("compares the latest calendar month with the preceding month and personal average", () => {
    const result = compareConsumptionPeriods([
      reading({ id: "first", consumptionM3: 10, readingAt: "2026-01-05T10:00:00.000Z" }),
      reading({ id: "second", consumptionM3: 20, readingAt: "2026-02-05T10:00:00.000Z" })
    ]);

    expect(result).toMatchObject({ currentM3: 20, previousM3: 10, previousChangePercent: 100, averageM3: 10, averageChangePercent: 100 });
  });
});
