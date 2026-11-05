/** Parses the date selected by the user without allowing JavaScript's date rollover. */
export function parseTariffValidFrom(value: unknown, fallback = new Date()): Date | null {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}
