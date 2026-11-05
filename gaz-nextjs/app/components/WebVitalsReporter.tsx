"use client";

import { useEffect } from "react";

type VitalName = "fcp" | "lcp" | "inp" | "ttfb" | "cls";

const allowedRoutes = new Set(["/", "/consum", "/autocitire", "/facturi", "/cont"]);

const pageRoute = () => allowedRoutes.has(window.location.pathname) ? window.location.pathname : "/";

export function WebVitalsReporter() {
  useEffect(() => {
    // Anonymous performance telemetry for the pre-production environment.
    // It deliberately creates no ID and reads no cookie/localStorage value.
    const sent = new Set<VitalName>();
    const send = (name: VitalName, value: number) => {
      if (sent.has(name) || !Number.isFinite(value) || value < 0) return;
      sent.add(name);
      const body = JSON.stringify({ name, value, route: pageRoute() });
      const blob = new Blob([body], { type: "application/json" });
      if (!navigator.sendBeacon("/api/rum/web-vitals", blob)) {
        void fetch("/api/rum/web-vitals", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined);
      }
    };

    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((entry) => entry.name === "first-contentful-paint");
    if (fcp) send("fcp", fcp.startTime);

    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation) send("ttfb", navigation.responseStart - navigation.startTime);

    let lcp = 0;
    let cls = 0;
    let inp = 0;
    const observers: PerformanceObserver[] = [];
    const observe = (type: string, callback: PerformanceObserverCallback, options: PerformanceObserverInit = { buffered: true }) => {
      try {
        const observer = new PerformanceObserver(callback);
        observer.observe({ type, ...options });
        observers.push(observer);
      } catch {
        // Browser does not support this Web Vital.
      }
    };

    observe("largest-contentful-paint", (list) => {
      const entries = list.getEntries();
      lcp = entries[entries.length - 1]?.startTime ?? lcp;
    });
    observe("layout-shift", (list) => {
      for (const entry of list.getEntries() as PerformanceEntry[] & Array<{ value?: number; hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput) cls += entry.value ?? 0;
      }
    });
    observe("event", (list) => {
      for (const entry of list.getEntries()) inp = Math.max(inp, entry.duration);
    }, { buffered: true, durationThreshold: 40 } as PerformanceObserverInit);

    const reportFinal = () => {
      if (lcp) send("lcp", lcp);
      send("cls", cls);
      if (inp) send("inp", inp);
    };
    window.addEventListener("pagehide", reportFinal, { once: true });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") reportFinal(); }, { once: true });

    return () => observers.forEach((observer) => observer.disconnect());
  }, []);

  return null;
}
