"use client";

import { memo, useCallback, useEffect, useState } from "react";
import { styles } from "../styles";
import { InvoiceDetailsPreview, TariffProfilePreview, TariffWarning } from "../hooks/useSettings";

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
  invoicePreview: TariffProfilePreview | null;
  invoiceWarnings: TariffWarning[];
  invoiceDetails: InvoiceDetailsPreview;
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
  onApplyInvoicePreview: () => Promise<void>;
  onDiscardInvoicePreview: () => Promise<void>;
  onSaveTariffs: (validFrom?: string) => Promise<void>;
  locationId?: string;
};

type TariffHistoryEntry = {
  id: string;
  city: string;
  pcs: number;
  gasPriceMwh: number;
  transportPriceMwh: number;
  distributionPriceMwh: number;
  vatRate: number;
  validFrom: string;
  source: "MANUAL" | "INVOICE" | "MIGRATED";
};

const previewLabels: Record<keyof Omit<TariffProfilePreview, "city">, string> = {
  pcs: "PCS (kWh/m³)", gasPriceMwh: "Preț gaze (lei/MWh)", transportPriceMwh: "Transport (lei/MWh)",
  distributionPriceMwh: "Distribuție (lei/MWh)", cap26PriceMwh: "Plafonare OUG 26/25 (lei/MWh)",
  cap6PriceMwh: "Plafonare OUG 6/25 (lei/MWh)", fixedFee: "Taxă fixă (lei)", vatRate: "TVA"
};

