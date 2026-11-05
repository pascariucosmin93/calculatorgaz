export const styles = {
  authCard: {
    width: "100%",
    maxWidth: 620,
    margin: "2rem auto",
    backgroundColor: "var(--card-bg)",
    borderRadius: "clamp(1rem, 2.2vw, 1.25rem)",
    padding: "clamp(0.9rem, 3vw, 1.25rem)",
    boxShadow: "var(--card-shadow)",
    border: "1px solid var(--border-muted)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem"
  },
  authHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "1rem",
    flexWrap: "wrap" as const
  },
  authTabs: {
    display: "flex",
    gap: "0.5rem",
    flexWrap: "wrap" as const,
    width: "100%"
  },
  authTab: {
    border: "1px solid var(--border)",
    borderRadius: "999px",
    padding: "0.4rem 0.95rem",
    backgroundColor: "transparent",
    color: "var(--text-secondary)",
    cursor: "pointer" as const,
    flex: "1 1 140px",
    minHeight: 40,
    textAlign: "center" as const
  },
  authTabActive: {
    backgroundColor: "#d1081f",
    color: "#fff",
    borderColor: "#d1081f"
  },
  authForm: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
    width: "100%",
    maxWidth: 520,
    margin: "0 auto"
  },
  authInput: {
    border: "1px solid var(--input-border)",
    borderRadius: "0.85rem",
    padding: "0.65rem 0.9rem",
    fontSize: "1rem",
    backgroundColor: "var(--input-bg)",
    color: "var(--text-primary)",
    width: "100%"
  },
  authSubmit: {
    backgroundColor: "#d1081f",
    color: "#fff",
    borderRadius: "0.85rem",
    padding: "0.8rem",
    fontWeight: 600,
    cursor: "pointer" as const,
    boxShadow: "0 6px 18px rgba(209,8,31,0.18)",
    border: "1px solid rgba(0,0,0,0.12)",
    width: "100%"
  },
  authStatus: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "1rem",
    flexWrap: "wrap" as const
  },
  authStatusText: {
    margin: 0,
    color: "var(--text-secondary)"
  },
  authLogout: {
    border: "1px solid var(--border)",
    borderRadius: "0.85rem",
    padding: "0.5rem 0.85rem",
    backgroundColor: "var(--surface-card)",
    color: "var(--text-primary)",
    fontWeight: 600,
    cursor: "pointer" as const,
    transition: "background-color 0.2s ease, color 0.2s ease",
    alignSelf: "flex-start" as const
  },
  locationCard: {
    backgroundColor: "var(--surface-card)",
    borderRadius: "1.25rem",
    padding: "clamp(0.9rem, 3vw, 1.2rem)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.35rem"
  },
  locationAddress: {
    margin: 0,
    color: "var(--text-primary)",
    fontSize: "0.95rem",
    lineHeight: 1.5,
    overflowWrap: "anywhere" as const
  },
  locationOwner: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontWeight: 600,
    overflowWrap: "anywhere" as const
  },
  readingMetaText: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    lineHeight: 1.4
  },
  success: {
    color: "#22c55e",
    margin: 0,
    fontWeight: 600
  },
  submitButton: {
    backgroundColor: "#d1081f",
    color: "#fff",
    borderRadius: "999px",
    padding: "0.95rem",
    fontWeight: 700,
    fontSize: "1rem",
    cursor: "pointer" as const,
    boxShadow: "0 8px 22px rgba(209,8,31,0.18)",
    border: "1px solid rgba(0,0,0,0.12)",
    width: "100%"
  },
  sectionTitle: {
    margin: 0,
    fontSize: "1.15rem",
    color: "var(--text-primary)"
  },
  fieldGroup: {
    border: "1px solid var(--border)",
    borderRadius: "1.25rem",
    padding: "clamp(0.9rem, 3vw, 1.25rem)",
    backgroundColor: "var(--card-bg)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem"
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
    gap: "1rem"
  },
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    fontSize: "0.9rem"
  },
  input: {
    border: "1px solid var(--input-border)",
    borderRadius: "0.85rem",
    padding: "0.65rem 0.9rem",
    fontSize: "1rem",
    backgroundColor: "var(--input-bg)",
    color: "var(--text-primary)",
    width: "100%"
  },
  select: {
    border: "1px solid var(--input-border)",
    borderRadius: "0.85rem",
    padding: "0.65rem 0.9rem",
    fontSize: "1rem",
    backgroundColor: "var(--select-bg)",
    color: "var(--text-primary)",
    width: "100%"
  },
  error: {
    margin: 0,
    color: "var(--error-text)",
    fontWeight: 600
  },
  authNotice: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    lineHeight: 1.45
  }
} as const;
