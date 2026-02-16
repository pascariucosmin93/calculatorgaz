"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AuthStatusCard } from "./components/AuthStatusCard";
import { ReadingSection } from "./components/ReadingSection";
import { SettingsForm } from "./components/SettingsForm";
import { ResultSection } from "./components/ResultSection";
import { HistorySection, ChartTheme } from "./components/HistorySection";
import { HelpSection } from "./components/HelpSection";
import { BottomNav } from "./components/BottomNav";
import { styles } from "./styles";
import { AuthMode, AuthUser, HistoryEntry, HistoryStatus, Result, ThemeMode } from "@/lib/types";

const DEFAULT_PCS = 10.548;
const DEFAULT_GAS_PRICE_MWH = 171.44;
const DEFAULT_TRANSPORT_PRICE_MWH = 13.8;
const DEFAULT_DISTRIBUTION_PRICE_MWH = 70.96;
const DEFAULT_CAP26_PRICE_MWH = -20.54;
const DEFAULT_CAP6_PRICE_MWH = -0.063;
const DEFAULT_FIXED_FEE = 0;
const DEFAULT_VAT_RATE = 0.21;
const STORAGE_KEY = "gaz-calculator:last-reading:v2";
const AUTH_STORAGE_KEY = "gaz-calculator:auth-user";
const THEME_STORAGE_KEY = "gaz-calculator:theme";

