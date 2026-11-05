/**
 * Next.js runs this file before serving requests.  Browser code is deliberately
 * excluded: telemetry leaves the application only from the private cluster
 * network to the OpenTelemetry Collector.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
