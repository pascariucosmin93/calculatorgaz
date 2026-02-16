"use client";

import { memo } from "react";
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
  onReadingChange
}: Props) {
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