const SUPPLY_POINT = {
  label: "GAZE NATURALE",
  address:
    "Strada Bazei, Nr. 2.1A, Bloc/Scară T.64, corp C2, Ap. 20, Localitate Valea Adanca(IS), Județ Iași",
  owner: "PASCARIU COSMIN ALEXANDRU"
};
const METER_SERIAL = "00838754/2013";
const NAV_ITEMS = ["Acasă", "Autocitire", "Facturi", "Consum", "Myline"];

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
  const [currentReading, setCurrentReading] = useState("");
  const [previousReading, setPreviousReading] = useState("");
  const [pcs, setPcs] = useState(DEFAULT_PCS.toString());
  const [gasPriceMwh, setGasPriceMwh] = useState(DEFAULT_GAS_PRICE_MWH.toString());
  const [transportPriceMwh, setTransportPriceMwh] = useState(
    DEFAULT_TRANSPORT_PRICE_MWH.toString()
  );
  const [distributionPriceMwh, setDistributionPriceMwh] = useState(
    DEFAULT_DISTRIBUTION_PRICE_MWH.toString()
  );
  const [cap26PriceMwh, setCap26PriceMwh] = useState(DEFAULT_CAP26_PRICE_MWH.toString());
  const [cap6PriceMwh, setCap6PriceMwh] = useState(DEFAULT_CAP6_PRICE_MWH.toString());
  const [vatRate, setVatRate] = useState((DEFAULT_VAT_RATE * 100).toString());
  const [fixedFee, setFixedFee] = useState(DEFAULT_FIXED_FEE.toString());
  const [includeVat, setIncludeVat] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("idle");
  const latestEntry = useMemo(() => {
    if (history.length === 0) {
      return null;
    }
    return [...history].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [history]);

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

  const fetchHistory = useCallback(async () => {
    setHistoryStatus("loading");
    try {
      const res = await fetch("/api/readings");
      if (!res.ok) {
        throw new Error("Nu am putut încărca istoricul.");
      }
      const data = (await res.json()) as HistoryEntry[];
      setHistory(data);
      setHistoryStatus("idle");
    } catch (err) {
      console.error(err);
      setHistoryStatus("error");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        return;
      }
      const parsed = JSON.parse(saved) as {
        previousReading?: string;
        pcs?: string;
        gasPriceMwh?: string;
        transportPriceMwh?: string;
        distributionPriceMwh?: string;
        cap26PriceMwh?: string;
        cap6PriceMwh?: string;
        vatRate?: string;
        fee?: string;
      };
      setPreviousReading(parsed.previousReading ?? "");
      setPcs(parsed.pcs ?? DEFAULT_PCS.toString());
      setGasPriceMwh(parsed.gasPriceMwh ?? DEFAULT_GAS_PRICE_MWH.toString());
      setTransportPriceMwh(parsed.transportPriceMwh ?? DEFAULT_TRANSPORT_PRICE_MWH.toString());
      setDistributionPriceMwh(
        parsed.distributionPriceMwh ?? DEFAULT_DISTRIBUTION_PRICE_MWH.toString()
      );
      setCap26PriceMwh(parsed.cap26PriceMwh ?? DEFAULT_CAP26_PRICE_MWH.toString());
      setCap6PriceMwh(parsed.cap6PriceMwh ?? DEFAULT_CAP6_PRICE_MWH.toString());
      setVatRate(parsed.vatRate ?? (DEFAULT_VAT_RATE * 100).toString());
      setFixedFee(parsed.fee ?? DEFAULT_FIXED_FEE.toString());
    } catch {
      // Ignorăm datele salvate corupte.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const savedUser = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!savedUser) {
        return;
      }
      const parsed = JSON.parse(savedUser) as AuthUser;
      if (parsed?.username) {
        setUser(parsed);
      }
    } catch {
      // Ignorăm datele corupte.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (user) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory().catch(() => setHistoryStatus("error"));
  }, [fetchHistory]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      return;
    }

    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleThemeToggle = useCallback(() => {
    setTheme((current) => (current === "light" ? "dark" : "light"));
  }, []);

  const handleAuthSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!authUsername.trim() || !authPassword) {
        setAuthError("Completează utilizatorul și parola.");
        return;
      }
      if (authMode === "signup" && !authEmail.trim()) {
        setAuthError("Introdu și emailul pentru crearea contului.");
        return;
      }

      setAuthLoading(true);
      setAuthError("");
      const endpoint = authMode === "signup" ? "signup" : "login";

      try {
        const response = await fetch(`/api/auth/${endpoint}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: authUsername,
            password: authPassword,
            ...(authMode === "signup" ? { email: authEmail } : {}),
            ...(authMode === "login" ? { identifier: authUsername } : {})
          })
        });

        let data: any = null;
        try {
          const text = await response.text();
          if (text) {
            data = JSON.parse(text);
          }
        } catch {
          // Ignorăm erorile de parsare și tratăm lipsa datelor mai jos.
        }

        if (!response.ok) {
          const errMsg = (data && data.error) || `Eroare de autentificare (cod ${response.status}).`;
          throw new Error(errMsg);
        }

        if (!data) {
          throw new Error("Răspuns invalid de la server (lipsă JSON). Încearcă din nou.");
        }

        const authenticatedUser: AuthUser = {
          id: data.id,
          username: data.username,
          email: data.email ?? null,
          createdAt: data.createdAt
        };

        setUser(authenticatedUser);
        setAuthUsername("");
        setAuthEmail("");
        setAuthPassword("");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Eroare la autentificare.";
        setAuthError(message);
      } finally {
        setAuthLoading(false);
      }
    },
    [authMode, authEmail, authPassword, authUsername]
  );

  const handleLogout = useCallback(() => {
    setUser(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!user) {
        setError("Trebuie să fii autentificat pentru a salva indexul.");
        return;
      }

      const current = parseFloat(currentReading);
      const previous = parseFloat(previousReading);
      const pcsValue = parseFloat(pcs);
      const gasPrice = parseFloat(gasPriceMwh);
      const transportPrice = parseFloat(transportPriceMwh);
      const distributionPrice = parseFloat(distributionPriceMwh);
      const cap26Price = parseFloat(cap26PriceMwh);
      const cap6Price = parseFloat(cap6PriceMwh);
      const vat = parseFloat(vatRate) / 100;
      const fee = parseFloat(fixedFee || "0");

      if (
        [
          current,
          previous,
          pcsValue,
          gasPrice,
          transportPrice,
          distributionPrice,
          cap26Price,
          cap6Price,
          vat,
          fee
        ].some((value) => Number.isNaN(value))
      ) {
        setError("Introdu doar valori numerice.");
        setResult(null);
        return;
      }

      if (current <= previous) {
        setError("Citirea actuală trebuie să fie mai mare decât cea anterioară.");
        setResult(null);
        return;
      }

      if (pcsValue <= 0) {
        setError("Pcs (kWh/mc) trebuie să fie pozitiv.");
        setResult(null);
        return;
      }

      if ([gasPrice, transportPrice, distributionPrice].some((value) => value < 0)) {
        setError("Tarifele unitare nu pot fi negative (compensațiile pot fi negative).");
        setResult(null);
        return;
      }

      if (vat < 0 || vat > 1) {
        setError("TVA-ul trebuie să fie între 0 și 100%.");
        setResult(null);
        return;
      }

      if (fee < 0) {
        setError("Abonamentul nu poate fi negativ.");
        setResult(null);
        return;
      }

      setError("");
      setIsSaving(true);
      try {
        const response = await fetch("/api/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            previousReading: previous,
            currentReading: current,
            pcs: pcsValue,
            gasPriceMwh: gasPrice,
            transportPriceMwh: transportPrice,
            distributionPriceMwh: distributionPrice,
            cap26PriceMwh: cap26Price,
            cap6PriceMwh: cap6Price,
            vatRate: vat,
            fixedFee: fee,
            includeVat
          })
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Nu am putut salva calculul.");
        }

        const computedConsumptionMwh =
          typeof data.consumptionMwh === "number"
            ? data.consumptionMwh
            : data.consumptionKwh / 1000;
        const breakdown = data.breakdown ?? {
          gas: { unitPriceMwh: gasPrice, value: computedConsumptionMwh * gasPrice },
          transport: {
            unitPriceMwh: transportPrice,
            value: computedConsumptionMwh * transportPrice
          },
          distribution: {
            unitPriceMwh: distributionPrice,
            value: computedConsumptionMwh * distributionPrice
          },
          cap26: { unitPriceMwh: cap26Price, value: computedConsumptionMwh * cap26Price },
          cap6: { unitPriceMwh: cap6Price, value: computedConsumptionMwh * cap6Price }
        };
        const baseCost =
          data.baseCost ??
          breakdown.gas.value + breakdown.transport.value + breakdown.distribution.value;
        const adjustmentCost = data.adjustmentCost ?? breakdown.cap26.value + breakdown.cap6.value;
        const variableCost = data.variableCost ?? baseCost + adjustmentCost;
        const pricePerKwh = data.pricePerKwh ?? variableCost / data.consumptionKwh;
        const pricePerKwhWithVat =
          data.pricePerKwhWithVat ?? (includeVat ? pricePerKwh * (1 + vat) : pricePerKwh);
        const pricePerM3 = data.pricePerM3 ?? variableCost / data.consumptionM3;
        const pricePerM3WithVat =
          data.pricePerM3WithVat ?? (includeVat ? pricePerM3 * (1 + vat) : pricePerM3);
        const vatRateValue = data.vatRate ?? vat;

        const newResult: Result = {
          consumptionM3: data.consumptionM3,
          consumptionKwh: data.consumptionKwh,
          consumptionMwh: computedConsumptionMwh,
          pcs: data.pcs ?? pcsValue,
          pricePerKwh,
          pricePerKwhWithVat,
          pricePerM3,
          pricePerM3WithVat,
          baseCost,
          adjustmentCost,
          variableCost,
          fixedFee: data.fixedFee,
          subtotal: data.subtotal,
          vatRate: vatRateValue,
          vat: data.vat,
          total: data.total,
          breakdown
        };

        setResult(newResult);
        fetchHistory().catch(() => setHistoryStatus("error"));

        if (typeof window !== "undefined") {
          const payload = {
            previousReading: current.toString(),
            pcs,
            gasPriceMwh,
            transportPriceMwh,
            distributionPriceMwh,
            cap26PriceMwh,
            cap6PriceMwh,
            vatRate,
            fee: fixedFee
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Eroare la salvarea calculului.";
        setError(message);
      } finally {
        setIsSaving(false);
      }
    },
    [
      cap26PriceMwh,
      cap6PriceMwh,
      currentReading,
      fetchHistory,
      fixedFee,
      gasPriceMwh,
      includeVat,
      previousReading,
      transportPriceMwh,
      distributionPriceMwh,
      pcs,
      vatRate,
      user
    ]
  );

  const handleCurrentReadingChange = useCallback((value: string) => {
    setCurrentReading(value);
  }, []);
  const handlePreviousReadingChange = useCallback((value: string) => {
    setPreviousReading(value);
  }, []);
  const handlePcsChange = useCallback((value: string) => {
    setPcs(value);
  }, []);
  const handleGasPriceChange = useCallback((value: string) => {
    setGasPriceMwh(value);
  }, []);
  const handleTransportPriceChange = useCallback((value: string) => {
    setTransportPriceMwh(value);
  }, []);
  const handleDistributionPriceChange = useCallback((value: string) => {
    setDistributionPriceMwh(value);
  }, []);
  const handleCap26PriceChange = useCallback((value: string) => {
    setCap26PriceMwh(value);
  }, []);
  const handleCap6PriceChange = useCallback((value: string) => {
    setCap6PriceMwh(value);
  }, []);
  const handleVatRateChange = useCallback((value: string) => {
    setVatRate(value);
  }, []);
  const handleFixedFeeChange = useCallback((value: string) => {
    setFixedFee(value);
  }, []);
  const handleIncludeVatChange = useCallback((value: boolean) => {
    setIncludeVat(value);
  }, []);
  const handleAuthModeChange = useCallback((mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError("");
    setResetError("");
    setResetMessage("");
    setResetLink("");
  }, []);
  const handleAuthUsernameChange = useCallback((value: string) => {
    setAuthUsername(value);
  }, []);
  const handleAuthEmailChange = useCallback((value: string) => {
    setAuthEmail(value);
  }, []);
  const handleAuthPasswordChange = useCallback((value: string) => {
    setAuthPassword(value);
  }, []);
  const handleResetEmailChange = useCallback((value: string) => {
    setResetEmail(value);
    setResetError("");
    setResetMessage("");
  }, []);
  const handleResetPasswordSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const email = resetEmail.trim();
      if (!email) {
        setResetError("Introdu adresa de email.");
        setResetMessage("");
        return;
      }

      setResetLoading(true);
      setResetError("");
      setResetMessage("");
      setResetLink("");

      try {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });

        let data: { message?: string; error?: string; resetUrl?: string; resetPage?: string } | null = null;
        try {
          data = (await response.json()) as { message?: string; error?: string; resetUrl?: string; resetPage?: string };
        } catch {
          data = null;
        }

        if (!response.ok) {
          const errorMessage = data?.error ?? "Nu am putut trimite link-ul de resetare.";
          setResetError(errorMessage);
          return;
        }

        const successMessage =
          data?.message ?? "Ți-am trimis instrucțiunile pentru resetarea parolei.";
        setResetMessage(successMessage);
        setResetLink(data?.resetUrl ?? data?.resetPage ?? "");
        setResetEmail("");
      } catch {
        setResetError("Eroare la trimiterea cererii de resetare.");
      } finally {
        setResetLoading(false);
      }
    },
    [resetEmail]
  );

  const consumptionPreview = useMemo(() => {
    const current = parseFloat(currentReading);
    const previous = parseFloat(previousReading);
    const pcsValue = parseFloat(pcs);
    if (
      Number.isNaN(current) ||
      Number.isNaN(previous) ||
      Number.isNaN(pcsValue) ||
      current <= previous ||
      pcsValue <= 0
    ) {
      return null;
    }
    const consumptionM3 = current - previous;
    const consumptionKwh = consumptionM3 * pcsValue;
    const consumptionMwh = consumptionKwh / 1000;
    return {
      m3: consumptionM3.toFixed(2),
      kwh: consumptionKwh.toFixed(0),
      mwh: consumptionMwh.toFixed(3)
    };
  }, [currentReading, pcs, previousReading]);

  const chartTheme = CHART_THEME[theme];

  return (
    <main style={styles.page}>
      <div style={styles.stack}>
        <AuthStatusCard
          user={user}
          authMode={authMode}
          authUsername={authUsername}
          authEmail={authEmail}
          authPassword={authPassword}
          authLoading={authLoading}
          authError={authError}
          resetEmail={resetEmail}
          resetLoading={resetLoading}
          resetError={resetError}
          resetMessage={resetMessage}
          resetLink={resetLink}
          onAuthModeChange={handleAuthModeChange}
          onUsernameChange={handleAuthUsernameChange}
          onEmailChange={handleAuthEmailChange}
          onPasswordChange={handleAuthPasswordChange}
          onAuthSubmit={handleAuthSubmit}
          onResetEmailChange={handleResetEmailChange}
          onResetPasswordSubmit={handleResetPasswordSubmit}
          onLogout={handleLogout}
        />
        {user ? (
          <>
            <form style={styles.card} onSubmit={handleSubmit}>
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
                supplyPoint={SUPPLY_POINT}
                meterSerial={METER_SERIAL}
                lastBilledValue={lastBilledValue}
                lastReportedValue={lastReportedValue}
                lastReportedAtText={lastReportedAtText}
                currentReading={currentReading}
                isSaving={isSaving}
                user={user}
                onReadingChange={handleCurrentReadingChange}
              />
              <SettingsForm
                previousReading={previousReading}
                pcs={pcs}
                gasPriceMwh={gasPriceMwh}
                transportPriceMwh={transportPriceMwh}
                distributionPriceMwh={distributionPriceMwh}
                cap26PriceMwh={cap26PriceMwh}
                cap6PriceMwh={cap6PriceMwh}
                vatRate={vatRate}
                fixedFee={fixedFee}
                includeVat={includeVat}
                onPreviousReadingChange={handlePreviousReadingChange}
                onPcsChange={handlePcsChange}
                onGasPriceChange={handleGasPriceChange}
                onTransportPriceChange={handleTransportPriceChange}
                onDistributionPriceChange={handleDistributionPriceChange}
                onCap26PriceChange={handleCap26PriceChange}
                onCap6PriceChange={handleCap6PriceChange}
                onVatRateChange={handleVatRateChange}
                onFixedFeeChange={handleFixedFeeChange}
                onIncludeVatChange={handleIncludeVatChange}
              />
              <ResultSection
                error={error}
                preview={consumptionPreview}
                result={result}
                includeVat={includeVat}
              />
            </form>
            <HistorySection history={history} status={historyStatus} chartTheme={chartTheme} />
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
