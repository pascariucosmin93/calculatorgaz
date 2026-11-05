import { metrics } from "@opentelemetry/api";

export type WebVitalName = "fcp" | "lcp" | "inp" | "ttfb" | "cls";

const meter = metrics.getMeter("calculatorgaz.rum");
const duration = meter.createHistogram("calculatorgaz.rum.web_vital.duration", {
  description: "Anonymous browser Web Vitals duration.",
  unit: "ms"
});
const cls = meter.createHistogram("calculatorgaz.rum.web_vital.cls", {
  description: "Anonymous browser cumulative layout shift.",
  unit: "1"
});

export function recordWebVital(name: WebVitalName, value: number, pageRoute: string) {
  const attributes = { "web.vital.name": name, "page.route": pageRoute };
  if (name === "cls") cls.record(value, attributes);
  else duration.record(value, attributes);
}
