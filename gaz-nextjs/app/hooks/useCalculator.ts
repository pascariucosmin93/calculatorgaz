"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import { AuthUser, HistoryEntry, Result } from "@/lib/types";
import { csrfHeaders } from "./useAuth";

export function useCalculator(
  user: AuthUser | null,
  settings: {
    previousReading: string;
    currentReading: string;
    pcs: string;
    gasPriceMwh: string;
    transportPriceMwh: string;
    distributionPriceMwh: string;
    cap26PriceMwh: string;
    cap6PriceMwh: string;
    vatRate: string;
    fixedFee: string;
    includeVat: boolean;
    saveToLocalStorage: (currentReading: number) => void;
  },
  fetchHistory: () => Promise<void>
) {
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const consumptionPreview = useMemo(() => {
    const current = parseFloat(settings.currentReading);
    const previous = parseFloat(settings.previousReading);
    const pcsValue = parseFloat(settings.pcs);
    if (
      Number.isNaN(current) ||
      Number.isNaN(previous) ||
      Number.isNaN(pcsValue) ||
      current <= previous ||
      pcsValue <= 0
    ) {
      return null;
    }
    const consumptionM3 = current - previous;
    const consumptionKwh = consumptionM3 * pcsValue;
    const consumptionMwh = consumptionKwh / 1000;
    return {
      m3: consumptionM3.toFixed(2),
      kwh: consumptionKwh.toFixed(0),
      mwh: consumptionMwh.toFixed(3)
    };
  }, [settings.currentReading, settings.pcs, settings.previousReading]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!user) {
        setError("Trebuie să fii autentificat pentru a salva indexul.");
        return;
      }

      const current = parseFloat(settings.currentReading);
      const previous = parseFloat(settings.previousReading);
      const pcsValue = parseFloat(settings.pcs);
      const gasPrice = parseFloat(settings.gasPriceMwh);
      const transportPrice = parseFloat(settings.transportPriceMwh);
      const distributionPrice = parseFloat(settings.distributionPriceMwh);
      const cap26Price = parseFloat(settings.cap26PriceMwh);
      const cap6Price = parseFloat(settings.cap6PriceMwh);
      const vat = parseFloat(settings.vatRate) / 100;
      const fee = parseFloat(settings.fixedFee || "0");

      if (
        [current, previous, pcsValue, gasPrice, transportPrice, distributionPrice, cap26Price, cap6Price, vat, fee].some(
          (v) => Number.isNaN(v)
        )
      ) {
        setError("Introdu doar valori numerice.");
        setResult(null);
        return;
      }

      if (current <= previous) {
        setError("Citirea actuală trebuie să fie mai mare decât cea anterioară.");
        setResult(null);
        return;
      }

      if (pcsValue <= 0) {
        setError("Pcs (kWh/mc) trebuie să fie pozitiv.");
        setResult(null);
        return;
      }

      if ([gasPrice, transportPrice, distributionPrice].some((v) => v < 0)) {
        setError("Tarifele unitare nu pot fi negative (compensațiile pot fi negative).");
        setResult(null);
        return;
      }

      if (vat < 0 || vat > 1) {
        setError("TVA-ul trebuie să fie între 0 și 100%.");
        setResult(null);
        return;
      }

      if (fee < 0) {
        setError("Abonamentul nu poate fi negativ.");
        setResult(null);
        return;
      }

      setError("");
      setIsSaving(true);
      try {
        const response = await fetch("/api/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify({
            previousReading: previous,
            currentReading: current,
            pcs: pcsValue,
            gasPriceMwh: gasPrice,
            transportPriceMwh: transportPrice,
            distributionPriceMwh: distributionPrice,
            cap26PriceMwh: cap26Price,
            cap6PriceMwh: cap6Price,
            vatRate: vat,
            fixedFee: fee,
            includeVat: settings.includeVat
          })
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Nu am putut salva calculul.");
        }

        if (
          typeof data.consumptionM3 !== "number" ||
          typeof data.consumptionKwh !== "number" ||
          typeof data.fixedFee !== "number" ||
          typeof data.subtotal !== "number" ||
          typeof data.vat !== "number" ||
          typeof data.total !== "number"
        ) {
          throw new Error("Răspuns invalid de la server — lipsesc câmpuri numerice.");
        }

        const computedConsumptionMwh =
          typeof data.consumptionMwh === "number" ? data.consumptionMwh : data.consumptionKwh / 1000;
        const breakdown = data.breakdown ?? {
          gas: { unitPriceMwh: gasPrice, value: computedConsumptionMwh * gasPrice },
          transport: { unitPriceMwh: transportPrice, value: computedConsumptionMwh * transportPrice },
          distribution: { unitPriceMwh: distributionPrice, value: computedConsumptionMwh * distributionPrice },
          cap26: { unitPriceMwh: cap26Price, value: computedConsumptionMwh * cap26Price },
          cap6: { unitPriceMwh: cap6Price, value: computedConsumptionMwh * cap6Price }
        };
        const baseCost = data.baseCost ?? breakdown.gas.value + breakdown.transport.value + breakdown.distribution.value;
        const adjustmentCost = data.adjustmentCost ?? breakdown.cap26.value + breakdown.cap6.value;
        const variableCost = data.variableCost ?? baseCost + adjustmentCost;
        const pricePerKwh = data.pricePerKwh ?? variableCost / data.consumptionKwh;
        const pricePerKwhWithVat =
          data.pricePerKwhWithVat ?? (settings.includeVat ? pricePerKwh * (1 + vat) : pricePerKwh);
        const pricePerM3 = data.pricePerM3 ?? variableCost / data.consumptionM3;
        const pricePerM3WithVat =
          data.pricePerM3WithVat ?? (settings.includeVat ? pricePerM3 * (1 + vat) : pricePerM3);

        setResult({
          consumptionM3: data.consumptionM3,
          consumptionKwh: data.consumptionKwh,
          consumptionMwh: computedConsumptionMwh,
          pcs: data.pcs ?? pcsValue,
          pricePerKwh,
          pricePerKwhWithVat,
          pricePerM3,
          pricePerM3WithVat,
          baseCost,
          adjustmentCost,
          variableCost,
          fixedFee: data.fixedFee,
          subtotal: data.subtotal,
          vatRate: data.vatRate ?? vat,
          vat: data.vat,
          total: data.total,
          breakdown
        });

        fetchHistory().catch((err) => console.warn("History refresh failed:", err));
        settings.saveToLocalStorage(current);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Eroare la salvarea calculului.");
      } finally {
        setIsSaving(false);
      }
    },
    [user, settings, fetchHistory]
  );

  return { error, result, isSaving, consumptionPreview, handleSubmit };
}
