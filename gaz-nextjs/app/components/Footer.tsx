import Link from "next/link";

const CONTACT_EMAIL = "pascariucosmin93@gmail.com";

export function Footer() {
  return (
    <footer style={footerStyle}>
      <p style={textStyle}>
        CalculatorGaz este un proiect gratuit, fără scop comercial.
      </p>
      <div style={linksStyle}>
        <Link className="text-link" href="/confidentialitate">
          Politica de confidențialitate
        </Link>
        <a className="text-link" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </div>
    </footer>
  );
}

const footerStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  marginTop: 48,
  paddingTop: 20,
  borderTop: "1px solid var(--border)",
  color: "var(--text-secondary)",
  fontSize: 13
};

const textStyle: React.CSSProperties = {
  margin: 0
};

const linksStyle: React.CSSProperties = {
  display: "flex",
  gap: 16,
  flexWrap: "wrap"
};
