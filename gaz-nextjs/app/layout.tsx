import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Calculator cost gaz",
  description: "Aplicatie Next.js pentru calcularea costului la gaz in functie de consum."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
