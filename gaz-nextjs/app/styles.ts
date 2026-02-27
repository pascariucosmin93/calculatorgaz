export const styles = {
  page: {
    minHeight: "100vh",
    background: "var(--page-bg)",
    display: "flex",
    justifyContent: "center",
    padding: "clamp(0.75rem, 3vw, 2rem)",
    overflowY: "auto" as const
  },
  stack: {
    width: "100%",
    maxWidth: 560,
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.5rem"
  },
  authCard: {
    width: "100%",
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
    gap: "0.75rem"
  },
  authInput: {
    border: "1px solid var(--input-border)",
    borderRadius: "0.85rem",
    padding: "0.65rem 0.9rem",
    fontSize: "1rem",
    outline: "none",
    backgroundColor: "var(--input-bg)",
    color: "var(--text-primary)",
    width: "100%"
  },
  authSubmit: {
    border: "none",
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
  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(2,6,23,0.6)",
    zIndex: 50
  },
  modalCard: {
    width: "min(480px, 92%)",
    backgroundColor: "var(--card-bg)",
    borderRadius: "1rem",
    padding: "1.25rem",
    boxShadow: "var(--card-shadow)",
    border: "1px solid var(--border-muted)"
  },
  card: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "var(--card-bg)",
    borderRadius: "clamp(1.25rem, 4vw, 2rem)",
    padding: "clamp(1rem, 3.6vw, 1.75rem)",
    boxShadow: "var(--card-shadow)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem"
  },
  brandBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "0.7rem",
    paddingBottom: "0.75rem",
    borderBottom: "1px solid var(--border-muted)"
  },
  brandLogo: {
    fontWeight: 700,
    color: "#d1081f",
    fontSize: "1.25rem",
    letterSpacing: "0.08em"
  },
  brandActions: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    flexWrap: "wrap" as const
  },
  brandMeta: {
    display: "flex",
    alignItems: "center",
    gap: "0.35rem",
    color: "var(--text-secondary)"
  },
  brandApp: {
    fontWeight: 600
  },
  brandDots: {
    fontSize: "1.4rem",
    lineHeight: 1,
    color: "var(--text-secondary)"
  },
  toggleButton: {
    border: "1px solid var(--border)",
    backgroundColor: "var(--surface-card)",
    color: "var(--text-primary)",
    borderRadius: "999px",
    width: 40,
    height: 40,
    cursor: "pointer" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease"
  },
  toggleButtonActive: {
    backgroundColor: "#d1081f",
    color: "#fff",
    borderColor: "#d1081f"
  },
  locationCard: {
    backgroundColor: "var(--surface-card)",
    borderRadius: "1.25rem",
    padding: "clamp(0.9rem, 3vw, 1.2rem)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.35rem"
  },
  locationBadge: {
    margin: 0,
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#d1081f"
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
  readingCard: {
    borderRadius: "1.25rem",
    border: "1px solid var(--border)",
    padding: "clamp(0.9rem, 3vw, 1.2rem)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem",
    backgroundColor: "var(--card-bg)"
  },
  readingBlock: {
    backgroundColor: "var(--surface-contrast)",
    borderRadius: "1rem",
    padding: "1rem",
    display: "flex",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap" as const
  },
  readingLabel: {
    margin: 0,
    color: "var(--text-muted)",
    fontSize: "0.75rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em"
  },
  readingValue: {
    margin: "0.15rem 0 0",
    fontSize: "clamp(1.5rem, 7vw, 2rem)",
    fontWeight: 700,
    color: "var(--text-primary)"
  },
  readingHint: {
    margin: "0.3rem 0 0",
    color: "var(--text-secondary)",
    fontSize: "0.85rem"
  },
  lastSubmission: {
    minWidth: 0,
    flex: "1 1 170px",
    backgroundColor: "var(--surface-highlight)",
    borderRadius: "0.9rem",
    padding: "0.75rem 1rem"
  },
  lastSubmissionValue: {
    margin: "0.15rem 0 0",
    fontSize: "1.45rem",
    fontWeight: 700,
    color: "#d1081f"
  },
  readingSerialLabel: {
    margin: 0,
    fontSize: "0.75rem",
    color: "var(--text-muted)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em"
  },
  readingSerial: {
    margin: 0,
    fontWeight: 600,
    color: "var(--text-primary)"
  },
  readingMetaText: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    lineHeight: 1.4
  },
  mobileLabel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.35rem",
    fontWeight: 600,
    color: "var(--text-primary)",
    fontSize: "0.95rem"
  },
  mobileInput: {
    border: "1px solid var(--border)",
    borderRadius: "0.9rem",
    padding: "0.85rem",
    fontSize: "1.1rem",
    outline: "none",
    backgroundColor: "var(--input-bg)",
    color: "var(--text-primary)",
    width: "100%"
  },
  label: {
    display: "block",
    fontSize: "0.9rem",
    color: "var(--text-secondary)",
    marginBottom: 6
  },
  error: {
    color: "#ef4444",
    margin: 0,
    padding: 0
  },
  success: {
    color: "#22c55e",
    margin: 0,
    fontWeight: 600
  },
  submitButton: {
    border: "none",
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
  mobileHint: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    lineHeight: 1.4
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
    outline: "none",
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
  },
  preview: {
    margin: 0,
    color: "var(--preview-text)",
    fontSize: "0.95rem"
  },
  result: {
    border: "1px solid var(--border)",
    borderRadius: "1.25rem",
    backgroundColor: "var(--result-bg)",
    padding: "clamp(1rem, 3vw, 1.5rem)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem"
  },
  resultHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap" as const
  },
  resultLabel: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em"
  },
  resultValue: {
    margin: 0,
    fontSize: "clamp(1.05rem, 4.8vw, 1.4rem)",
    fontWeight: 700,
    color: "var(--text-primary)"
  },
  resultDivider: {
    flex: "1 1 0",
    height: 1,
    backgroundColor: "var(--border)",
    minWidth: 50
  },
  breakdown: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem"
  },
  breakdownItem: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    padding: "0.35rem 0",
    gap: "0.75rem",
    flexWrap: "wrap" as const
  },
  historyBox: {
    border: "1px solid var(--border)",
    borderRadius: "1.25rem",
    padding: "clamp(1rem, 3vw, 1.5rem)",
    backgroundColor: "var(--card-bg)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1rem"
  },
  reportActions: {
    display: "flex",
    gap: "0.6rem",
    flexWrap: "wrap" as const
  },
  reportAction: {
    textDecoration: "none",
    border: "1px solid var(--border)",
    borderRadius: "0.75rem",
    padding: "0.45rem 0.8rem",
    backgroundColor: "var(--surface-card)",
    color: "var(--text-primary)",
    fontWeight: 600,
    fontSize: "0.85rem"
  },
  chartWrapper: {
    width: "100%",
    minHeight: 220
  },
  historyList: {
    margin: 0,
    padding: 0,
    listStyle: "none",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem"
  },
  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap" as const,
    gap: "0.6rem",
    padding: "0.75rem 1rem",
    border: "1px solid var(--border)",
    borderRadius: "0.9rem"
  },
  historyMeta: {
    margin: 0,
    color: "var(--text-secondary)",
    fontSize: "0.85rem"
  },
  historyValue: {
    fontWeight: 700,
    color: "var(--text-primary)"
  },
  helpBox: {
    border: "1px solid var(--border)",
    borderRadius: "1.25rem",
    padding: "clamp(1rem, 3vw, 1.5rem)",
    backgroundColor: "var(--help-bg)",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.75rem"
  },
  helpText: {
    margin: 0,
    color: "var(--text-secondary)",
    lineHeight: 1.5
  },
  helpList: {
    margin: 0,
    paddingLeft: "1.25rem",
    color: "var(--text-secondary)",
    lineHeight: 1.5
  },
  bottomNav: {
    marginTop: "0.5rem",
    borderTop: "1px solid var(--border-muted)",
    paddingTop: "0.75rem",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
    gap: "0.45rem",
    fontSize: "0.9rem"
  },
  navItem: {
    fontWeight: 500,
    textAlign: "center" as const
  }
} as const;
