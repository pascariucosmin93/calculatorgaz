import { ConsumptionComparison } from "@/lib/consumption";

const differenceLabel = (value: number | null) => value === null ? "fără termen de comparație" : `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`;
const tone = (value: number | null) => value !== null && value > 0 ? "status-warning" : "status-success";

export function ConsumptionComparisonCard({ comparison }: { comparison: ConsumptionComparison | null }) {
  return <section className="card result-card comparison-card">
    <p className="eyebrow">COMPARAȚIE CONSUM</p>
    {comparison ? <>
      <h2>{comparison.currentM3.toFixed(1)} m³ în ultima lună cu citiri</h2>
      <div className="stats-grid four">
        <div><p className="muted">Luna precedentă</p><strong>{comparison.previousM3 === null ? "—" : `${comparison.previousM3.toFixed(1)} m³`}</strong><p className={`status-badge ${tone(comparison.previousChangePercent)}`}>{differenceLabel(comparison.previousChangePercent)}</p></div>
        <div><p className="muted">Media ta</p><strong>{comparison.averageM3 === null ? "—" : `${comparison.averageM3.toFixed(1)} m³`}</strong><p className={`status-badge ${tone(comparison.averageChangePercent)}`}>{differenceLabel(comparison.averageChangePercent)}</p></div>
        <div><p className="muted">Aceeași lună anul trecut</p><strong>{comparison.sameMonthLastYearM3 === null ? "—" : `${comparison.sameMonthLastYearM3.toFixed(1)} m³`}</strong><p className={`status-badge ${tone(comparison.sameMonthLastYearChangePercent)}`}>{differenceLabel(comparison.sameMonthLastYearChangePercent)}</p></div>
      </div>
    </> : <><h2>Comparația va apărea după prima perioadă calculată</h2><p className="muted">După două citiri, putem compara consumul între perioade.</p></>}
  </section>;
}
