import { calculateBilling } from "./billing";
import { HistoryEntry } from "./types";

export type ForecastTariffs = {
  pcs: number;
  gasPriceMwh: number;
  transportPriceMwh: number;
  distributionPriceMwh: number;
  cap26PriceMwh: number;
  cap6PriceMwh: number;
  fixedFee: number;
  vatRate: number;
  includeVat: boolean;
};

export type ConsumptionForecast = {
  dailyAverageM3: number;
  projectedConsumptionM3: number;
  projectedConsumptionKwh: number;
  projectedTotal: number;
  sampleCount: number;
  daysInMonth: number;
  daysElapsed: number;
};

const readingDate = (entry: HistoryEntry) => {
  const date = new Date(entry.readingAt ?? entry.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
};

const localDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day") };
};

/**
 * Projects the full calendar month from the weighted daily average of the last
 * six complete reading periods. It deliberately uses only the user's data,
 * so it works without weather or external services.
 */
export function forecastCurrentMonth(
  history: HistoryEntry[],
  tariffs: ForecastTariffs,
  now = new Date()
): ConsumptionForecast | null {
  const ordered = history
    .map((entry) => ({ entry, date: readingDate(entry) }))
    .filter((item): item is { entry: HistoryEntry; date: Date } => item.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const periods = ordered.flatMap((item, index) => {
    if (item.entry.isBaseline || index === 0) return [];
    const previous = ordered[index - 1];
    const days = Math.round((item.date.getTime() - previous.date.getTime()) / 86_400_000);
    return days > 0 && item.entry.consumptionM3 >= 0
      ? [{ consumptionM3: item.entry.consumptionM3, days }]
      : [];
  }).slice(-6);

  if (!periods.length) return null;
  const consumedM3 = periods.reduce((sum, period) => sum + period.consumptionM3, 0);
  const observedDays = periods.reduce((sum, period) => sum + period.days, 0);
  if (observedDays <= 0) return null;

  const { year, month, day } = localDateParts(now);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dailyAverageM3 = consumedM3 / observedDays;
  const projectedConsumptionM3 = dailyAverageM3 * daysInMonth;
  const bill = calculateBilling({ previousReading: 0, currentReading: projectedConsumptionM3, ...tariffs });

  return {
    dailyAverageM3,
    projectedConsumptionM3,
    projectedConsumptionKwh: bill.consumptionKwh,
    projectedTotal: bill.total,
    sampleCount: periods.length,
    daysInMonth,
    daysElapsed: Math.min(day, daysInMonth)
  };
}
