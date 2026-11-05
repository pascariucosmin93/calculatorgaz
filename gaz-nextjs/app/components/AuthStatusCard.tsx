"use client";

import { FormEvent, memo } from "react";
import Link from "next/link";
import { AuthMode, AuthUser } from "@/lib/types";
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, USERNAME_MAX_LENGTH } from "@/lib/validation";
import { styles } from "../styles";

type Props = {
  user: AuthUser | null;
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
  onAuthModeChange,
  onUsernameChange,
  onEmailChange,
  onPasswordChange,
  onAuthSubmit,
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
              maxLength={USERNAME_MAX_LENGTH}
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
                maxLength={EMAIL_MAX_LENGTH}
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
              maxLength={PASSWORD_MAX_LENGTH}
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
          {authMode === "login" && (
            <Link className="text-link" href="/reset">
              Ai uitat parola?
            </Link>
          )}
        </form>
      )}
    </section>
  );
}

export const AuthStatusCard = memo(AuthStatusCardComponent);
