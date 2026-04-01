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
  newUsername: string;
  newEmail: string;
  newPassword: string;
  newOwnerName: string;
  newAddress: string;
  currentAdminPassword: string;
  nextAdminPassword: string;
  userPasswordDrafts: Record<string, string>;
  loading: boolean;
  error: string;
  success: string;
  onAdminPasswordChange: (value: string) => void;
  onNewUsernameChange: (value: string) => void;
  onNewEmailChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onNewOwnerNameChange: (value: string) => void;
  onNewAddressChange: (value: string) => void;
  onCurrentAdminPasswordChange: (value: string) => void;
  onNextAdminPasswordChange: (value: string) => void;
  onUserPasswordDraftChange: (userId: string, value: string) => void;
  onLoadUsers: () => void;
  onCreateUser: () => void;
  onChangeAdminPassword: () => void;
  onChangeUserPassword: (userId: string) => void;
  onDeleteUser: (userId: string) => void;
};

function AdminUsersPanelComponent({
  adminEmail,
  adminPassword,
  isAuthenticated,
  users,
  newUsername,
  newEmail,
  newPassword,
  newOwnerName,
  newAddress,
  currentAdminPassword,
  nextAdminPassword,
  userPasswordDrafts,
  loading,
  error,
  success,
  onAdminPasswordChange,
  onNewUsernameChange,
  onNewEmailChange,
  onNewPasswordChange,
  onNewOwnerNameChange,
  onNewAddressChange,
  onCurrentAdminPasswordChange,
  onNextAdminPasswordChange,
  onUserPasswordDraftChange,
  onLoadUsers,
  onCreateUser,
  onChangeAdminPassword,
  onChangeUserPassword,
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
      {isAuthenticated && (
        <div style={styles.fieldGroup}>
          <h3 style={styles.sectionTitle}>Parolă admin</h3>
          <div style={styles.formRow}>
            <label style={styles.label}>
              Parola curentă
              <input
                type="password"
                style={styles.input}
                value={currentAdminPassword}
                onChange={(event) => onCurrentAdminPasswordChange(event.target.value)}
                placeholder="Parola actuală"
                disabled={loading}
              />
            </label>
            <label style={styles.label}>
              Parola nouă
              <input
                type="password"
                style={styles.input}
                value={nextAdminPassword}
                onChange={(event) => onNextAdminPasswordChange(event.target.value)}
                placeholder="Minim 8 caractere, cu literă și cifră"
                disabled={loading}
              />
            </label>
          </div>
          <button type="button" style={styles.submitButton} onClick={onChangeAdminPassword} disabled={loading}>
            {loading ? "Se procesează..." : "Schimbă parola de admin"}
          </button>
        </div>
      )}
      {isAuthenticated && (
        <div style={styles.fieldGroup}>
          <h3 style={styles.sectionTitle}>Adaugă cont</h3>
          <div style={styles.formRow}>
            <label style={styles.label}>
              Utilizator
              <input
                type="text"
                style={styles.input}
                value={newUsername}
                onChange={(event) => onNewUsernameChange(event.target.value)}
                placeholder="utilizator"
                disabled={loading}
              />
            </label>
            <label style={styles.label}>
              Email
              <input
                type="email"
                style={styles.input}
                value={newEmail}
                onChange={(event) => onNewEmailChange(event.target.value)}
                placeholder="utilizator@email.ro"
                disabled={loading}
              />
            </label>
          </div>
          <div style={styles.formRow}>
            <label style={styles.label}>
              Parolă
              <input
                type="password"
                style={styles.input}
                value={newPassword}
                onChange={(event) => onNewPasswordChange(event.target.value)}
                placeholder="minim 8 caractere, cu literă și cifră"
                disabled={loading}
              />
            </label>
            <label style={styles.label}>
              Titular
              <input
                type="text"
                style={styles.input}
                value={newOwnerName}
                onChange={(event) => onNewOwnerNameChange(event.target.value)}
                placeholder="Nume titular"
                disabled={loading}
              />
            </label>
          </div>
          <label style={styles.label}>
            Adresă
            <input
              type="text"
              style={styles.input}
              value={newAddress}
              onChange={(event) => onNewAddressChange(event.target.value)}
              placeholder="Adresa locului de consum"
              disabled={loading}
            />
          </label>
          <button type="button" style={styles.submitButton} onClick={onCreateUser} disabled={loading}>
            {loading ? "Se procesează..." : "Creează cont"}
          </button>
        </div>
      )}
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
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem", minWidth: "min(260px, 100%)" }}>
                  <input
                    type="password"
                    style={styles.input}
                    value={userPasswordDrafts[user.id] ?? ""}
                    onChange={(event) => onUserPasswordDraftChange(user.id, event.target.value)}
                    placeholder="Parolă nouă pentru acest cont"
                    disabled={loading}
                  />
                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={styles.authLogout}
                      onClick={() => onChangeUserPassword(user.id)}
                      disabled={loading}
                    >
                      Schimbă parola
                    </button>
                    <button
                      type="button"
                      style={{
                        ...styles.authLogout,
                        borderColor: "#dc2626",
                        color: "#dc2626"
                      }}
                      onClick={() => onDeleteUser(user.id)}
                      disabled={loading}
                    >
                      Șterge
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export const AdminUsersPanel = memo(AdminUsersPanelComponent);
