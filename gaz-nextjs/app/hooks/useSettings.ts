"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthUser } from "@/lib/types";
import { csrfHeaders } from "./useAuth";

const DEFAULT_PCS = 10.548;
const DEFAULT_GAS_PRICE_MWH = 171.44;
const DEFAULT_TRANSPORT_PRICE_MWH = 13.8;
const DEFAULT_DISTRIBUTION_PRICE_MWH = 70.96;
const DEFAULT_CAP26_PRICE_MWH = -20.54;
const DEFAULT_CAP6_PRICE_MWH = -0.063;
const DEFAULT_FIXED_FEE = 0;
const DEFAULT_VAT_RATE = 0.21;

const getSettingsStorageKey = (userId: string) => `gaz-calculator:last-reading:v2:${userId}`;

export function useSettings(user: AuthUser | null) {
  const [previousReading, setPreviousReading] = useState("");
  const [pcs, setPcs] = useState(DEFAULT_PCS.toString());
  const [gasPriceMwh, setGasPriceMwh] = useState(DEFAULT_GAS_PRICE_MWH.toString());
  const [transportPriceMwh, setTransportPriceMwh] = useState(DEFAULT_TRANSPORT_PRICE_MWH.toString());
  const [distributionPriceMwh, setDistributionPriceMwh] = useState(DEFAULT_DISTRIBUTION_PRICE_MWH.toString());
  const [cap26PriceMwh, setCap26PriceMwh] = useState(DEFAULT_CAP26_PRICE_MWH.toString());
  const [cap6PriceMwh, setCap6PriceMwh] = useState(DEFAULT_CAP6_PRICE_MWH.toString());
  const [vatRate, setVatRate] = useState((DEFAULT_VAT_RATE * 100).toString());
  const [fixedFee, setFixedFee] = useState(DEFAULT_FIXED_FEE.toString());
  const [includeVat, setIncludeVat] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceMessage, setInvoiceMessage] = useState("");
  const [invoiceError, setInvoiceError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!user?.id) {
      setPreviousReading("");
      setPcs(DEFAULT_PCS.toString());
      setGasPriceMwh(DEFAULT_GAS_PRICE_MWH.toString());
      setTransportPriceMwh(DEFAULT_TRANSPORT_PRICE_MWH.toString());
      setDistributionPriceMwh(DEFAULT_DISTRIBUTION_PRICE_MWH.toString());
      setCap26PriceMwh(DEFAULT_CAP26_PRICE_MWH.toString());
      setCap6PriceMwh(DEFAULT_CAP6_PRICE_MWH.toString());
      setVatRate((DEFAULT_VAT_RATE * 100).toString());
      setFixedFee(DEFAULT_FIXED_FEE.toString());
      return;
    }

    try {
      const saved = localStorage.getItem(getSettingsStorageKey(user.id));
      if (!saved) return;
      const parsed = JSON.parse(saved) as Record<string, string>;
      setPreviousReading(parsed.previousReading ?? "");
      setPcs(parsed.pcs ?? DEFAULT_PCS.toString());
      setGasPriceMwh(parsed.gasPriceMwh ?? DEFAULT_GAS_PRICE_MWH.toString());
      setTransportPriceMwh(parsed.transportPriceMwh ?? DEFAULT_TRANSPORT_PRICE_MWH.toString());
      setDistributionPriceMwh(parsed.distributionPriceMwh ?? DEFAULT_DISTRIBUTION_PRICE_MWH.toString());
      setCap26PriceMwh(parsed.cap26PriceMwh ?? DEFAULT_CAP26_PRICE_MWH.toString());
      setCap6PriceMwh(parsed.cap6PriceMwh ?? DEFAULT_CAP6_PRICE_MWH.toString());
      setVatRate(parsed.vatRate ?? (DEFAULT_VAT_RATE * 100).toString());
      setFixedFee(parsed.fee ?? DEFAULT_FIXED_FEE.toString());
    } catch {
      // ignore corrupt localStorage data
    }
  }, [user?.id]);

  const saveToLocalStorage = useCallback(
    (currentReading: number) => {
      if (typeof window === "undefined" || !user?.id) return;
      const payload = {
        previousReading: currentReading.toString(),
        pcs,
        gasPriceMwh,
        transportPriceMwh,
        distributionPriceMwh,
        cap26PriceMwh,
        cap6PriceMwh,
        vatRate,
        fee: fixedFee
      };
      localStorage.setItem(getSettingsStorageKey(user.id), JSON.stringify(payload));
    },
    [user?.id, pcs, gasPriceMwh, transportPriceMwh, distributionPriceMwh, cap26PriceMwh, cap6PriceMwh, vatRate, fixedFee]
  );

  const handleInvoiceUpload = useCallback(
    async (file: File, city: string) => {
      if (!user?.id) {
        setInvoiceError("Trebuie să fii autentificat ca să încarci factura.");
        return;
      }

      setInvoiceLoading(true);
      setInvoiceError("");
      setInvoiceMessage("");
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("city", city);

        const response = await fetch("/api/invoices/upload", {
          method: "POST",
          headers: csrfHeaders(),
          body: form
        });
        const data = (await response.json()) as {
          error?: string;
          message?: string;
          city?: string;
          profile?: {
            pcs: number;
            gasPriceMwh: number;
            transportPriceMwh: number;
            distributionPriceMwh: number;
            cap26PriceMwh: number;
            cap6PriceMwh: number;
            fixedFee: number;
            vatRate: number;
          };
        };

        if (!response.ok || !data.profile) {
          throw new Error(data.error || "Nu am putut procesa factura.");
        }

        setPcs(data.profile.pcs.toString());
        setGasPriceMwh(data.profile.gasPriceMwh.toString());
        setTransportPriceMwh(data.profile.transportPriceMwh.toString());
        setDistributionPriceMwh(data.profile.distributionPriceMwh.toString());
        setCap26PriceMwh(data.profile.cap26PriceMwh.toString());
        setCap6PriceMwh(data.profile.cap6PriceMwh.toString());
        setFixedFee(data.profile.fixedFee.toString());
        setVatRate((data.profile.vatRate * 100).toString());
        setInvoiceMessage(
          data.message ?? `Factura a fost procesată. Tarif actualizat pentru ${data.city ?? "profil generic"}.`
        );
      } catch (error) {
        setInvoiceError(error instanceof Error ? error.message : "Eroare la upload factură.");
      } finally {
        setInvoiceLoading(false);
      }
    },
    [user?.id]
  );

  return {
    previousReading,
    pcs,
    gasPriceMwh,
    transportPriceMwh,
    distributionPriceMwh,
    cap26PriceMwh,
    cap6PriceMwh,
    vatRate,
    fixedFee,
    includeVat,
    invoiceLoading,
    invoiceMessage,
    invoiceError,
    saveToLocalStorage,
    handleInvoiceUpload,
    onPreviousReadingChange: useCallback((v: string) => setPreviousReading(v), []),
    onPcsChange: useCallback((v: string) => setPcs(v), []),
    onGasPriceChange: useCallback((v: string) => setGasPriceMwh(v), []),
    onTransportPriceChange: useCallback((v: string) => setTransportPriceMwh(v), []),
    onDistributionPriceChange: useCallback((v: string) => setDistributionPriceMwh(v), []),
    onCap26PriceChange: useCallback((v: string) => setCap26PriceMwh(v), []),
    onCap6PriceChange: useCallback((v: string) => setCap6PriceMwh(v), []),
    onVatRateChange: useCallback((v: string) => setVatRate(v), []),
    onFixedFeeChange: useCallback((v: string) => setFixedFee(v), []),
    onIncludeVatChange: useCallback((v: boolean) => setIncludeVat(v), [])
  };
}
