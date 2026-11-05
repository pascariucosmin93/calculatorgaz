"use client";
import { useMemo, useState } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip } from "chart.js";
import { HistoryEntry } from "@/lib/types";
import { aggregateMonthlyConsumption } from "@/lib/consumption";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

export function ConsumptionChart({ history }: { history: HistoryEntry[] }) {
  const [unit, setUnit] = useState<"m3" | "kwh">("m3");
  const [range, setRange] = useState<6 | 12>(6);
  const ordered = useMemo(() => aggregateMonthlyConsumption(history).slice(-range), [history, range]);
  const labels = ordered.map((entry) => entry.label);
  const values = ordered.map((entry) => unit === "m3" ? entry.consumptionM3 : entry.consumptionKwh);
  const data = { labels, datasets: [{ data: values, borderColor: "#4FD1C5", backgroundColor: "rgba(79,209,197,.13)", fill: true, tension: .42, pointRadius: 3, pointBackgroundColor: "#4FD1C5", borderWidth: 2 }] };
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: { raw: unknown }) => `${Number(ctx.raw).toFixed(unit === "m3" ? 1 : 0)} ${unit === "m3" ? "m³" : "kWh"}` } } }, scales: { x: { grid: { display: false }, ticks: { color: "#94A3B8", maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: "rgba(148,163,184,.1)" }, ticks: { color: "#94A3B8", maxTicksLimit: 5 } } } };
  return <div className="chart-card"><div className="chart-head"><div><h2>Consum istoric</h2><p>Consum cumulat pe lună, pe baza datei citirii.</p></div><div className="chart-controls"><div className="segmented">{[["m3", "m³"], ["kwh", "kWh"]].map(([key, label]) => <button key={key} className={unit === key ? "active" : ""} onClick={() => setUnit(key as "m3" | "kwh")}>{label}</button>)}</div><select value={range} onChange={(e) => setRange(Number(e.target.value) as 6 | 12)} aria-label="Perioada graficului"><option value="6">Ultimele 6 luni cu citiri</option><option value="12">Ultimele 12 luni cu citiri</option></select></div></div>{ordered.length ? <div className="chart-wrap"><Line data={data} options={options} /></div> : <div className="empty-state">Trimite prima autocitire pentru a vedea consumul.</div>}</div>;
}
