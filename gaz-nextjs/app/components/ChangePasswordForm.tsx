"use client";

import { FormEvent, useState } from "react";

import { csrfHeaders } from "../hooks/useAuth";
import { styles } from "../styles";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/lib/validation";

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Parola nouă și confirmarea trebuie să fie identice.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = (await response.json()) as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "Nu am putut schimba parola.");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(data.message ?? "Parola a fost schimbată.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Nu am putut schimba parola.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form style={styles.fieldGroup} onSubmit={handleSubmit}>
      <h2 style={styles.sectionTitle}>Schimbă parola</h2>
      <label style={styles.label}>
        Parola curentă
        <input type="password" autoComplete="current-password" style={styles.input} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} maxLength={PASSWORD_MAX_LENGTH} required />
      </label>
      <label style={styles.label}>
        Parola nouă
        <input type="password" autoComplete="new-password" style={styles.input} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} required />
      </label>
      <label style={styles.label}>
        Confirmă parola nouă
        <input type="password" autoComplete="new-password" style={styles.input} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={PASSWORD_MIN_LENGTH} maxLength={PASSWORD_MAX_LENGTH} required />
      </label>
      {error ? <p style={styles.error}>{error}</p> : null}
      {success ? <p style={styles.success}>{success}</p> : null}
      <button type="submit" style={styles.submitButton} disabled={saving}>
        {saving ? "Se schimbă parola..." : "Schimbă parola"}
      </button>
    </form>
  );
}
