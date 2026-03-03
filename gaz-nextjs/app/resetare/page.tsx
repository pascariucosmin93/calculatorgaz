"use client";

import { FormEvent, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { styles } from "../styles";

export const dynamic = "force-dynamic";

function ResetPasswordContent() {
  const params = useSearchParams();
  const resetId = params.get("rid") ?? "";
  const token = params.get("token") ?? "";
  const email = params.get("email") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailLabel = useMemo(() => {
    if (!email) {
      return "";
    }
    return email;
  }, [email]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!resetId && (!token || !email)) {
      setError("Link-ul de resetare este invalid sau expirat.");
      return;
    }

    if (password.length < 8) {
      setError("Parola trebuie să aibă cel puțin 8 caractere.");
      return;
    }

    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      setError("Parola trebuie să conțină cel puțin o literă și o cifră.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Parolele trebuie să fie identice.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetId, token, email, password })
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Nu am putut reseta parola.");
      }

      setMessage(data.message ?? "Parola a fost resetată. Te poți autentifica acum.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Eroare la resetarea parolei.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={styles.page}>
      <div style={styles.stack}>
        <section style={styles.card}>
          <h1 style={styles.sectionTitle}>Resetare parolă</h1>
          <p style={styles.authNotice}>
            Introdu o parolă nouă pentru contul asociat emailului tău.
          </p>
          {!resetId && (!token || !email) ? (
            <p style={styles.error}>
              Link-ul de resetare este invalid. Verifică dacă ai folosit link-ul corect din mesajul primit.
            </p>
          ) : (
            <form style={styles.authForm} onSubmit={handleSubmit}>
              {emailLabel ? (
                <label style={styles.label}>
                  Email
                  <input
                    type="email"
                    disabled
                    value={emailLabel}
                    style={{ ...styles.authInput, opacity: 0.8 }}
                  />
                </label>
              ) : null}
              <label style={styles.label}>
                Parolă nouă
                <input
                  type="password"
                  autoComplete="new-password"
                  style={styles.authInput}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              <label style={styles.label}>
                Confirmă parola
                <input
                  type="password"
                  autoComplete="new-password"
                  style={styles.authInput}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
              </label>
              {error && <p style={styles.error}>{error}</p>}
              {message && <p style={styles.success}>{message}</p>}
              <button type="submit" className="primary-button" style={styles.authSubmit} disabled={loading}>
                {loading ? "Se procesează..." : "Resetează parola"}
              </button>
            </form>
          )}
          <p style={styles.authNotice}>
            <Link href="/" style={{ color: "#d1081f", fontWeight: 600 }}>
              Întoarce-te la pagina principală
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p style={{ color: "var(--text-secondary)", textAlign: "center" }}>Se încarcă...</p>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
