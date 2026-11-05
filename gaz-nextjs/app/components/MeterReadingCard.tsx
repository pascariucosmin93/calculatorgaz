import { ChangeEvent } from "react";
import { formatIndex } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
type Props = { value: number | null; serial: string; submittedAt: string | null; currentReading: string; isSaving: boolean; error: string; onChange: (v: string) => void; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void; photo: File | null; photoError: string; onPhotoChange: (file: File | null) => void };

export function MeterReadingCard({ value, serial, submittedAt, currentReading, isSaving, error, onChange, onSubmit, photo, photoError, onPhotoChange }: Props) {
  const isInitialReading = value === null;
  const handlePhotoSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";
    onPhotoChange(file);
  };

  return <section className="meter-card"><div className="meter-header"><div><p className="eyebrow">INDEX CONTOR</p><h2>{formatIndex(value)}</h2></div><StatusBadge tone="success">Activ</StatusBadge></div><div className="meter-meta"><span>Seria contor<strong>{serial}</strong></span><span>Ultima transmitere<strong>{submittedAt ?? "—"}</strong></span></div>{isInitialReading && <p className="muted">Prima citire va fi salvată ca index de pornire. Consumul se calculează de la următoarea transmitere.</p>}
    <div className="photo-attach">
      <input type="file" accept="image/*" onChange={handlePhotoSelected} hidden id="meter-photo-input" />
      <label htmlFor="meter-photo-input" className="button button-secondary">{photo ? "📷 Schimbă poza" : "📷 Atașează o poză a contorului (opțional)"}</label>
      {photo && <p className="muted">{photo.name} <button type="button" className="text-link" onClick={() => onPhotoChange(null)}>Elimină</button></p>}
      {photoError && <p className="form-warning">{photoError}</p>}
    </div>
    <form onSubmit={onSubmit} className="reading-form"><label>Index nou<input inputMode="decimal" type="text" value={currentReading} onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, ""))} placeholder="17.244,000" required /></label><button className="button button-primary" type="submit" disabled={isSaving}>{isSaving ? "Se trimite..." : isInitialReading ? "Salvează indexul inițial" : "Trimite index"}</button></form>{error && <p className="form-error">{error}</p>}</section>;
}
