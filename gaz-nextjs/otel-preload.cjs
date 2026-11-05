// Loaded through NODE_OPTIONS before Next.js loads its HTTP server. Automatic
// instrumentation must patch Node core modules before those modules are first
// required; Next's instrumentation hook runs too late for that in standalone
// production builds.
const { getNodeAutoInstrumentations } = require("@opentelemetry/auto-instrumentations-node");
const { OTLPTraceExporter } = require("@opentelemetry/exporter-trace-otlp-proto");
const { OTLPMetricExporter } = require("@opentelemetry/exporter-metrics-otlp-proto");
const { resourceFromAttributes } = require("@opentelemetry/resources");
const { PeriodicExportingMetricReader } = require("@opentelemetry/sdk-metrics");
const { NodeSDK } = require("@opentelemetry/sdk-node");

const collectorEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
  || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (collectorEndpoint && process.env.OTEL_SDK_DISABLED !== "true" && !global.calculatorGazTelemetrySdk) {
  const baseEndpoint = collectorEndpoint.replace(/\/+$/, "");
  const tracesEndpoint = baseEndpoint.endsWith("/v1/traces")
    ? baseEndpoint
    : `${baseEndpoint}/v1/traces`;
  const metricsEndpoint = (process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || baseEndpoint).replace(/\/+$/, "").endsWith("/v1/metrics")
    ? (process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || baseEndpoint).replace(/\/+$/, "")
    : `${baseEndpoint}/v1/metrics`;

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": process.env.OTEL_SERVICE_NAME || "calculatorgaz",
      "service.namespace": "gaz",
      "deployment.environment.name": process.env.DEPLOYMENT_ENVIRONMENT || "production"
    }),
    traceExporter: new OTLPTraceExporter({ url: tracesEndpoint }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: metricsEndpoint }),
      exportIntervalMillis: 30_000
    }),
    instrumentations: [getNodeAutoInstrumentations({
      "@opentelemetry/instrumentation-dns": { enabled: false },
      "@opentelemetry/instrumentation-fs": { enabled: false }
    })]
  });

  sdk.start();
  global.calculatorGazTelemetrySdk = sdk;

  const shutdown = () => void sdk.shutdown().catch(() => undefined);
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
