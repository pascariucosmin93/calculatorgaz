"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { getCsrfHeaders } from "../hooks/useAuth";

type Message = { id: string; body: string; senderType: "CUSTOMER" | "DEVELOPER"; createdAt: string };
type Conversation = {
  id: string; subject: string; category: "GENERAL" | "BUG" | "BILLING" | "READING";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED"; createdAt: string; updatedAt: string;
  user?: { username: string; ownerName: string | null; email: string | null };
  messages: Message[];
};

const categoryLabels = { GENERAL: "Întrebare", BUG: "Raportează o problemă", BILLING: "Facturare", READING: "Autocitire" };
const statusLabels = { OPEN: "Nou", IN_PROGRESS: "În lucru", RESOLVED: "Rezolvat" };

export function SupportCenter({ isAdmin, enabled = true }: { isAdmin?: boolean; enabled?: boolean }) {
  const [items, setItems] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<Conversation["category"]>("GENERAL");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/support/conversations", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nu am putut încărca conversațiile.");
      setItems(data);
      setSelected((current) => current ? data.find((item: Conversation) => item.id === current.id) ?? null : data[0] ?? null);
    } catch (err) { setError(err instanceof Error ? err.message : "Nu am putut încărca conversațiile."); }
    finally { setLoading(false); }
  }, [enabled]);

  useEffect(() => { load(); }, [load]);

  const openConversation = async (conversation: Conversation) => {
    setSelected(conversation);
    try {
      const response = await fetch(`/api/support/conversations/${conversation.id}`, { cache: "no-store" });
      if (response.ok) setSelected(await response.json());
    } catch { /* lista rămâne disponibilă dacă încărcarea detaliilor eșuează */ }
  };

  const create = async (event: FormEvent) => {
    event.preventDefault(); setSending(true); setError("");
    try {
      const response = await fetch("/api/support/conversations", { method: "POST", headers: { "Content-Type": "application/json", ...await getCsrfHeaders() }, body: JSON.stringify({ subject, category, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nu am putut trimite solicitarea.");
      setSubject(""); setMessage(""); setSelected(data); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Nu am putut trimite solicitarea."); }
    finally { setSending(false); }
  };

  const sendReply = async (event: FormEvent) => {
    event.preventDefault(); if (!selected) return; setSending(true); setError("");
    try {
      const response = await fetch(`/api/support/conversations/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json", ...await getCsrfHeaders() }, body: JSON.stringify({ message: reply }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Nu am putut trimite mesajul.");
      setReply(""); setSelected(data); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Nu am putut trimite mesajul."); }
    finally { setSending(false); }
  };

  const changeStatus = async (status: Conversation["status"]) => {
    if (!selected) return;
    const response = await fetch(`/api/support/conversations/${selected.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", ...await getCsrfHeaders() }, body: JSON.stringify({ status }) });
    if (response.ok) { const data = await response.json(); setSelected((current) => current ? { ...current, status: data.status } : current); await load(); }
  };

  if (!enabled) return <section className="card support-access"><p className="eyebrow">SUPORT CLIENȚI</p><h2>Activează sesiunea de administrare</h2><p className="muted">După autentificarea de administrator poți răspunde la conversațiile clienților.</p></section>;

  return <section className="support-center">
    <div className="support-heading"><div><p className="eyebrow">{isAdmin ? "INBOX DEZVOLTATORI" : "SUPORT"}</p><h2>{isAdmin ? "Conversații clienți" : "Cum te putem ajuta?"}</h2><p className="muted">{isAdmin ? "Răspunde și urmărește solicitările primite." : "Scrie direct echipei sau raportează o problemă din aplicație."}</p></div></div>
    {!isAdmin && <form className="support-new" onSubmit={create}><label>Tip solicitare<select value={category} onChange={(e) => setCategory(e.target.value as Conversation["category"])}>{Object.entries(categoryLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Subiect<input value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} placeholder="Pe scurt, cu ce te putem ajuta?" required /></label><label className="support-wide">Mesaj<textarea value={message} maxLength={4000} onChange={(e) => setMessage(e.target.value)} placeholder="Descrie situația și pașii care au dus la problemă." required /></label><button className="button button-primary" disabled={sending}>{sending ? "Se trimite..." : "Trimite solicitarea"}</button></form>}
    {error && <p className="form-error">{error}</p>}
    <div className="support-layout"><aside className="support-list"><strong>{isAdmin ? "Solicitări" : "Conversațiile mele"}</strong>{loading ? <p className="muted">Se încarcă...</p> : items.length === 0 ? <p className="muted">Nu există conversații încă.</p> : items.map((item) => <button key={item.id} className={`support-thread ${selected?.id === item.id ? "active" : ""}`} onClick={() => openConversation(item)}><span><b>{item.subject}</b>{isAdmin && <small>{item.user?.ownerName || item.user?.username}</small>}<small>{categoryLabels[item.category]}</small></span><em className={`support-status ${item.status.toLowerCase()}`}>{statusLabels[item.status]}</em></button>)}</aside>
      <div className="support-chat">{selected ? <><div className="support-chat-head"><div><h3>{selected.subject}</h3>{isAdmin && <p className="muted">{selected.user?.ownerName || selected.user?.username} · {selected.user?.email}</p>}</div>{isAdmin ? <select value={selected.status} onChange={(e) => changeStatus(e.target.value as Conversation["status"])}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select> : <span className={`support-status ${selected.status.toLowerCase()}`}>{statusLabels[selected.status]}</span>}</div><div className="support-messages">{selected.messages.map((item) => <article key={item.id} className={`support-message ${item.senderType.toLowerCase()}`}><small>{item.senderType === "DEVELOPER" ? "Echipa de dezvoltare" : "Tu"} · {new Date(item.createdAt).toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })}</small><p>{item.body}</p></article>)}</div>{(isAdmin || selected.status !== "RESOLVED") && <form className="support-reply" onSubmit={sendReply}><textarea value={reply} maxLength={4000} onChange={(e) => setReply(e.target.value)} placeholder={isAdmin ? "Scrie un răspuns pentru client..." : "Adaugă un mesaj..."} required /><button className="button button-primary" disabled={sending}>{sending ? "Se trimite..." : "Trimite"}</button></form>}</> : <div className="empty-state">Selectează o conversație pentru a vedea mesajele.</div>}</div>
    </div>
  </section>;
}
