"use client";

import { useCallback, useEffect, useState } from "react";
import { AuthUser, LocationItem } from "@/lib/types";
import { csrfHeaders } from "./useAuth";

const DEFAULT_PCS = 10.548;
const DEFAULT_GAS_PRICE_MWH = 171.44;
const DEFAULT_TRANSPORT_PRICE_MWH = 13.8;
const DEFAULT_DISTRIBUTION_PRICE_MWH = 70.96;
const DEFAULT_CAP26_PRICE_MWH = -20.54;
const DEFAULT_CAP6_PRICE_MWH = -0.063;
const DEFAULT_FIXED_FEE = 0;
const DEFAULT_VAT_RATE = 0.21;

const formatImportedNumber = (value: number, decimals = 3) =>
  Number(value.toFixed(decimals)).toString();

const getSettingsStorageKey = (userId: string, locationId: string) => `gaz-calculator:last-reading:v3:${userId}:${locationId}`;
// Înainte de locații, o singură cheie per utilizator; rămâne citită pentru locația implicită.
const getLegacySettingsStorageKey = (userId: string) => `gaz-calculator:last-reading:v2:${userId}`;

export type TariffProfilePreview = {
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

export type TariffWarning = {
  field: keyof Omit<TariffProfilePreview, "city">;
  previous: number;
  detected: number;
  changePercent: number | null;
};

export type InvoiceDetailsPreview = {
  ownerName?: string;
  address?: string;
  meterSerial?: string;
};

export function useSettings(
  user: AuthUser | null,
  setUser?: React.Dispatch<React.SetStateAction<AuthUser | null>>,
  location: LocationItem | null = null,
  onLocationDetailsChanged?: () => void
) {
  const locationId = location?.id ?? "";
  const isDefaultLocation = location?.isDefault ?? true;
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
  const [invoicePreview, setInvoicePreview] = useState<TariffProfilePreview | null>(null);
  const [invoiceWarnings, setInvoiceWarnings] = useState<TariffWarning[]>([]);
  const [invoiceUploadId, setInvoiceUploadId] = useState<string | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<InvoiceDetailsPreview>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const applyDefaults = () => {
      setPreviousReading("");
      setPcs(DEFAULT_PCS.toString());
      setGasPriceMwh(DEFAULT_GAS_PRICE_MWH.toString());
      setTransportPriceMwh(DEFAULT_TRANSPORT_PRICE_MWH.toString());
      setDistributionPriceMwh(DEFAULT_DISTRIBUTION_PRICE_MWH.toString());
      setCap26PriceMwh(DEFAULT_CAP26_PRICE_MWH.toString());
      setCap6PriceMwh(DEFAULT_CAP6_PRICE_MWH.toString());
      setVatRate((DEFAULT_VAT_RATE * 100).toString());
      setFixedFee(DEFAULT_FIXED_FEE.toString());
      setIncludeVat(true);
    };
    // La schimbarea locației pornim de la valori curate, ca tarifele altei locații să nu se scurgă.
    applyDefaults();
    setInvoicePreview(null);
    setInvoiceWarnings([]);
    setInvoiceUploadId(null);
    setInvoiceDetails({});
    setInvoiceMessage("");
    setInvoiceError("");
    if (!user?.id || !locationId) return;

    try {
      const saved =
        localStorage.getItem(getSettingsStorageKey(user.id, locationId)) ??
        (isDefaultLocation ? localStorage.getItem(getLegacySettingsStorageKey(user.id)) : null);
      if (saved) {
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
      }
    } catch {
      // ignore corrupt localStorage data
    }

    let cancelled = false;
    fetch(`/api/tariffs?locationId=${encodeURIComponent(locationId)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((profile) => {
        if (!profile || cancelled) return;
        setPcs(formatImportedNumber(profile.pcs));
        setGasPriceMwh(formatImportedNumber(profile.gasPriceMwh));
        setTransportPriceMwh(formatImportedNumber(profile.transportPriceMwh));
        setDistributionPriceMwh(formatImportedNumber(profile.distributionPriceMwh));
        setCap26PriceMwh(formatImportedNumber(profile.cap26PriceMwh));
        setCap6PriceMwh(formatImportedNumber(profile.cap6PriceMwh));
        setFixedFee(formatImportedNumber(profile.fixedFee));
        setVatRate(formatImportedNumber(profile.vatRate * 100));
        setIncludeVat(profile.includeVat !== false);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [user?.id, locationId, isDefaultLocation]);

  const saveTariffs = useCallback(async (validFrom?: string) => {
    if (!user?.id || !locationId) return;
    const response = await fetch("/api/tariffs", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({
        locationId,
        pcs: Number(pcs),
        gasPriceMwh: Number(gasPriceMwh),
        transportPriceMwh: Number(transportPriceMwh),
        distributionPriceMwh: Number(distributionPriceMwh),
        cap26PriceMwh: Number(cap26PriceMwh),
        cap6PriceMwh: Number(cap6PriceMwh),
        fixedFee: Number(fixedFee),
        vatRate: Number(vatRate) / 100,
        includeVat,
        validFrom
      })
    });
    if (!response.ok) throw new Error("Nu am putut salva tarifele în baza de date.");
  }, [user?.id, locationId, pcs, gasPriceMwh, transportPriceMwh, distributionPriceMwh, cap26PriceMwh, cap6PriceMwh, fixedFee, vatRate, includeVat]);

  const saveToLocalStorage = useCallback(
    (currentReading: number) => {
      if (typeof window === "undefined" || !user?.id || !locationId) return;
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
      try {
        localStorage.setItem(getSettingsStorageKey(user.id, locationId), JSON.stringify(payload));
      } catch {
        // localStorage may be blocked by browser privacy settings
      }
    },
    [user?.id, locationId, pcs, gasPriceMwh, transportPriceMwh, distributionPriceMwh, cap26PriceMwh, cap6PriceMwh, vatRate, fixedFee]
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
      setInvoicePreview(null);
      setInvoiceWarnings([]);
      setInvoiceUploadId(null);
      setInvoiceDetails({});
      try {
        const form = new FormData();
        form.append("file", file);
        form.append("city", city);
        if (locationId) form.append("locationId", locationId);

        const response = await fetch("/api/invoices/upload", {
          method: "POST",
          headers: csrfHeaders(),
          body: form
        });
        const responseText = await response.text();
        let data: {
          error?: string;
          message?: string;
          city?: string;
          uploadId?: string;
          profile?: TariffProfilePreview;
          warnings?: TariffWarning[];
          ownerName?: string;
          address?: string;
          meterSerial?: string;
        } = {};

        if (responseText.trim()) {
          try {
            data = JSON.parse(responseText) as typeof data;
          } catch {
            throw new Error(
              `Serviciul de facturi a răspuns invalid (HTTP ${response.status}).`
            );
          }
        }

        if (!response.ok || !data.profile) {
          throw new Error(
            data.error ||
              (response.status
                ? `Nu am putut procesa factura (HTTP ${response.status}).`
                : "Nu am putut procesa factura.")
          );
        }

        setInvoicePreview(data.profile);
        setInvoiceWarnings(data.warnings ?? []);
        setInvoiceUploadId(typeof data.uploadId === "string" ? data.uploadId : null);
        setInvoiceDetails({ ownerName: data.ownerName, address: data.address, meterSerial: data.meterSerial });
        setInvoiceMessage(data.message ?? "Factura a fost procesată. Confirmă tarifele detectate pentru a le aplica.");
      } catch (error) {
        setInvoiceError(error instanceof Error ? error.message : "Eroare la upload factură.");
      } finally {
        setInvoiceLoading(false);
      }
    },
    [user?.id, locationId]
  );

  const applyInvoicePreview = useCallback(async () => {
    if (!user?.id || !invoicePreview || !locationId) return;
    const response = await fetch("/api/tariffs", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({
        ...invoicePreview,
        locationId,
        includeVat,
        source: "INVOICE",
        validFrom: new Date().toISOString().slice(0, 10),
        ...invoiceDetails
      })
    });
    if (!response.ok) throw new Error("Nu am putut aplica tarifele detectate.");

    setPcs(formatImportedNumber(invoicePreview.pcs));
    setGasPriceMwh(formatImportedNumber(invoicePreview.gasPriceMwh));
    setTransportPriceMwh(formatImportedNumber(invoicePreview.transportPriceMwh));
    setDistributionPriceMwh(formatImportedNumber(invoicePreview.distributionPriceMwh));
    setCap26PriceMwh(formatImportedNumber(invoicePreview.cap26PriceMwh));
    setCap6PriceMwh(formatImportedNumber(invoicePreview.cap6PriceMwh));
    setFixedFee(formatImportedNumber(invoicePreview.fixedFee));
    setVatRate(formatImportedNumber(invoicePreview.vatRate * 100));
    setInvoicePreview(null);
    setInvoiceWarnings([]);
    setInvoiceUploadId(null);
    setInvoiceDetails({});
    if (invoiceDetails.address || invoiceDetails.meterSerial) onLocationDetailsChanged?.();
    if (setUser && (invoiceDetails.ownerName || (isDefaultLocation && (invoiceDetails.address || invoiceDetails.meterSerial)))) {
      setUser((previous) => previous ? {
        ...previous,
        ownerName: invoiceDetails.ownerName ?? previous.ownerName,
        address: isDefaultLocation ? invoiceDetails.address ?? previous.address : previous.address,
        meterSerial: isDefaultLocation ? invoiceDetails.meterSerial ?? previous.meterSerial : previous.meterSerial
      } : previous);
    }
    setInvoiceMessage("Tarifele detectate au fost aplicate și salvate în cont.");
  }, [includeVat, invoiceDetails, invoicePreview, isDefaultLocation, locationId, onLocationDetailsChanged, setUser, user?.id]);

  const discardInvoicePreview = useCallback(async () => {
    if (invoiceUploadId) {
      const response = await fetch("/api/invoices/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ uploadId: invoiceUploadId })
      });
      if (!response.ok) throw new Error("Nu am putut șterge factura încărcată. Tarifele nu au fost aplicate.");
    }
    setInvoicePreview(null);
    setInvoiceWarnings([]);
    setInvoiceUploadId(null);
    setInvoiceDetails({});
    setInvoiceMessage("Tarifele detectate nu au fost aplicate, iar factura a fost ștearsă.");
  }, [invoiceUploadId]);

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
    invoicePreview,
    invoiceWarnings,
    invoiceDetails,
    saveToLocalStorage,
    handleInvoiceUpload,
    applyInvoicePreview,
    discardInvoicePreview,
    saveTariffs,
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
