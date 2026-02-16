"use client";

import { FormEvent, memo } from "react";
import { AuthMode, AuthUser } from "@/lib/types";
import { styles } from "../styles";

type Props = {
  user: AuthUser | null;
  authMode: AuthMode;
  authUsername: string;
  authEmail: string;
  authPassword: string;
  authLoading: boolean;
  authError: string;
  resetEmail: string;
  resetLoading: boolean;
  resetError: string;
  resetMessage: string;
  resetLink: string;
  onAuthModeChange: (mode: AuthMode) => void;
  onUsernameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onAuthSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onResetEmailChange: (value: string) => void;
  onResetPasswordSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLogout: () => void;
};

function AuthStatusCardComponent({
  user,
  authMode,
  authUsername,
  authEmail,
  authPassword,
  authLoading,
  authError,
  resetEmail,
  resetLoading,
  resetError,
  resetMessage,
  resetLink,
  onAuthModeChange,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onAuthSubmit,
  onResetEmailChange,
  onResetPasswordSubmit,
  onLogout
}: Props) {
  return (
    <section style={styles.authCard}>
      <div style={styles.authHeader}>
        <h2 style={styles.sectionTitle}>Cont utilizator</h2>
        {!user && (
          <div style={styles.authTabs}>
            <button
              type="button"
              style={{
                ...styles.authTab,
                ...(authMode === "login" ? styles.authTabActive : {})
              }}
              onClick={() => onAuthModeChange("login")}
            >
              Autentificare
            </button>
            <button
              type="button"
              style={{
                ...styles.authTab,
                ...(authMode === "signup" ? styles.authTabActive : {})
              }}
              onClick={() => onAuthModeChange("signup")}
            >
              Creează cont
            </button>
            <button
              type="button"
              style={{
                ...styles.authTab,
                ...(authMode === "reset" ? styles.authTabActive : {})
              }}
              onClick={() => onAuthModeChange("reset")}
            >
              Resetare parolă
            </button>
          </div>
        )}
      </div>
      {user ? (
        <div style={styles.authStatus}>
          <p style={styles.authStatusText}>
            Conectat ca <strong>{user.username}</strong>
          </p>
          {user.email && (
            <p style={{ ...styles.authStatusText, fontSize: "0.85rem" }}>
              {user.email}
            </p>
          )}
          <button type="button" style={styles.authLogout} onClick={onLogout}>
            Deconectează-te
          </button>
        </div>
      ) : authMode === "reset" ? (
        <form style={styles.authForm} onSubmit={onResetPasswordSubmit}>
          <label style={styles.label}>
            Email asociat contului
            <input
              type="email"
              autoComplete="email"
              style={styles.authInput}
              value={resetEmail}
              onChange={(event) => onResetEmailChange(event.target.value)}
              required
            />
          </label>
          {resetError && <p style={styles.error}>{resetError}</p>}
          {resetMessage && <p style={styles.success}>{resetMessage}</p>}
          {resetLink && (
            <p style={styles.authNotice}>
              <a href={resetLink} style={{ color: "#d1081f", fontWeight: 600 }} target="_blank" rel="noreferrer">
                Deschide pagina de resetare
              </a>
            </p>
          )}
          <button
            type="submit"
            className="primary-button"
            style={styles.authSubmit}
            disabled={resetLoading}
          >
            {resetLoading ? "Se trimite..." : "Trimite link-ul de resetare"}
          </button>
        </form>
      ) : (
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
          <button type="submit" className="primary-button" style={styles.authSubmit} disabled={authLoading}>
            {authLoading
              ? "Se procesează..."
              : authMode === "login"
              ? "Autentificare"
              : "Creează cont"}
          </button>
        </form>
      )}
    </section>
  );
}

export const AuthStatusCard = memo(AuthStatusCardComponent);
