export type BillingInput = {
  previousReading: number;
  currentReading: number;
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

export type BillingBreakdownItem = {
  unitPriceMwh: number;
  value: number;
};

export type BillingResult = {
  consumptionM3: number;
  consumptionKwh: number;
  consumptionMwh: number;
  pcs: number;
  variableCost: number;
  pricePerKwh: number;
  pricePerKwhWithVat: number;
  pricePerM3: number;
  pricePerM3WithVat: number;
  baseCost: number;
  adjustmentCost: number;
  fixedFee: number;
  subtotal: number;
  vat: number;
  vatRate: number;
  total: number;
  breakdown: {
    gas: BillingBreakdownItem;
    transport: BillingBreakdownItem;
    distribution: BillingBreakdownItem;
    cap26: BillingBreakdownItem;
    cap6: BillingBreakdownItem;
  };
};

export const calculateBilling = (input: BillingInput): BillingResult => {
  const consumptionM3 = input.currentReading - input.previousReading;
  const consumptionKwh = consumptionM3 * input.pcs;
  const consumptionMwh = consumptionKwh / 1000;

  const gasCost = consumptionMwh * input.gasPriceMwh;
  const transportCost = consumptionMwh * input.transportPriceMwh;
  const distributionCost = consumptionMwh * input.distributionPriceMwh;
  const cap26Cost = consumptionMwh * input.cap26PriceMwh;
  const cap6Cost = consumptionMwh * input.cap6PriceMwh;

  const baseCost = gasCost + transportCost + distributionCost;
  const adjustmentCost = cap26Cost + cap6Cost;
  const variableCost = baseCost + adjustmentCost;

  const pricePerKwh = variableCost / consumptionKwh;
  const pricePerM3 = variableCost / consumptionM3;
  const subtotal = variableCost + input.fixedFee;
  const vat = input.includeVat ? subtotal * input.vatRate : 0;
  const total = subtotal + vat;
  const pricePerKwhWithVat = input.includeVat ? pricePerKwh * (1 + input.vatRate) : pricePerKwh;
  const pricePerM3WithVat = input.includeVat ? pricePerM3 * (1 + input.vatRate) : pricePerM3;

  return {
    consumptionM3,
    consumptionKwh,
    consumptionMwh,
    pcs: input.pcs,
    variableCost,
    pricePerKwh,
    pricePerKwhWithVat,
    pricePerM3,
    pricePerM3WithVat,
    baseCost,
    adjustmentCost,
    fixedFee: input.fixedFee,
    subtotal,
    vat,
    vatRate: input.vatRate,
    total,
    breakdown: {
      gas: { unitPriceMwh: input.gasPriceMwh, value: gasCost },
      transport: { unitPriceMwh: input.transportPriceMwh, value: transportCost },
      distribution: { unitPriceMwh: input.distributionPriceMwh, value: distributionCost },
      cap26: { unitPriceMwh: input.cap26PriceMwh, value: cap26Cost },
      cap6: { unitPriceMwh: input.cap6PriceMwh, value: cap6Cost }
    }
  };
};
