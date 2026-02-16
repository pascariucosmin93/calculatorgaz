"use client";

import { FormEvent, memo } from "react";
import { styles } from "../styles";

type Props = {
  ownerName: string;
  address: string;
  isSaving: boolean;
  error: string;
  success: string;
  onOwnerNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function ProfileFormComponent({
  ownerName,
  address,
  isSaving,
  error,
  success,
  onOwnerNameChange,
  onAddressChange,
  onSubmit
}: Props) {
  return (
    <form style={styles.fieldGroup} onSubmit={onSubmit}>
      <h2 style={styles.sectionTitle}>Date cont</h2>
      <div style={styles.formRow}>
        <label style={styles.label}>
          Titular loc de consum
          <input
            type="text"
            style={styles.input}
            value={ownerName}
            onChange={(event) => onOwnerNameChange(event.target.value)}
            placeholder="Nume complet"
          />
        </label>
        <label style={styles.label}>
          Adresă loc de consum
          <input
            type="text"
            style={styles.input}
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="Adresă completă"
          />
        </label>
      </div>
      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}
      <button type="submit" style={styles.submitButton} disabled={isSaving}>
        {isSaving ? "Se salvează..." : "Salvează datele"}
      </button>
    </form>
  );
}

export const ProfileForm = memo(ProfileFormComponent);
