import type { Metadata } from "next";
import "./globals.css";
import { WebVitalsReporter } from "./components/WebVitalsReporter";

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
    <html lang="ro" data-theme="dark">
      <body><WebVitalsReporter />{children}</body>
    </html>
  );
}
