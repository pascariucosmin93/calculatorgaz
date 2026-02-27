import { BillingInput, BillingResult } from "@/lib/billing";

const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL?.trim() ?? "";

export const isBillingServiceConfigured = () => BILLING_SERVICE_URL.length > 0;

export const calculateViaBillingService = async (input: BillingInput): Promise<BillingResult> => {
  const baseUrl = BILLING_SERVICE_URL.replace(/\/+$/, "");
  const response = await fetch(`${baseUrl}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Billing service error (${response.status}): ${message}`);
  }

  return (await response.json()) as BillingResult;
};
