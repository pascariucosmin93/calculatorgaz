"use client";

import { memo, useMemo } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from "chart.js";
import { HistoryEntry, HistoryStatus } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { styles } from "../styles";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

export type ChartTheme = { line: string; fill: string; axis: string; grid: string };

type Props = {
  history: HistoryEntry[];
  status: HistoryStatus;
  chartTheme: ChartTheme;
  userId: string | null;
};

function HistorySectionComponent({ history, status, chartTheme, userId }: Props) {
  const formatM3 = (value: number) => value.toFixed(1);

  const chartData = useMemo(() => {
    const ordered = [...history].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const roundedM3 = ordered.map((entry) => Number(entry.consumptionM3.toFixed(3)));
    return {
      labels: ordered.map((entry) => new Date(entry.createdAt).toLocaleDateString("ro-RO")),
      datasets: [
        {
          label: "Consum m³",
          data: roundedM3,
          borderColor: chartTheme.line,
          backgroundColor: chartTheme.fill,
          tension: 0.3,
          fill: true,
          pointRadius: 4
        }
      ]
    };
  }, [history, chartTheme]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: chartTheme.axis },
          grid: { color: chartTheme.grid }
        },
        y: {
          ticks: {
            color: chartTheme.axis,
            callback: (value: number | string) => `${formatM3(Number(value))} m³`
          },
          grid: { color: chartTheme.grid }
        }
      }
    }),
    [chartTheme]
  );

  if (status === "loading") {
    return <p style={styles.preview}>Încarc istoricul...</p>;
  }

  if (status === "error") {
    return (
      <p style={{ ...styles.preview, color: "var(--error-text)" }}>
        Nu am putut încărca istoricul. Reîncearcă după un refresh.
      </p>
    );
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <section style={styles.historyBox}>
      <h2 style={styles.sectionTitle}>Istoric consum</h2>
      {userId && (
        <div style={styles.reportActions}>
          <a href={`/api/reports/export/csv?userId=${encodeURIComponent(userId)}`} style={styles.reportAction}>
            Descarcă CSV
          </a>
          <a href={`/api/reports/export/pdf?userId=${encodeURIComponent(userId)}`} style={styles.reportAction}>
            Descarcă PDF
          </a>
        </div>
      )}
      <div style={styles.chartWrapper}>
        <Line data={chartData} options={chartOptions} />
      </div>
      <ul style={styles.historyList}>
        {history.map((entry) => (
          <li key={entry.id} style={styles.historyItem}>
            <div>
              <strong>{new Date(entry.createdAt).toLocaleDateString("ro-RO")}</strong>
              <p style={styles.historyMeta}>
                {formatM3(entry.consumptionM3)} m³ • {entry.consumptionKwh.toFixed(0)} kWh
              </p>
            </div>
            <div style={styles.historyValue}>{formatCurrency(entry.total)}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export const HistorySection = memo(HistorySectionComponent);
