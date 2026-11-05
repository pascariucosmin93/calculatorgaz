"use client";
import { useMemo, useState } from "react";
import { HistoryEntry, ReadingType } from "@/lib/types";
import { canCorrectReading, correctionDeadline, readingTypeLabels } from "@/lib/reading-correction";
import { csrfHeaders } from "../hooks/useAuth";
import { uploadReadingPhoto } from "../hooks/useReadingPhoto";
import { formatIndex } from "@/lib/format";

export function ReadingHistory({ history, onUpdated }: { history: HistoryEntry[]; onUpdated: () => Promise<void> }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState(""); const [readingType, setReadingType] = useState<ReadingType>("SELF_READING");
  const [error, setError] = useState(""); const [saving, setSaving] = useState(false);
  const ordered = useMemo(() => [...history].sort((a, b) => new Date(a.readingAt).getTime() - new Date(b.readingAt).getTime()), [history]);
  const startEdit = (entry: HistoryEntry) => { setEditing(entry.id); setValue(entry.currentReading.toString()); setReadingType(entry.readingType ?? "SELF_READING"); setError(""); };
  const save = async (entry: HistoryEntry) => {
    const currentReading = Number(value.replace(",", "."));
    if (!Number.isFinite(currentReading)) return setError("Introdu un index valid.");
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/readings", { method: "PATCH", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify({ id: entry.id, currentReading, readingType }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Nu am putut corecta citirea.");
      await onUpdated(); setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Nu am putut corecta citirea."); } finally { setSaving(false); }
  };
  const attachPhoto = async (entry: HistoryEntry, file: File | undefined) => {
    if (!file) return;
    setSaving(true); setError("");
    try { await uploadReadingPhoto(entry.id, file); await onUpdated(); }
    catch (err) { setError(err instanceof Error ? err.message : "Nu am putut încărca poza."); } finally { setSaving(false); }
  };
  const remove = async (entry: HistoryEntry) => {
    if (!window.confirm("Ștergi această citire? Acțiunea elimină indexul și recalculază următoarea perioadă.")) return;
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/readings", { method: "DELETE", headers: { "Content-Type": "application/json", ...csrfHeaders() }, body: JSON.stringify({ id: entry.id }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Nu am putut șterge citirea.");
      await onUpdated(); setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Nu am putut șterge citirea."); } finally { setSaving(false); }
  };
  return <section className="card reading-history"><div className="card-title"><div><p className="eyebrow">ISTORIC DETALIAT</p><h2>Calendar citiri</h2></div></div><p className="muted">O citire poate fi corectată sau ștearsă până la 4 zile după salvare. Oricare dintre acțiuni actualizează perioada următoare.</p>{error && !editing ? <p className="form-error">{error}</p> : null}<div className="reading-list">{ordered.length ? ordered.map((entry, index) => {
    const editable = canCorrectReading(entry.createdAt); const isEditing = editing === entry.id;
    const previous = ordered[index - 1];
    const period = previous ? `${new Date(previous.readingAt).toLocaleDateString("ro-RO")} – ${new Date(entry.readingAt).toLocaleDateString("ro-RO")}` : "Index de pornire";
    return <article className="reading-row" key={entry.id}><div><strong>{new Date(entry.readingAt).toLocaleDateString("ro-RO")}</strong><small>{period} · {entry.isBaseline ? "Index inițial" : `${entry.consumptionM3.toFixed(2)} m³ · ${entry.consumptionKwh.toFixed(0)} kWh`} · {readingTypeLabels[entry.readingType ?? "SELF_READING"]}</small></div>{isEditing ? <div className="reading-edit"><input aria-label="Index corectat" value={value} onChange={(event) => setValue(event.target.value.replace(/[^0-9.,]/g, ""))} /><select aria-label="Tip citire" value={readingType} onChange={(event) => setReadingType(event.target.value as ReadingType)}>{Object.entries(readingTypeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select><button className="button button-primary" onClick={() => save(entry)} disabled={saving}>{saving ? "Se salvează..." : "Salvează"}</button><button className="button button-secondary" onClick={() => setEditing(null)} disabled={saving}>Renunță</button>{error && <p className="form-error">{error}</p>}</div> : <><div className="reading-index">{formatIndex(entry.currentReading)}<small>index</small></div><div className="reading-photo">{entry.photoKey ? <a className="text-link" href={`/api/readings/${entry.id}/photo`} target="_blank" rel="noopener noreferrer">📷 Vezi poza</a> : <label className="text-link">📷 Adaugă poză<input type="file" accept="image/*" hidden disabled={saving} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void attachPhoto(entry, file); }} /></label>}</div>{editable ? <div><button className="button button-secondary" onClick={() => startEdit(entry)} disabled={saving}>Corectează</button><button className="danger-button" style={{ marginLeft: 8 }} onClick={() => remove(entry)} disabled={saving}>Șterge</button></div> : <small className="reading-locked">Corectarea s-a închis la {correctionDeadline(entry.createdAt).toLocaleString("ro-RO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</small>}</>}</article>;
  }) : <div className="empty-state">Nu există citiri salvate.</div>}</div></section>;
}