const previewValue = (field: keyof Omit<TariffProfilePreview, "city">, value: number) =>
  field === "vatRate" ? `${(value * 100).toFixed(2)}%` : value.toLocaleString("ro-RO", { maximumFractionDigits: 3 });

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
  invoicePreview,
  invoiceWarnings,
  invoiceDetails,
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
  onInvoiceUpload,
  onApplyInvoicePreview,
  onDiscardInvoicePreview,
  onSaveTariffs,
  locationId
}: Props) {
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceCity, setInvoiceCity] = useState("auto");
  const [tariffsSaving, setTariffsSaving] = useState(false);
  const [tariffsMessage, setTariffsMessage] = useState("");
  const [validFrom, setValidFrom] = useState(() => new Date().toISOString().slice(0, 10));
  const [tariffHistory, setTariffHistory] = useState<TariffHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [previewApplying, setPreviewApplying] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const loadTariffHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/tariffs/history${locationId ? `?locationId=${encodeURIComponent(locationId)}` : ""}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as TariffHistoryEntry[];
      setTariffHistory(Array.isArray(data) ? data : []);
    } finally {
      setHistoryLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    setTariffHistory([]);
    void loadTariffHistory();
  }, [loadTariffHistory]);

  const handleUpload = async () => {
    if (!invoiceFile || invoiceLoading) {
      return;
    }
    await onInvoiceUpload(invoiceFile, invoiceCity);
    setInvoiceFile(null);
  };

  const handleSaveTariffs = async () => {
    setTariffsSaving(true);
    setTariffsMessage("");
    try {
      await onSaveTariffs(validFrom);
      await loadTariffHistory();
      setTariffsMessage("Tarifele au fost salvate în baza de date.");
    } catch (error) {
      setTariffsMessage(error instanceof Error ? error.message : "Nu am putut salva tarifele.");
    } finally {
      setTariffsSaving(false);
    }
  };

  const handleApplyPreview = async () => {
    setPreviewApplying(true);
    setPreviewError("");
    try {
      await onApplyInvoicePreview();
      await loadTariffHistory();
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Nu am putut aplica tarifele detectate.");
    } finally {
      setPreviewApplying(false);
    }
  };

  const handleDiscardPreview = async () => {
    setPreviewApplying(true);
    setPreviewError("");
    try {
      await onDiscardInvoicePreview();
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Nu am putut șterge factura încărcată.");
    } finally {
      setPreviewApplying(false);
    }
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
        disabled={!invoiceFile || invoiceLoading || Boolean(invoicePreview)}
      >
        {invoiceLoading ? "Se procesează factura..." : "Încarcă factura și aplică tarife"}
      </button>
      {invoiceMessage ? <p style={styles.success}>{invoiceMessage}</p> : null}
      {invoiceError ? <p style={styles.error}>{invoiceError}</p> : null}
      {invoicePreview ? <section style={{ border: "1px solid #2dd4bf", borderRadius: 10, padding: 16, marginTop: 16 }} aria-live="polite">
        <h3 style={{ marginTop: 0 }}>Tarife detectate — confirmi aplicarea?</h3>
        <p>Localitate: <strong>{invoicePreview.city}</strong>. Valorile de mai jos vor înlocui profilul tarifar salvat.</p>
        {invoiceDetails.address ? <p>Adresă loc de consum detectată: <strong>{invoiceDetails.address}</strong></p> : null}
        {invoiceDetails.meterSerial ? <p>Serie contor gaze detectată: <strong>{invoiceDetails.meterSerial}</strong></p> : null}
        <ul>{(Object.keys(previewLabels) as Array<keyof Omit<TariffProfilePreview, "city">>).map((field) => <li key={field}>{previewLabels[field]}: <strong>{previewValue(field, invoicePreview[field])}</strong></li>)}</ul>
        {invoiceWarnings.length ? <div style={{ ...styles.error, marginBottom: 12 }}><strong>Verifică diferențele neobișnuite:</strong><ul>{invoiceWarnings.map((warning) => <li key={warning.field}>{previewLabels[warning.field]}: {previewValue(warning.field, warning.previous)} → {previewValue(warning.field, warning.detected)}{warning.changePercent === null ? " (valoare nouă)" : ` (${warning.changePercent > 0 ? "+" : ""}${warning.changePercent.toFixed(0)}%)`}</li>)}</ul></div> : null}
        {previewError ? <p style={styles.error}>{previewError}</p> : null}
        <button type="button" style={styles.authSubmit} onClick={handleApplyPreview} disabled={previewApplying}>{previewApplying ? "Se aplică..." : "Confirmă și aplică tarifele"}</button>
        <button type="button" style={{ ...styles.authSubmit, marginLeft: 8, background: "transparent", border: "1px solid currentColor" }} onClick={handleDiscardPreview} disabled={previewApplying}>Anulează</button>
      </section> : null}
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
        <label style={styles.label}>
          Tarife valabile de la
          <input
            type="date"
            style={styles.input}
            value={validFrom}
            onChange={(event) => setValidFrom(event.target.value)}
          />
        </label>
      </div>
      <button type="button" style={styles.authSubmit} onClick={handleSaveTariffs} disabled={tariffsSaving}>
        {tariffsSaving ? "Se salvează tarifele..." : "Salvează tarifele în cont"}
      </button>
      {tariffsMessage ? <p style={tariffsMessage.includes("Nu") ? styles.error : styles.success}>{tariffsMessage}</p> : null}
      <section style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
        <h3 style={{ margin: "0 0 8px" }}>Istoric tarife</h3>
        <p className="muted">Versiunile sunt păstrate când se modifică profilul tarifar. „Valabil de la” descrie data declarată pentru aplicarea lor.</p>
        {historyLoading ? <p className="muted">Se încarcă istoricul...</p> : null}
        {!historyLoading && !tariffHistory.length ? <p className="muted">Încă nu există versiuni salvate.</p> : null}
        {tariffHistory.length ? <div style={{ display: "grid", gap: 8 }}>{tariffHistory.map((entry) => <article key={entry.id} style={{ border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
          <strong>{new Date(entry.validFrom).toLocaleDateString("ro-RO")}</strong> · {entry.source === "INVOICE" ? "Import factură" : entry.source === "MIGRATED" ? "Profil existent" : "Salvare manuală"}
          <div className="muted" style={{ marginTop: 4 }}>Localitate: {entry.city} · PCS {entry.pcs.toLocaleString("ro-RO", { maximumFractionDigits: 3 })} · gaz {entry.gasPriceMwh.toLocaleString("ro-RO", { maximumFractionDigits: 3 })} lei/MWh · transport {entry.transportPriceMwh.toLocaleString("ro-RO", { maximumFractionDigits: 3 })} · distribuție {entry.distributionPriceMwh.toLocaleString("ro-RO", { maximumFractionDigits: 3 })} · TVA {(entry.vatRate * 100).toFixed(2)}%</div>
        </article>)}</div> : null}
      </section>
    </section>
  );
}

export const SettingsForm = memo(SettingsFormComponent);
