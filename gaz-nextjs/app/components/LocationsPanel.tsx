"use client";

import { FormEvent, useState } from "react";
import { LocationItem } from "@/lib/types";

type Input = { name?: string; address?: string; meterSerial?: string };

type Props = {
  locations: LocationItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: (input: Input) => Promise<void>;
  onUpdate: (id: string, input: Input) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

const emptyForm = { name: "", address: "", meterSerial: "" };

export function LocationsPanel({ locations, activeId, onSelect, onCreate, onUpdate, onDelete }: Props) {
  // editingId: null = formular închis, "new" = locație nouă, altfel id-ul editat.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = (item: LocationItem | null) => {
    setError("");
    setEditingId(item ? item.id : "new");
    setForm(item ? { name: item.name, address: item.address ?? "", meterSerial: item.meterSerial ?? "" } : emptyForm);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    try {
      await action();
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "A apărut o eroare.");
    } finally {
      setBusy(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(() => (editingId === "new" ? onCreate(form) : onUpdate(editingId as string, form)));
  };

  const remove = (item: LocationItem) => {
    if (!window.confirm(`Ștergi locația „${item.name}” împreună cu citirile și tarifele ei? Acțiunea nu poate fi anulată.`)) return;
    void run(() => onDelete(item.id));
  };

  return (
    <section className="card locations-panel" id="locations">
      <div className="card-title">
        <div>
          <p className="eyebrow">LOCAȚII DE CONSUM</p>
          <h2>Locațiile mele</h2>
        </div>
        <button type="button" className="button button-primary" onClick={() => open(null)} disabled={busy}>+ Adaugă locație</button>
      </div>
      <div className="location-list">
        {locations.map((item) => (
          <article key={item.id} className={`location-row${item.id === activeId ? " active" : ""}`}>
            <div>
              <strong>{item.name}{item.isDefault ? " · principală" : ""}</strong>
              <small>{item.address || "Fără adresă"}{item.meterSerial ? ` · contor ${item.meterSerial}` : ""}</small>
            </div>
            <div className="location-actions">
              {item.id !== activeId && <button type="button" className="button button-secondary" onClick={() => onSelect(item.id)}>Folosește</button>}
              <button type="button" className="button button-secondary" onClick={() => open(item)} disabled={busy}>Editează</button>
              {!item.isDefault && <button type="button" className="danger-button" onClick={() => remove(item)} disabled={busy}>Șterge</button>}
            </div>
          </article>
        ))}
      </div>
      {editingId && (
        <form className="location-form" onSubmit={submit}>
          <label>Nume<input required maxLength={80} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="ex. Apartament, Casa de vacanță" /></label>
          <label>Adresă<input maxLength={300} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Adresă completă" /></label>
          <label>Serie contor<input maxLength={80} value={form.meterSerial} onChange={(event) => setForm({ ...form, meterSerial: event.target.value })} /></label>
          {error && <p className="form-error">{error}</p>}
          <div className="location-actions">
            <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Se salvează..." : "Salvează"}</button>
            <button type="button" className="button button-secondary" onClick={() => setEditingId(null)} disabled={busy}>Renunță</button>
          </div>
        </form>
      )}
      {!editingId && error && <p className="form-error">{error}</p>}
    </section>
  );
}
