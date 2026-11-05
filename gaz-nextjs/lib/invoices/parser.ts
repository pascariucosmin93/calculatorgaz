export type InvoiceTariffProfile = {
  city: string;
  pcs: number;
  gasPriceMwh: number;
  transportPriceMwh: number;
  distributionPriceMwh: number;
  cap26PriceMwh: number;
  cap6PriceMwh: number;
  fixedFee: number;
  vatRate: number;
};

export type ParsedInvoiceDetails = { ownerName?: string; address?: string; meterSerial?: string };

export type TariffDifferenceWarning = {
  field: keyof Omit<InvoiceTariffProfile, "city">;
  previous: number;
  detected: number;
  changePercent: number | null;
};

const DEFAULT_PROFILE: InvoiceTariffProfile = {
  city: "generic",
  pcs: 10.548,
  gasPriceMwh: 171.44,
  transportPriceMwh: 13.8,
  distributionPriceMwh: 70.96,
  cap26PriceMwh: -20.54,
  cap6PriceMwh: -0.063,
  fixedFee: 0,
  vatRate: 0.21
};

const CITY_PROFILES: Record<string, Partial<InvoiceTariffProfile>> = {
  bucuresti: { city: "bucuresti", distributionPriceMwh: 79.8, transportPriceMwh: 14.2 },
  iasi: { city: "iasi", distributionPriceMwh: 66.4, transportPriceMwh: 13.3 }
};

const COMPARABLE_FIELDS: Array<keyof Omit<InvoiceTariffProfile, "city">> = [
  "pcs", "gasPriceMwh", "transportPriceMwh", "distributionPriceMwh",
  "cap26PriceMwh", "cap6PriceMwh", "fixedFee", "vatRate"
];

