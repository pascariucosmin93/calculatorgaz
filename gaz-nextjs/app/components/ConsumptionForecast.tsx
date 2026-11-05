"use client";

import { ConsumptionForecast } from "@/lib/forecast";
import { formatCurrency } from "@/lib/format";

export function ConsumptionForecastCard({ forecast }: { forecast: ConsumptionForecast | null }) {
  return <section className="card result-card forecast-card">
    <p className="eyebrow">PREVIZIUNE LUNARĂ</p>
    {forecast ? <>
      <h2>{forecast.projectedConsumptionM3.toFixed(1)} m³ · {formatCurrency(forecast.projectedTotal)}</h2>
      <p className="muted">Estimare până la finalul lunii: {forecast.projectedConsumptionKwh.toFixed(0)} kWh. Bazată pe media de {forecast.dailyAverageM3.toFixed(2)} m³/zi din ultimele {forecast.sampleCount} perioade cu citiri.</p>
    </> : <>
      <h2>Previziunea va apărea curând</h2>
      <p className="muted">Mai este nevoie de cel puțin o perioadă de consum calculată între două citiri.</p>
    </>}
  </section>;
}
