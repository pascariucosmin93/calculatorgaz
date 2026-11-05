"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH
} from "@/lib/validation";
import { styles } from "../styles";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  return token ? <ResetStep token={token} /> : <RequestStep />;
}

function RequestStep() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "A apărut o eroare. Încearcă din nou.");
        return;
      }
      setDone(true);
    } catch {
      setError("Serviciul este momentan indisponibil.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <section style={styles.authCard}>
        <h2 style={styles.sectionTitle}>Resetare parolă</h2>
        <p style={styles.authStatusText}>
          Dacă există un cont cu acest utilizator, o cerere de resetare a fost
          trimisă administratorului, care îți va transmite linkul de resetare.
        </p>
        <Link className="text-link" href="/">
          Înapoi la autentificare
        </Link>
      </section>
    );
  }

  return (
    <section style={styles.authCard}>
      <h2 style={styles.sectionTitle}>Ai uitat parola?</h2>
      <p style={styles.authStatusText}>
        Introdu numele de utilizator sau emailul contului. Administratorul va
        primi o cerere de resetare și îți va trimite linkul de resetare a
        parolei.
      </p>
      <form style={styles.authForm} onSubmit={onSubmit}>
        <label style={styles.label}>
          Utilizator sau email
          <input
            type="text"
            autoComplete="username"
            style={styles.authInput}
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            maxLength={USERNAME_MAX_LENGTH}
            required
          />
        </label>
        {error && <p style={styles.error}>{error}</p>}
        <button
          type="submit"
          className="primary-button"
          style={styles.authSubmit}
          disabled={loading}
        >
          {loading ? "Se trimite..." : "Trimite cererea de resetare"}
        </button>
      </form>
      <Link className="text-link" href="/">
        Înapoi la autentificare
      </Link>
    </section>
  );
}

function ResetStep({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Parolele introduse nu coincid.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Linkul de resetare este invalid sau a expirat.");
        return;
      }
      setDone(true);
    } catch {
      setError("Serviciul este momentan indisponibil.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <section style={styles.authCard}>
        <h2 style={styles.sectionTitle}>Parolă resetată</h2>
        <p style={styles.authStatusText}>
          Te poți autentifica acum cu noua parolă.
        </p>
        <Link className="text-link" href="/">
          Mergi la autentificare
        </Link>
      </section>
    );
  }

  return (
    <section style={styles.authCard}>
      <h2 style={styles.sectionTitle}>Setează o parolă nouă</h2>
      <form style={styles.authForm} onSubmit={onSubmit}>
        <label style={styles.label}>
          Parolă nouă
          <input
            type="password"
            autoComplete="new-password"
            style={styles.authInput}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
          />
        </label>
        <label style={styles.label}>
          Confirmă parola nouă
          <input
            type="password"
            autoComplete="new-password"
            style={styles.authInput}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            required
          />
        </label>
        {error && <p style={styles.error}>{error}</p>}
        <button
          type="submit"
          className="primary-button"
          style={styles.authSubmit}
          disabled={loading}
        >
          {loading ? "Se salvează..." : "Salvează parola nouă"}
        </button>
      </form>
    </section>
  );
}
