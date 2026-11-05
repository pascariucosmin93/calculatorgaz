import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { NodeSDK } from "@opentelemetry/sdk-node";

declare global {
  // The instrumentation module can be evaluated more than once during local
  // development. Keep one SDK per Node process.
  // eslint-disable-next-line no-var
  var calculatorGazTelemetrySdk: NodeSDK | undefined;
}

const collectorEndpoint = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT
  || process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

if (collectorEndpoint && process.env.OTEL_SDK_DISABLED !== "true" && !global.calculatorGazTelemetrySdk) {
  const tracesEndpoint = collectorEndpoint.replace(/\/+$/, "").endsWith("/v1/traces")
    ? collectorEndpoint.replace(/\/+$/, "")
    : `${collectorEndpoint.replace(/\/+$/, "")}/v1/traces`;

  const sdk = new NodeSDK({
    resource: resourceFromAttributes({
      "service.name": process.env.OTEL_SERVICE_NAME || "calculatorgaz",
      "service.namespace": "gaz",
      "deployment.environment.name": process.env.DEPLOYMENT_ENVIRONMENT || "production"
    }),
    traceExporter: new OTLPTraceExporter({ url: tracesEndpoint }),
    instrumentations: [
      getNodeAutoInstrumentations({
        // These are noisy for a Next.js process and do not describe user-facing
        // work. HTTP/fetch spans remain enabled.
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-fs": { enabled: false }
      })
    ]
  });

  sdk.start();
  global.calculatorGazTelemetrySdk = sdk;

  const shutdown = () => void sdk.shutdown().catch(() => undefined);
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
}
