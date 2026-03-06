"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthStatusCard } from "./components/AuthStatusCard";
import { AdminUsersPanel } from "./components/AdminUsersPanel";
import { ProfileForm } from "./components/ProfileForm";
import { ReadingSection } from "./components/ReadingSection";
import { SettingsForm } from "./components/SettingsForm";
import { ResultSection } from "./components/ResultSection";
import dynamic from "next/dynamic";
import type { ChartTheme } from "./components/HistorySection";
const HistorySection = dynamic(
  () => import("./components/HistorySection").then((mod) => mod.HistorySection),
  { ssr: false }
);
import { HelpSection } from "./components/HelpSection";
import { BottomNav } from "./components/BottomNav";
import { CookieConsent } from "./components/CookieConsent";
import { styles } from "./styles";
import { HistoryEntry, HistoryStatus, ThemeMode } from "@/lib/types";

import { useAuth, csrfHeaders } from "./hooks/useAuth";
import { useAdmin } from "./hooks/useAdmin";
import { useProfile } from "./hooks/useProfile";
import { useSettings } from "./hooks/useSettings";
import { useCalculator } from "./hooks/useCalculator";

const THEME_STORAGE_KEY = "gaz-calculator:theme";
const METER_SERIAL = "00838754/2013";
const NAV_ITEMS = ["Acasă", "Autocitire", "Facturi", "Consum", "Myline"];
const DEFAULT_ADDRESS = "Adresa locului de consum nu este configurată pentru acest cont.";
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "";

const CHART_THEME: Record<ThemeMode, ChartTheme> = {
  light: {
    line: "#2563eb",
    fill: "rgba(37,99,235,0.2)",
    axis: "#475569",
    grid: "rgba(148,163,184,0.35)"
  },
  dark: {
    line: "#60a5fa",
    fill: "rgba(96,165,250,0.18)",
    axis: "#cbd5f5",
    grid: "rgba(51,65,85,0.9)"
  }
};

