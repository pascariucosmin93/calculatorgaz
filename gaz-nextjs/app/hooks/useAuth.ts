"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthMode, AuthUser } from "@/lib/types";
import { getCookieConsent } from "../components/CookieConsent";

let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch("/api/auth/csrf");
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.csrfToken;
      return csrfToken!;
    }
  } catch {
    // CSRF service unavailable
  }
  return "";
}

export function csrfHeaders(): Record<string, string> {
  return csrfToken ? { "x-csrf-token": csrfToken } : {};
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    ensureCsrfToken().catch(() => {});

    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.id && data?.username) {
          setUser({
            id: data.id,
            username: data.username,
            email: data.email ?? null,
            ownerName: data.ownerName ?? null,
            address: data.address ?? null,
            createdAt: data.createdAt ?? new Date().toISOString()
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleAuthSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!authUsername.trim() || !authPassword) {
        setAuthError("Completează utilizatorul și parola.");
        return;
      }
      if (authMode === "signup" && !authEmail.trim()) {
        setAuthError("Introdu și emailul pentru crearea contului.");
        return;
      }

      setAuthLoading(true);
      setAuthError("");
      const endpoint = authMode === "signup" ? "signup" : "login";

      try {
        const consent = getCookieConsent();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (consent === "accepted") {
          headers["x-cookie-consent"] = "accepted";
        }

        const response = await fetch(`/api/auth/${endpoint}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            username: authUsername,
            password: authPassword,
            ...(authMode === "signup" ? { email: authEmail } : {}),
            ...(authMode === "login" ? { identifier: authUsername } : {})
          })
        });

        let data: Record<string, unknown> | null = null;
        try {
          const text = await response.text();
          if (text) data = JSON.parse(text);
        } catch {
          // ignore parse errors
        }

        if (!response.ok) {
          throw new Error(
            (data?.error as string) || `Eroare de autentificare (cod ${response.status}).`
          );
        }
        if (!data) {
          throw new Error("Răspuns invalid de la server (lipsă JSON). Încearcă din nou.");
        }

        setUser({
          id: data.id as string,
          username: data.username as string,
          email: (data.email as string) ?? null,
          ownerName: (data.ownerName as string) ?? null,
          address: (data.address as string) ?? null,
          createdAt: data.createdAt as string
        });
        setAuthUsername("");
        setAuthEmail("");
        setAuthPassword("");
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : "Eroare la autentificare.");
      } finally {
        setAuthLoading(false);
      }
    },
    [authMode, authEmail, authPassword, authUsername]
  );

  const handleLogout = useCallback(() => {
    setUser(null);
    fetch("/api/auth/logout", { method: "POST", headers: csrfHeaders() }).catch(() => {});
  }, []);

  const handleAuthModeChange = useCallback((mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError("");
    setResetError("");
    setResetMessage("");
    setResetLink("");
  }, []);

  const handleResetEmailChange = useCallback((value: string) => {
    setResetEmail(value);
    setResetError("");
    setResetMessage("");
  }, []);

  const handleResetPasswordSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const email = resetEmail.trim();
      if (!email) {
        setResetError("Introdu adresa de email.");
        setResetMessage("");
        return;
      }

      setResetLoading(true);
      setResetError("");
      setResetMessage("");
      setResetLink("");

      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });

        let data: Record<string, string> | null = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        if (!response.ok) {
          setResetError(data?.error ?? "Nu am putut trimite link-ul de resetare.");
          return;
        }

        setResetMessage(data?.message ?? "Ți-am trimis instrucțiunile pentru resetarea parolei.");
        setResetLink(data?.resetUrl ?? data?.resetPage ?? "");
        setResetEmail("");
      } catch {
        setResetError("Eroare la trimiterea cererii de resetare.");
      } finally {
        setResetLoading(false);
      }
    },
    [resetEmail]
  );

  return {
    user,
    setUser,
    authMode,
    authUsername,
    authEmail,
    authPassword,
    authLoading,
    authError,
    resetEmail,
    resetLink,
    resetLoading,
    resetError,
    resetMessage,
    handleAuthSubmit,
    handleLogout,
    handleAuthModeChange,
    onUsernameChange: useCallback((v: string) => setAuthUsername(v), []),
    onEmailChange: useCallback((v: string) => setAuthEmail(v), []),
    onPasswordChange: useCallback((v: string) => setAuthPassword(v), []),
    handleResetEmailChange,
    handleResetPasswordSubmit
  };
}
