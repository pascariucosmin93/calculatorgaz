"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AuthMode, AuthUser } from "@/lib/types";
import { requestJson } from "@/lib/api-client";

let csrfToken: string | null = null;

async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch("/api/auth/csrf", {
      method: "GET",
      credentials: "include",
      cache: "no-store"
    });
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

export async function getCsrfHeaders(): Promise<Record<string, string>> {
  const token = await ensureCsrfToken();
  return token ? { "x-csrf-token": token } : {};
}

export function csrfHeaders(): Record<string, string> {
  return csrfToken ? { "x-csrf-token": csrfToken } : {};
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    ensureCsrfToken().catch((err) => console.warn("CSRF token fetch failed:", err));

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
            meterSerial: data.meterSerial ?? null,
            isAdmin: data.isAdmin === true,
            createdAt: data.createdAt ?? new Date().toISOString()
          });
        } else {
          setUser(null);
        }
      })
      .catch((err) => {
        console.warn("Auth status check failed:", err);
        setUser(null);
      })
      .finally(() => setIsLoading(false));
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
        const data = await requestJson<Record<string, unknown> | null>(
          `/api/auth/${endpoint}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: authUsername,
              password: authPassword,
              ...(authMode === "signup" ? { email: authEmail } : {}),
              ...(authMode === "login" ? { identifier: authUsername } : {})
            })
          },
          "Eroare de autentificare."
        );
        if (!data) {
          throw new Error("Răspuns invalid de la server (lipsă JSON). Încearcă din nou.");
        }

        setUser({
          id: data.id as string,
          username: data.username as string,
          email: (data.email as string) ?? null,
          ownerName: (data.ownerName as string) ?? null,
          address: (data.address as string) ?? null,
          meterSerial: (data.meterSerial as string) ?? null,
          isAdmin: data.isAdmin === true,
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
    fetch("/api/auth/logout", { method: "POST", headers: csrfHeaders() }).catch((err) => console.warn("Logout request failed:", err));
  }, []);

  const handleAuthModeChange = useCallback((mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError("");
  }, []);

  return {
    user,
    setUser,
    isLoading,
    authMode,
    authUsername,
    authEmail,
    authPassword,
    authLoading,
    authError,
    handleAuthSubmit,
    handleLogout,
    handleAuthModeChange,
    onUsernameChange: useCallback((v: string) => setAuthUsername(v), []),
    onEmailChange: useCallback((v: string) => setAuthEmail(v), []),
    onPasswordChange: useCallback((v: string) => setAuthPassword(v), [])
  };
}
