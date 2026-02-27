const rawElasticUrl = process.env.ELASTICSEARCH_URL?.trim();
const elasticBaseUrl = rawElasticUrl
  ? rawElasticUrl.replace(/\/+$/, "")
  : null;

const ELASTIC_TIMEOUT_MS = 5000;
const READINGS_INDEX = "readings";

const withTimeout = async (input: RequestInfo | URL, init?: RequestInit) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ELASTIC_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const isElasticConfigured = () => Boolean(elasticBaseUrl);

export const indexReadingDocument = async (id: string, document: Record<string, unknown>) => {
  if (!elasticBaseUrl) {
    return;
  }

  const response = await withTimeout(
    `${elasticBaseUrl}/${READINGS_INDEX}/_doc/${encodeURIComponent(id)}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(document)
    }
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Elasticsearch index failed (${response.status}): ${message}`);
  }
};

export const searchReadings = async (payload: Record<string, unknown>) => {
  if (!elasticBaseUrl) {
    throw new Error("ELASTICSEARCH_URL is not configured");
  }

  const response = await withTimeout(`${elasticBaseUrl}/${READINGS_INDEX}/_search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Elasticsearch search failed (${response.status}): ${message}`);
  }

  return response.json();
};
