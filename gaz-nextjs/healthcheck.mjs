const url = process.env.HEALTHCHECK_URL || "http://localhost:3000/api/health";
const timeoutMs = Number(process.env.HEALTHCHECK_TIMEOUT_MS || 3000);

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

async function main() {
  try {
    const response = await fetch(url, { signal: controller.signal });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Health endpoint responded with ${response.status}`);
      process.exit(1);
    }

    const data = await response.json();
    if (data.status !== "ok") {
      console.error(`Unexpected health payload: ${JSON.stringify(data)}`);
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    if (error.name === "AbortError") {
      console.error(`Healthcheck timed out after ${timeoutMs}ms`);
    } else {
      console.error("Healthcheck failed", error);
    }
    process.exit(1);
  }
}

main();
