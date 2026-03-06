"use client";

export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--page-bg)",
        color: "var(--text-primary)"
      }}
    >
      <div
        style={{
          maxWidth: 420,
          textAlign: "center",
          background: "var(--card-bg)",
          borderRadius: "1rem",
          padding: "2rem",
          boxShadow: "var(--card-shadow)"
        }}
      >
        <h2 style={{ margin: "0 0 0.75rem", fontSize: "1.25rem" }}>
          Ceva nu a mers bine
        </h2>
        <p style={{ color: "var(--text-secondary)", margin: "0 0 1.5rem", fontSize: "0.95rem" }}>
          A apărut o eroare neașteptată. Încearcă din nou sau reîncarcă pagina.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#d1081f",
            color: "#fff",
            border: "none",
            borderRadius: "0.75rem",
            padding: "0.7rem 1.5rem",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: "pointer"
          }}
        >
          Încearcă din nou
        </button>
      </div>
    </div>
  );
}
