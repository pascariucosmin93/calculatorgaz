"use client";

import { FormEvent, memo } from "react";
import { AuthMode } from "@/lib/types";
import { styles } from "../styles";

type Props = {
  authMode: AuthMode;
  authUsername: string;
  authEmail: string;
  authPassword: string;
  authLoading: boolean;
  authError: string;
  onAuthModeChange: (mode: AuthMode) => void;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function AuthOverlayComponent({
  authMode,
  authUsername,
  authEmail,
  authPassword,
  authLoading,
  authError,
  onAuthModeChange,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onAuthSubmit
}: Props) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modalCard}>
        <h2 style={{ margin: 0, marginBottom: 12 }}>Cont utilizator</h2>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => onAuthModeChange("login")}
            style={{
              ...(authMode === "login" ? styles.authTabActive : styles.authTab),
              padding: "0.4rem 0.9rem"
            }}
          >
            Autentificare
          </button>
          <button
            onClick={() => onAuthModeChange("signup")}
            style={{
              ...(authMode === "signup" ? styles.authTabActive : styles.authTab),
              padding: "0.4rem 0.9rem"
            }}
          >
            Creează cont
          </button>
        </div>
        <form style={styles.authForm} onSubmit={onAuthSubmit}>
          <label style={styles.label}>
            Utilizator sau email
            <input
              type="text"
              autoComplete="username"
              style={styles.authInput}
              value={authUsername}
              onChange={(event) => onUsernameChange(event.target.value)}
              required
            />
          </label>
          {authMode === "signup" && (
            <label style={styles.label}>
              Email
              <input
                type="email"
                autoComplete="email"
                style={styles.authInput}
                value={authEmail}
                onChange={(event) => onEmailChange(event.target.value)}
                required
              />
            </label>
          )}
          <label style={styles.label}>
            Parola
            <input
              type="password"
              autoComplete={authMode === "signup" ? "new-password" : "current-password"}
              style={styles.authInput}
              value={authPassword}
              onChange={(event) => onPasswordChange(event.target.value)}
              required
            />
          </label>
          {authError && <p style={styles.error}>{authError}</p>}
          <button
            type="submit"
            style={{
              backgroundColor: "#d1081f",
              color: "#ffffff",
              border: "1px solid rgba(0,0,0,0.12)",
              boxShadow: "0 8px 22px rgba(209,8,31,0.22)",
              borderRadius: "0.85rem",
              padding: "0.8rem",
              fontWeight: 700,
              cursor: authLoading ? "not-allowed" : "pointer",
              width: "100%",
              textAlign: "center",
              outline: "none"
            }}
            disabled={authLoading}
            className="primary-button"
          >
            {authLoading ? "Se procesează..." : authMode === "login" ? "Autentificare" : "Creează cont"}
          </button>
        </form>
      </div>
    </div>
  );
}

export const AuthOverlay = memo(AuthOverlayComponent);
