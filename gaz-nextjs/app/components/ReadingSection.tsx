"use client";

import { memo, useCallback, useRef, useState } from "react";
import { AuthUser } from "@/lib/types";
import { formatIndex } from "@/lib/format";
import { styles } from "../styles";

type SupplyPoint = {
  label: string;
  address: string;
  owner: string;
};

type Props = {
  supplyPoint: SupplyPoint;
  meterSerial: string;
  lastBilledValue: number | null;
  lastReportedValue: number | null;
  lastReportedAtText: string | null;
  currentReading: string;
  isSaving: boolean;
  user: AuthUser | null;
  onReadingChange: (value: string) => void;
  onPreviousReadingChange: (value: string) => void;
  csrfHeaders: () => Record<string, string>;
};

function ReadingSectionComponent({
  supplyPoint,
  meterSerial,
  lastBilledValue,
  lastReportedValue,
  lastReportedAtText,
  currentReading,
  isSaving,
  user,
  onReadingChange,
  onPreviousReadingChange,
  csrfHeaders
}: Props) {
  const [previousFile, setPreviousFile] = useState<File | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [previousPreview, setPreviousPreview] = useState<string | null>(null);
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const previousInputRef = useRef<HTMLInputElement>(null);
  const currentInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((type: "previous" | "current", file: File | null) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === "previous") {
      if (previousPreview) URL.revokeObjectURL(previousPreview);
      setPreviousFile(file);
      setPreviousPreview(url);
    } else {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      setCurrentFile(file);
      setCurrentPreview(url);
    }
    setOcrError(null);
  }, [previousPreview, currentPreview]);

  const handleOcr = useCallback(async () => {
    if (!previousFile || !currentFile || !user) return;

    setOcrLoading(true);
    setOcrError(null);

    try {
      const formData = new FormData();
      formData.append("previous", previousFile);
      formData.append("current", currentFile);

      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: csrfHeaders(),
        credentials: "include",
        body: formData
      });

      const data = await res.json();

      if (!res.ok) {
        setOcrError(data.error || "Eroare la procesarea imaginilor.");
        return;
      }

      if (data.previousReading != null) {
        onPreviousReadingChange(String(data.previousReading));
      }
      if (data.currentReading != null) {
        onReadingChange(String(data.currentReading));
      }
    } catch {
      setOcrError("Eroare de conexiune. Încearcă din nou.");
    } finally {
      setOcrLoading(false);
    }
  }, [previousFile, currentFile, user, csrfHeaders, onPreviousReadingChange, onReadingChange]);

  return (
    <>
      <section style={styles.locationCard}>
        <p style={styles.locationBadge}>{supplyPoint.label}</p>
        <p style={styles.locationAddress}>{supplyPoint.address}</p>
        <p style={styles.locationOwner}>{supplyPoint.owner}</p>
      </section>

      <section style={styles.readingCard}>
        <div style={styles.readingBlock}>
          <div>
            <p style={styles.readingLabel}>Mecanic</p>
            <p style={styles.readingValue}>{formatIndex(lastBilledValue)}</p>
            <p style={styles.readingHint}>Ultimul index facturat (poți ajusta în setări)</p>
          </div>
          <div style={styles.lastSubmission}>
            <p style={styles.readingLabel}>Ultima raportare</p>
            <p style={styles.lastSubmissionValue}>{formatIndex(lastReportedValue)}</p>
          </div>
        </div>
        <p style={styles.readingSerialLabel}>Seria contor</p>
        <p style={styles.readingSerial}>{meterSerial}</p>
        {lastReportedAtText && (
          <p style={styles.readingMetaText}>
            Indexul tău a fost transmis la {lastReportedAtText} prin aplicație și poate fi modificat
            până la finalul lunii.
          </p>
        )}

        {/* OCR Section */}
        {user && (
          <div style={styles.ocrSection}>
            <p style={styles.ocrTitle}>Citire din fotografii</p>
            <div style={styles.ocrGrid}>
              <div
                style={styles.ocrUploadZone}
                onClick={() => previousInputRef.current?.click()}
              >
                {previousPreview ? (
                  <img src={previousPreview} alt="Index anterior" style={styles.ocrPreview} />
                ) : (
                  <>
                    <p style={styles.ocrUploadLabel}>Index anterior</p>
                    <p style={styles.ocrUploadHint}>Apasă pentru a selecta</p>
                  </>
                )}
                <input
                  ref={previousInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleFileSelect("previous", e.target.files?.[0] || null)}
                />
              </div>
              <div
                style={styles.ocrUploadZone}
                onClick={() => currentInputRef.current?.click()}
              >
                {currentPreview ? (
                  <img src={currentPreview} alt="Index curent" style={styles.ocrPreview} />
                ) : (
                  <>
                    <p style={styles.ocrUploadLabel}>Index curent</p>
                    <p style={styles.ocrUploadHint}>Apasă pentru a selecta</p>
                  </>
                )}
                <input
                  ref={currentInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleFileSelect("current", e.target.files?.[0] || null)}
                />
              </div>
            </div>
            <button
              type="button"
              style={{
                ...styles.ocrButton,
                opacity: !previousFile || !currentFile || ocrLoading ? 0.6 : 1,
                cursor: !previousFile || !currentFile || ocrLoading ? "not-allowed" : "pointer"
              }}
              disabled={!previousFile || !currentFile || ocrLoading}
              onClick={handleOcr}
            >
              {ocrLoading ? "Se procesează..." : "Citește din poze"}
            </button>
            {ocrError && <p style={styles.ocrError}>{ocrError}</p>}
          </div>
        )}

        <label style={styles.mobileLabel}>
          Introdu indexul nou*
          <input
            type="number"
            inputMode="decimal"
            step="0.001"
            min="0"
            style={styles.mobileInput}
            value={currentReading}
            onChange={(event) => onReadingChange(event.target.value)}
            required
          />
        </label>
        <button
          type="submit"
          className="primary-button"
          style={{
            ...styles.submitButton,
            opacity: isSaving || !user ? 0.7 : 1,
            cursor: !user ? "not-allowed" : "pointer"
          }}
          disabled={isSaving || !user}
        >
          {isSaving ? "Se salvează..." : user ? "Trimite" : "Autentifică-te pentru a trimite"}
        </button>
        {!user && (
          <p style={styles.authNotice}>
            Creează-ți un cont mai sus pentru a transmite indexul și a salva calculele.
          </p>
        )}
        <p style={styles.mobileHint}>
          Dacă ai transmis deja indexul luna trecută, completează manual doar lectura de acum și
          actualizează calculele mai jos.
        </p>
      </section>
    </>
  );
}

export const ReadingSection = memo(ReadingSectionComponent);
