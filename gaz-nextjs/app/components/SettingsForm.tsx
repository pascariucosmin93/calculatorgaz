"use client";

import { memo, useState } from "react";
import { styles } from "../styles";

type Props = {
  previousReading: string;
  pcs: string;
  gasPriceMwh: string;
  transportPriceMwh: string;
  distributionPriceMwh: string;
  cap26PriceMwh: string;
  cap6PriceMwh: string;
  vatRate: string;
  fixedFee: string;
  includeVat: boolean;
  invoiceLoading: boolean;
  invoiceMessage: string;
  invoiceError: string;
  onPreviousReadingChange: (value: string) => void;
  onPcsChange: (value: string) => void;
  onGasPriceChange: (value: string) => void;
  onTransportPriceChange: (value: string) => void;
  onDistributionPriceChange: (value: string) => void;
  onCap26PriceChange: (value: string) => void;
  onCap6PriceChange: (value: string) => void;
  onVatRateChange: (value: string) => void;
  onFixedFeeChange: (value: string) => void;
  onIncludeVatChange: (value: boolean) => void;
  onInvoiceUpload: (file: File, city: string) => Promise<void>;
};

function SettingsFormComponent({
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
  onPreviousReadingChange,
  onPcsChange,
  onGasPriceChange,
  onTransportPriceChange,
  onDistributionPriceChange,
  onCap26PriceChange,
  onCap6PriceChange,
  onVatRateChange,
  onFixedFeeChange,
  onIncludeVatChange,
  onInvoiceUpload
}: Props) {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceCity, setInvoiceCity] = useState("auto");

  const handleUpload = async () => {
    if (!invoiceFile || invoiceLoading) {
      return;
    }
    await onInvoiceUpload(invoiceFile, invoiceCity);
    setInvoiceFile(null);
  };

  return (
    <section style={styles.fieldGroup}>
      <h2 style={styles.sectionTitle}>Setări calculator</h2>
      <div style={styles.formRow}>
        <label style={styles.label}>
          Factură gaz (PDF)
          <input
            type="file"
            accept="application/pdf"
            style={styles.input}
            onChange={(event) => setInvoiceFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label style={styles.label}>
          Localitate factură
          <select
            style={styles.select}
            value={invoiceCity}
            onChange={(event) => setInvoiceCity(event.target.value)}
          >
            <option value="auto">Detectare automată</option>
            <option value="bucuresti">București</option>
            <option value="iasi">Iași</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        style={styles.authSubmit}
        onClick={handleUpload}
        disabled={!invoiceFile || invoiceLoading}
      >
        {invoiceLoading ? "Se procesează factura..." : "Încarcă factura și aplică tarife"}
      </button>
      {invoiceMessage ? <p style={styles.success}>{invoiceMessage}</p> : null}
      {invoiceError ? <p style={styles.error}>{invoiceError}</p> : null}
      <div style={styles.formRow}>
        <label style={styles.label}>
          Citirea anterioară (m³)
          <input
            type="number"
            step="0.01"
            min="0"
            style={styles.input}
            value={previousReading}
            onChange={(event) => onPreviousReadingChange(event.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Pcs (kWh/mc)
          <input
            type="number"
            step="0.001"
            min="0"
            style={styles.input}
            value={pcs}
            onChange={(event) => onPcsChange(event.target.value)}
            required
          />
        </label>
      </div>
      <div style={styles.formRow}>
        <label style={styles.label}>
          Preț gaze naturale (lei/MWh, fără TVA)
          <input
            type="number"
            step="0.001"
            min="0"
            style={styles.input}
            value={gasPriceMwh}
            onChange={(event) => onGasPriceChange(event.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Cost transport (lei/MWh)
          <input
            type="number"
            step="0.001"
            min="0"
            style={styles.input}
            value={transportPriceMwh}
            onChange={(event) => onTransportPriceChange(event.target.value)}
            required
          />
        </label>
        <label style={styles.label}>
          Tarif distribuție (lei/MWh)
          <input
            type="number"
            step="0.001"
            min="0"
            style={styles.input}
            value={distributionPriceMwh}
            onChange={(event) => onDistributionPriceChange(event.target.value)}
            required
          />
        </label>
      </div>
      <div style={styles.formRow}>
        <label style={styles.label}>
          Plafonare OUG 26/25 (lei/MWh)
          <input
            type="number"
            step="0.001"
            style={styles.input}
            value={cap26PriceMwh}
            onChange={(event) => onCap26PriceChange(event.target.value)}
          />
        </label>
        <label style={styles.label}>
          Plafonare OUG 6/25 (lei/MWh)
          <input
            type="number"
            step="0.001"
            style={styles.input}
            value={cap6PriceMwh}
            onChange={(event) => onCap6PriceChange(event.target.value)}
          />
        </label>
        <label style={styles.label}>
          TVA aplicat (%)
          <input
            type="number"
            step="0.01"
            min="0"
            style={styles.input}
            value={vatRate}
            onChange={(event) => onVatRateChange(event.target.value)}
          />
        </label>
        <label style={styles.label}>
          Abonament / taxă fixă (lei, fără TVA)
          <input
            type="number"
            step="0.01"
            min="0"
            style={styles.input}
            value={fixedFee}
            onChange={(event) => onFixedFeeChange(event.target.value)}
          />
        </label>
        <label style={styles.label}>
          Include TVA
          <select
            style={styles.select}
            value={includeVat ? "da" : "nu"}
            onChange={(event) => onIncludeVatChange(event.target.value === "da")}
          >
            <option value="da">Da</option>
            <option value="nu">Nu</option>
          </select>
        </label>
      </div>
    </section>
  );
}

export const SettingsForm = memo(SettingsFormComponent);
