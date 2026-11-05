import { HistoryEntry } from "./types";

export type MonthlyConsumption = {
  key: string;
  label: string;
  consumptionM3: number;
  consumptionKwh: number;
  total: number;
};

export type ConsumptionComparison = {
  currentM3: number;
  previousM3: number | null;
  previousChangePercent: number | null;
  averageM3: number | null;
  averageChangePercent: number | null;
  sameMonthLastYearM3: number | null;
  sameMonthLastYearChangePercent: number | null;
};

const monthFormatter = new Intl.DateTimeFormat("ro-RO", {
  month: "short",
  year: "numeric",
  timeZone: "Europe/Bucharest"
});

const monthKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  timeZone: "Europe/Bucharest"
});

function validDate(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date): string {
  const parts = monthKeyFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  return year && month ? `${year}-${month}` : "";
}

/** Groups readings by their reading date, falling back to creation date for legacy records. */
export function aggregateMonthlyConsumption(history: HistoryEntry[]): MonthlyConsumption[] {
  const months = new Map<string, MonthlyConsumption>();

  for (const entry of history) {
    if (entry.isBaseline) continue;
    const date = validDate(entry.readingAt) ?? validDate(entry.createdAt);
    if (!date) continue;

    const key = monthKey(date);
    if (!key) continue;
    const month = months.get(key) ?? {
      key,
      label: monthFormatter.format(date),
      consumptionM3: 0,
      consumptionKwh: 0,
      total: 0
    };
    month.consumptionM3 += entry.consumptionM3;
    month.consumptionKwh += entry.consumptionKwh;
    month.total += entry.total;
    months.set(key, month);
  }

  return Array.from(months.values()).sort((a, b) => a.key.localeCompare(b.key));
}

/** Compares the latest calendar month with the user's own prior monthly history. */
export function compareConsumptionPeriods(history: HistoryEntry[]): ConsumptionComparison | null {
  const months = aggregateMonthlyConsumption(history);
  if (!months.length) return null;

  const latest = months[months.length - 1];
  const earlier = months.slice(0, -1);
  const previous = earlier.length ? earlier[earlier.length - 1].consumptionM3 : null;
  const average = earlier.length
    ? earlier.reduce((sum, item) => sum + item.consumptionM3, 0) / earlier.length
    : null;
  const latestYear = Number(latest.key.slice(0, 4));
  const lastYearKey = `${latestYear - 1}${latest.key.slice(4)}`;
  const lastYear = earlier.find((item) => item.key === lastYearKey)?.consumptionM3 ?? null;
  const percentDifference = (reference: number | null) =>
    reference === null || reference === 0 ? null : ((latest.consumptionM3 - reference) / reference) * 100;

  return {
    currentM3: latest.consumptionM3,
    previousM3: previous,
    previousChangePercent: percentDifference(previous),
    averageM3: average,
    averageChangePercent: percentDifference(average),
    sameMonthLastYearM3: lastYear,
    sameMonthLastYearChangePercent: percentDifference(lastYear)
  };
}
