export type BreakdownItem = {
  unitPriceMwh: number;
  value: number;
};

export type TariffBreakdown = {
  gas: BreakdownItem;
  transport: BreakdownItem;
  distribution: BreakdownItem;
  cap26: BreakdownItem;
  cap6: BreakdownItem;
};

export type Result = {
  consumptionM3: number;
  consumptionKwh: number;
  consumptionMwh: number;
  pcs: number;
  pricePerKwh: number;
  pricePerKwhWithVat: number;
  pricePerM3: number;
  pricePerM3WithVat: number;
  baseCost: number;
  adjustmentCost: number;
  variableCost: number;
  fixedFee: number;
  subtotal: number;
  vatRate: number;
  vat: number;
  total: number;
  breakdown: TariffBreakdown;
};

export type HistoryStatus = "idle" | "loading" | "error";
export type ReadingType = "SELF_READING" | "SUPPLIER_ESTIMATE" | "REGULARIZATION";

export type HistoryEntry = {
  id: string;
  previousReading: number;
  currentReading: number;
  consumptionM3: number;
  consumptionKwh: number;
  pricePerKwh: number;
  pricePerM3: number;
  conversionFactor: number;
  fixedFee: number;
  includeVat: boolean;
  subtotal: number;
  vat: number;
  total: number;
  isBaseline: boolean;
  readingType: ReadingType;
  readingAt: string;
  photoKey?: string | null;
  createdAt: string;
};

export type ThemeMode = "light" | "dark";
export type AuthMode = "login" | "signup";

export type AuthUser = {
  id: string;
  username: string;
  email: string | null;
  ownerName: string | null;
  address: string | null;
  meterSerial: string | null;
  isAdmin: boolean;
  createdAt: string;
};

export type LocationItem = {
  id: string;
  name: string;
  address: string | null;
  meterSerial: string | null;
  isDefault: boolean;
};
