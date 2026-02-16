"use client";

import { memo } from "react";
import { Result } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { styles } from "../styles";

type Props = {
  error: string;
  preview: { m3: string; kwh: string; mwh: string } | null;
  result: Result | null;
  includeVat: boolean;
};

function ResultSectionComponent({ error, preview, result, includeVat }: Props) {
  if (!error && !preview && !result) {
    return null;
  }

  return (
    <>
      {error && <p style={styles.error}>{error}</p>}
      {preview && !result && (
        <p style={styles.preview}>
          Consum estimat: {preview.m3} m³ ≈ {preview.kwh} kWh ({preview.mwh} MWh)
        </p>
      )}
      {result && (
        <section style={styles.result}>
          <div style={styles.resultHeader}>
            <div>
              <p style={styles.resultLabel}>Consum total</p>
              <p style={styles.resultValue}>
                {result.consumptionM3.toFixed(2)} m³ ({result.consumptionKwh.toFixed(0)} kWh /{" "}
                {result.consumptionMwh.toFixed(3)} MWh)
              </p>
              <p style={styles.historyMeta}>Pcs: {result.pcs.toFixed(3)} kWh/mc</p>
            </div>
            <div style={styles.resultDivider} />
            <div>
              <p style={styles.resultLabel}>Total de plată</p>
              <p style={styles.resultValue}>{formatCurrency(result.total)}</p>
            </div>
          </div>
          <ul style={styles.breakdown}>
            <li style={styles.breakdownItem}>
              <span>
                Gaz natural ({result.breakdown.gas.unitPriceMwh.toFixed(3)} lei/MWh)
              </span>
              <strong>{formatCurrency(result.breakdown.gas.value)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>
                Transport ({result.breakdown.transport.unitPriceMwh.toFixed(3)} lei/MWh)
              </span>
              <strong>{formatCurrency(result.breakdown.transport.value)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>
                Distribuție ({result.breakdown.distribution.unitPriceMwh.toFixed(3)} lei/MWh)
              </span>
              <strong>{formatCurrency(result.breakdown.distribution.value)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>
                Plafonare OUG 26/25 ({result.breakdown.cap26.unitPriceMwh.toFixed(3)} lei/MWh)
              </span>
              <strong>{formatCurrency(result.breakdown.cap26.value)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>
                Plafonare OUG 6/25 ({result.breakdown.cap6.unitPriceMwh.toFixed(3)} lei/MWh)
              </span>
              <strong>{formatCurrency(result.breakdown.cap6.value)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>Cost bază (fără plafonare)</span>
              <strong>{formatCurrency(result.baseCost)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>Total plafonare</span>
              <strong>{formatCurrency(result.adjustmentCost)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>Cost energie facturat (fără TVA)</span>
              <strong>{formatCurrency(result.variableCost)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>Abonament / taxă fixă</span>
              <strong>{formatCurrency(result.fixedFee)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>Subtotal fără TVA</span>
              <strong>{formatCurrency(result.subtotal)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>
                TVA ({includeVat ? `${(result.vatRate * 100).toFixed(2)}%` : "neaplicat"})
              </span>
              <strong>{formatCurrency(result.vat)}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>Preț final /kWh (cu TVA)</span>
              <strong>{`${result.pricePerKwhWithVat.toFixed(5)} lei/kWh`}</strong>
            </li>
            <li style={styles.breakdownItem}>
              <span>Preț final /m³ (cu TVA)</span>
              <strong>{`${result.pricePerM3WithVat.toFixed(3)} lei/m³`}</strong>
            </li>
          </ul>
        </section>
      )}
    </>
  );
}

export const ResultSection = memo(ResultSectionComponent);
