"use client";

import { useCallback, useEffect, useState } from "react";

const CONSENT_KEY = "gaz-calculator:cookie-consent";

export type ConsentStatus = "pending" | "accepted" | "refused";

export function getCookieConsent(): ConsentStatus {
  if (typeof window === "undefined") return "pending";
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    if (value === "accepted" || value === "refused") return value;
  } catch {
    // localStorage may be blocked by browser privacy settings
  }
  return "pending";
}

export function CookieConsent({
  onConsentChange
}: {
  onConsentChange?: (status: ConsentStatus) => void;
}) {
  const [status, setStatus] = useState<ConsentStatus>("pending");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const saved = getCookieConsent();
    setStatus(saved);
    setVisible(saved === "pending");
  }, []);

  const handleAccept = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {
      // localStorage may be blocked by browser privacy settings
    }
    setStatus("accepted");
    setVisible(false);
    onConsentChange?.("accepted");
  }, [onConsentChange]);

  const handleRefuse = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, "refused");
    } catch {
      // localStorage may be blocked by browser privacy settings
    }
    setStatus("refused");
    setVisible(false);
    onConsentChange?.("refused");
  }, [onConsentChange]);

  if (!visible) return null;

  return (
    <div style={bannerStyle}>
      <div style={contentStyle}>
        <p style={textStyle}>
          Acest site foloseste cookie-uri pentru autentificare si pastrarea sesiunii tale.
          Fara cookie-uri, va trebui sa te autentifici din nou la fiecare vizita.
        </p>
        <div style={buttonsStyle}>
          <button type="button" onClick={handleAccept} style={acceptStyle}>
            Accept
          </button>
          <button type="button" onClick={handleRefuse} style={refuseStyle}>
            Refuz
          </button>
        </div>
      </div>
    </div>
  );
}

const bannerStyle: React.CSSProperties = {
  position: "fixed",
  bottom: 0,
  left: 0,
  right: 0,
  zIndex: 9999,
  background: "var(--card-bg)",
  borderTop: "1px solid var(--border)",
  boxShadow: "0 -2px 12px rgba(0,0,0,0.12)",
  padding: "16px 20px"
};

const contentStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap"
};

const textStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 200,
  margin: 0,
  fontSize: 14,
  lineHeight: 1.5,
  color: "var(--text-primary)"
};

const buttonsStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  flexShrink: 0
};

const acceptStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 6,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer"
};

const refuseStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 6,
  border: "1px solid var(--border)",
  background: "transparent",
  color: "var(--text-secondary)",
  fontWeight: 500,
  fontSize: 14,
  cursor: "pointer"
};
