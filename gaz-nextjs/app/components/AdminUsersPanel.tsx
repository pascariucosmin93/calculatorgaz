"use client";

import { memo } from "react";
import { styles } from "../styles";

export type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  ownerName: string | null;
  address: string | null;
  createdAt: string;
};

type Props = {
  adminEmail: string;
  adminPassword: string;
  isAuthenticated: boolean;
  users: AdminUser[];
  loading: boolean;
  error: string;
  success: string;
  onAdminPasswordChange: (value: string) => void;
  onLoadUsers: () => void;
  onDeleteUser: (userId: string) => void;
};

function AdminUsersPanelComponent({
  adminEmail,
  adminPassword,
  isAuthenticated,
  users,
  loading,
  error,
  success,
  onAdminPasswordChange,
  onLoadUsers,
  onDeleteUser
}: Props) {
  return (
    <section style={styles.fieldGroup}>
      <h2 style={styles.sectionTitle}>Administrare conturi</h2>
      <p style={styles.authNotice}>
        Acces limitat pentru <strong>{adminEmail}</strong>.{" "}
        {isAuthenticated
          ? "Sesiunea admin este activă."
          : "Introdu parola de admin pentru a deschide sesiunea."}
      </p>
      <div style={styles.formRow}>
        <label style={styles.label}>
          Parolă admin
          <input
            type="password"
            style={styles.input}
            value={adminPassword}
            onChange={(event) => onAdminPasswordChange(event.target.value)}
            placeholder="admin"
            disabled={loading || isAuthenticated}
          />
        </label>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button type="button" style={styles.submitButton} onClick={onLoadUsers} disabled={loading}>
            {loading ? "Se încarcă..." : isAuthenticated ? "Reîncarcă conturile" : "Autentifică + încarcă"}
          </button>
        </div>
      </div>
      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}
      {users.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {users.map((user) => (
            <div key={user.id} style={styles.locationCard}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                <div>
                  <p style={styles.locationAddress}>
                    <strong>{user.username}</strong>
                    {user.email ? ` • ${user.email}` : ""}
                  </p>
                  <p style={styles.locationOwner}>
                    {user.ownerName ?? "Titular necunoscut"}
                    {user.address ? ` • ${user.address}` : ""}
                  </p>
                  <p style={styles.readingMetaText}>Creat: {new Date(user.createdAt).toLocaleString("ro-RO")}</p>
                </div>
                <button
                  type="button"
                  style={{
                    ...styles.authLogout,
                    borderColor: "#dc2626",
                    color: "#dc2626"
                  }}
                  onClick={() => onDeleteUser(user.id)}
                >
                  Șterge
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export const AdminUsersPanel = memo(AdminUsersPanelComponent);