const toNumber = (value: string) => {
  const normalized = value.includes(",") ? value.replace(/\./g, "").replace(",", ".") : value;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const cityAt = (text: string) => {
  const lowered = text.toLowerCase();
  if (/\bia[șs]i\b/.test(lowered) || /\(\s*is\s*\)/.test(lowered)) return "iasi";
  if (/\bbucure[șs]ti\b/.test(lowered)) return "bucuresti";
  return null;
};

const consumptionLocationPattern = /(?:loc(?:ul)?\s+de\s+consum|adres[ăa]\s+(?:(?:a\s+)?locului\s+de\s+consum|loc\s+consum|de\s+consum)|punct(?:ul)?\s+de\s+consum)/gi;

const gasConsumptionAddress = (text: string) => {
  const index = text.toLowerCase().indexOf("detalii gaze naturale");
  if (index < 0) return null;
  const gasDetails = text.slice(index, index + 1_500);
  const match = gasDetails.match(/adres[ăa]\s+loc\s+consum\s+([\s\S]{0,500}?)(?=\s*cod\s+punct\s+de\s+m[ăa]sur[ăa]|\s*distribuitor\b)/i);
  return match?.[1]?.replace(/\s+/g, " ").trim() || null;
};

const gasMeterSerial = (text: string) => {
  const index = text.toLowerCase().indexOf("detalii gaze naturale");
  if (index < 0) return null;
  const gasDetails = text.slice(index, index + 2_000);
  const match = gasDetails.match(/serie\s+contor[\s\S]{0,700}?\b([a-z0-9]{4,}(?:[/-][a-z0-9]{2,})+)\b/i);
  return match?.[1] ?? null;
};

const consumptionContexts = (text: string) =>
  Array.from(text.matchAll(consumptionLocationPattern)).map((match) =>
    text.slice(match.index ?? 0, (match.index ?? 0) + 1_000)
  );

const cityFromAddress = (context: string) => {
  const postalLine = context.match(/\b\d{6}\b[^\r\n]{0,240}/);
  const postalCity = postalLine ? cityAt(postalLine[0]) : null;
  if (postalCity) return postalCity;
  const address = context.match(/(?:str\.?|bd\.?|bulevardul|calea|alee(?:a)?|pia[tț]a)\b[\s\S]{0,500}?\b\d{6}\b[\s\S]{0,160}/i);
  return address ? cityAt(address[0]) : null;
};

export const detectInvoiceCity = (text: string) => {
  const gasAddress = gasConsumptionAddress(text);
  const gasCity = gasAddress ? cityAt(gasAddress) : null;
  if (gasCity) return gasCity;
  for (const context of consumptionContexts(text)) {
    const city = cityFromAddress(context) ?? cityAt(context);
    if (city) return city;
  }
  const cities = Array.from(text.matchAll(/\b(?:bucure[șs]ti|ia[șs]i)\b/gi));
  return cities.length ? cityAt(cities[cities.length - 1][0]) ?? "generic" : "generic";
};

export const extractInvoiceDetails = (text: string): ParsedInvoiceDetails => {
  const gasAddress = gasConsumptionAddress(text);
  const meterSerial = gasMeterSerial(text);
  if (gasAddress || meterSerial) {
    return {
      ...(gasAddress ? { address: gasAddress } : {}),
      ...(meterSerial ? { meterSerial } : {})
    };
  }
  const source = consumptionContexts(text).find((context) => /(?:str\.?|bd\.?|bulevardul|calea|alee(?:a)?|pia[tț]a)\b/i.test(context)) ?? text;
  const lines = source.replace(/\u0000/g, " ").split(/\r?\n/).map((line) => line.replace(/\s+/g, " ").trim()).filter(Boolean);
  const addressIndex = lines.findIndex((line) => /^(?:str\.?|bd\.?|bulevardul|calea|alee(?:a)?|pia[tț]a)\b/i.test(line));
  if (addressIndex < 0) return {};
  const ownerCandidate = lines[addressIndex - 1] ?? "";
  const ownerName = /^[A-ZĂÂÎȘȚ][A-ZĂÂÎȘȚ .'-]{3,}$/i.test(ownerCandidate) ? ownerCandidate : undefined;
  const postalIndex = lines.findIndex((line, index) => index > addressIndex && /^\d{6}\s*[, -]/.test(line));
  const address = lines.slice(addressIndex, postalIndex >= 0 ? postalIndex + 1 : addressIndex + 1).join(", ");
  return { ...(ownerName ? { ownerName } : {}), ...(address ? { address } : {}) };
};

export const extractInvoiceTariffProfile = (text: string, cityHint: string): InvoiceTariffProfile => {
  const city = cityHint === "auto" ? detectInvoiceCity(text) : cityHint;
  const base: InvoiceTariffProfile = { ...DEFAULT_PROFILE, ...(CITY_PROFILES[city] ?? {}), city };
  const gasSectionIndex = text.toLowerCase().indexOf("detalii gaze naturale");

  // Nu căutăm prețuri în factura de electricitate sau în textul furnizorului.
  // Pentru un PDF fără secțiunea de gaze păstrăm valorile implicite ale orașului.
  if (gasSectionIndex < 0) return base;

  const gasText = text.slice(gasSectionIndex);
  const unitPrice = (label: string) => {
    const match = gasText.match(new RegExp(`${label}[\\s\\S]{0,180}?kWh\\s*([0-9]+(?:[.,][0-9]+)?)`, "i"));
    const value = match?.[1] ? toNumber(match[1]) : null;
    return value === null ? null : value * 1000;
  };
  const matchValue = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const value = pattern.exec(gasText)?.[1];
      const parsed = value ? toNumber(value) : null;
      if (parsed !== null) return parsed;
    }
    return null;
  };
  const pcsMatch = gasText.match(/\b[0-9]+(?:[.,][0-9]{3})\s*([0-9]+(?:[.,][0-9]{3}))\s*[0-9]+(?:[.,][0-9]{3})\s*C\./i);
  const pcs = pcsMatch?.[1] ? toNumber(pcsMatch[1]) : null;
  const gasPriceMwh = unitPrice("Pret gaze naturale");
  const transportPriceMwh = unitPrice("Cost transport");
  const distributionPriceMwh = unitPrice("Tarif distributie");
  const fixedFee = matchValue([/(?:abonament|tax[aă]\s*fix[aă])[^0-9]{0,30}([0-9]+(?:[.,][0-9]+)?)/i]);
  const caps = Array.from(gasText.matchAll(/Plafonare[^\r\n]*?(-?[0-9]+(?:[.,][0-9]+)?)\s*kWh\s*(-?[0-9]+(?:[.,][0-9]+)?)/gi))
    .map((match) => ({ quantity: match[1] ? toNumber(match[1]) : null, price: match[2] ? toNumber(match[2]) : null }))
    .filter((item): item is { quantity: number; price: number } => item.quantity !== null && item.price !== null);
  const quantity = caps.reduce((sum, cap) => sum + Math.abs(cap.quantity), 0);
  const weightedCap = quantity ? caps.reduce((sum, cap) => sum + Math.abs(cap.quantity) * cap.price * 1000, 0) / quantity : null;
  const vat = matchValue([/(?:tva)[^0-9]{0,20}([0-9]+(?:[.,][0-9]+)?)/i]);
  return {
    ...base,
    ...(pcs !== null ? { pcs } : {}),
    ...(gasPriceMwh !== null ? { gasPriceMwh } : {}),
    ...(transportPriceMwh !== null ? { transportPriceMwh } : {}),
    ...(distributionPriceMwh !== null ? { distributionPriceMwh } : {}),
    ...(weightedCap !== null ? { cap26PriceMwh: -weightedCap, cap6PriceMwh: 0 } : {}),
    ...(fixedFee !== null ? { fixedFee } : {}),
    ...(vat !== null ? { vatRate: vat > 1 ? vat / 100 : vat } : {})
  };
};

export const findUnusualTariffChanges = (previous: Omit<InvoiceTariffProfile, "city"> | null, detected: InvoiceTariffProfile): TariffDifferenceWarning[] => {
  if (!previous) return [];
  return COMPARABLE_FIELDS.flatMap((field) => {
    const oldValue = previous[field];
    const newValue = detected[field];
    const changePercent = oldValue === 0 ? null : ((newValue - oldValue) / Math.abs(oldValue)) * 100;
    const isUnusual = oldValue === 0 ? newValue !== 0 : Math.abs(changePercent ?? 0) >= 15;

    return isUnusual
      ? [{ field, previous: oldValue, detected: newValue, changePercent }]
      : [];
  });
};