export default function Home() {
  // ── Auth ──
  const auth = useAuth();
  const { user, setUser } = auth;

  // ── Theme ──
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleThemeToggle = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  // ── History ──
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("idle");
  const [currentReading, setCurrentReading] = useState("");

  const fetchHistory = useCallback(async () => {
    if (!user?.id) {
      setHistory([]);
      setHistoryStatus("idle");
      return;
    }
    setHistoryStatus("loading");
    try {
      const res = await fetch("/api/readings");
      if (!res.ok) throw new Error("Nu am putut încărca istoricul.");
      const data = (await res.json()) as HistoryEntry[];
      setHistory(data);
      setHistoryStatus("idle");
    } catch (err) {
      console.error(err);
      setHistoryStatus("error");
    }
  }, [user?.id]);

  useEffect(() => {
    fetchHistory().catch(() => setHistoryStatus("error"));
  }, [fetchHistory]);

  const latestEntry = useMemo(() => {
    if (history.length === 0) return null;
    return [...history].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [history]);

  // ── Settings & Tariffs ──
  const settings = useSettings(user);
  const { previousReading } = settings;

  const parsedPrevious = Number.parseFloat(previousReading);
  const lastBilledValue =
    Number.isNaN(parsedPrevious) || !Number.isFinite(parsedPrevious)
      ? latestEntry?.previousReading ?? null
      : parsedPrevious;
  const lastReportedValue = latestEntry ? latestEntry.currentReading : lastBilledValue;
  const lastReportedAt = latestEntry ? new Date(latestEntry.createdAt) : null;
  const lastReportedAtText = lastReportedAt
    ? lastReportedAt.toLocaleString("ro-RO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : null;

  // ── Calculator ──
  const calculator = useCalculator(
    user,
    { ...settings, currentReading, saveToLocalStorage: settings.saveToLocalStorage },
    fetchHistory
  );

  // ── Profile ──
  const profile = useProfile(user, setUser);

  // ── Admin ──
  const admin = useAdmin(user);

  // ── Derived ──
  const chartTheme = CHART_THEME[theme];
  const supplyPoint = useMemo(
    () => ({
      label: "GAZE NATURALE",
      address: user?.address?.trim() || DEFAULT_ADDRESS,
      owner: user?.ownerName?.trim() || user?.username?.toUpperCase() || "Titular necunoscut"
    }),
    [user]
  );

  const handleCurrentReadingChange = useCallback((value: string) => {
    setCurrentReading(value);
  }, []);

  return (
    <main style={styles.page}>
      <CookieConsent />
      <div style={styles.stack}>
        <AuthStatusCard
          user={user}
          authMode={auth.authMode}
          authUsername={auth.authUsername}
          authEmail={auth.authEmail}
          authPassword={auth.authPassword}
          authLoading={auth.authLoading}
          authError={auth.authError}
          resetEmail={auth.resetEmail}
          resetLoading={auth.resetLoading}
          resetError={auth.resetError}
          resetMessage={auth.resetMessage}
          resetLink={auth.resetLink}
          onAuthModeChange={auth.handleAuthModeChange}
          onUsernameChange={auth.onUsernameChange}
          onEmailChange={auth.onEmailChange}
          onPasswordChange={auth.onPasswordChange}
          onAuthSubmit={auth.handleAuthSubmit}
          onResetEmailChange={auth.handleResetEmailChange}
          onResetPasswordSubmit={auth.handleResetPasswordSubmit}
          onLogout={auth.handleLogout}
        />
        {user?.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() && (
          <AdminUsersPanel
            adminEmail={ADMIN_EMAIL}
            adminPassword={admin.adminAuthPassword}
            isAuthenticated={admin.adminSessionActive}
            users={admin.adminUsers}
            loading={admin.adminLoading}
            error={admin.adminError}
            success={admin.adminSuccess}
            onAdminPasswordChange={admin.onAdminPasswordChange}
            onLoadUsers={admin.handleAdminLoad}
            onDeleteUser={admin.handleAdminDelete}
          />
        )}
        {user && (
          <ProfileForm
            ownerName={profile.profileOwnerName}
            address={profile.profileAddress}
            isSaving={profile.profileSaving}
            error={profile.profileError}
            success={profile.profileSuccess}
            onOwnerNameChange={profile.onOwnerNameChange}
            onAddressChange={profile.onAddressChange}
            onSubmit={profile.handleProfileSubmit}
          />
        )}
        {user && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? null : user ? (
          <>
            <form style={styles.card} onSubmit={calculator.handleSubmit}>
              <div style={styles.brandBar}>
                <span style={styles.brandLogo}>e·on</span>
                <div style={styles.brandActions}>
                  <div style={styles.brandMeta}>
                    <span style={styles.brandApp}>Myline</span>
                    <span aria-hidden="true" style={styles.brandDots}>
                      ⋯
                    </span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Comută în modul ${theme === "light" ? "întunecat" : "luminos"}`}
                    style={{
                      ...styles.toggleButton,
                      ...(theme === "dark" ? styles.toggleButtonActive : {})
                    }}
                    onClick={handleThemeToggle}
                  >
                    {theme === "light" ? "🌙" : "☀️"}
                  </button>
                </div>
              </div>
              <ReadingSection
                supplyPoint={supplyPoint}
                meterSerial={METER_SERIAL}
                lastBilledValue={lastBilledValue}
                lastReportedValue={lastReportedValue}
                lastReportedAtText={lastReportedAtText}
                currentReading={currentReading}
                isSaving={calculator.isSaving}
                user={user}
                onReadingChange={handleCurrentReadingChange}
                onPreviousReadingChange={settings.onPreviousReadingChange}
                csrfHeaders={csrfHeaders}
              />
              <SettingsForm
                previousReading={settings.previousReading}
                pcs={settings.pcs}
                gasPriceMwh={settings.gasPriceMwh}
                transportPriceMwh={settings.transportPriceMwh}
                distributionPriceMwh={settings.distributionPriceMwh}
                cap26PriceMwh={settings.cap26PriceMwh}
                cap6PriceMwh={settings.cap6PriceMwh}
                vatRate={settings.vatRate}
                fixedFee={settings.fixedFee}
                includeVat={settings.includeVat}
                invoiceLoading={settings.invoiceLoading}
                invoiceMessage={settings.invoiceMessage}
                invoiceError={settings.invoiceError}
                onPreviousReadingChange={settings.onPreviousReadingChange}
                onPcsChange={settings.onPcsChange}
                onGasPriceChange={settings.onGasPriceChange}
                onTransportPriceChange={settings.onTransportPriceChange}
                onDistributionPriceChange={settings.onDistributionPriceChange}
                onCap26PriceChange={settings.onCap26PriceChange}
                onCap6PriceChange={settings.onCap6PriceChange}
                onVatRateChange={settings.onVatRateChange}
                onFixedFeeChange={settings.onFixedFeeChange}
                onIncludeVatChange={settings.onIncludeVatChange}
                onInvoiceUpload={settings.handleInvoiceUpload}
              />
              <ResultSection
                error={calculator.error}
                preview={calculator.consumptionPreview}
                result={calculator.result}
                includeVat={settings.includeVat}
              />
            </form>
            <HistorySection
              history={history}
              status={historyStatus}
              chartTheme={chartTheme}
              userId={user?.id ?? null}
            />
            <HelpSection />
            <BottomNav items={NAV_ITEMS} activeItem="Autocitire" />
          </>
        ) : (
          <section style={styles.card}>
            <p style={styles.authNotice}>
              Autentifică-te pentru a accesa citirile, calculele și istoricul tău.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
