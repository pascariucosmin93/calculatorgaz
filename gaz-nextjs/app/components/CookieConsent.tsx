"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISSED_KEY = "gaz-calculator:cookie-notice-dismissed";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(DISMISSED_KEY) !== "true");
    } catch {
      // localStorage may be blocked by browser privacy settings
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // localStorage may be blocked by browser privacy settings
    }
    setVisible(false);
  };

  return (
    <div style={noticeStyle}>
      <p style={textStyle}>
        Folosim doar cookie-uri strict necesare pentru autentificare și
        sesiune — nu folosim cookie-uri de analiză sau marketing.{" "}
        <Link className="text-link" href="/confidentialitate">
          Detalii în politica de confidențialitate
        </Link>
        .
      </p>
      <button type="button" onClick={dismiss} style={dismissStyle}>
        Am înțeles
      </button>
    </div>
  );
}

const noticeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
  background: "var(--card-bg)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: "12px 16px",
  margin: "0 0 20px"
};

const textStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 200,
  margin: 0,
  fontSize: 13,
  lineHeight: 1.5,
  color: "var(--text-secondary)"
};

const dismissStyle: React.CSSProperties = {
  padding: "8px 20px",
  borderRadius: 6,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  fontWeight: 600,
  fontSize: 14,
  cursor: "pointer",
  flexShrink: 0
};
