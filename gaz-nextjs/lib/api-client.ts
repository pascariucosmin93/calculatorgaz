export async function requestJson<T = unknown>(
  url: string,
  init?: RequestInit,
  fallbackError = "Eroare de server."
): Promise<T> {
  const response = await fetch(url, init);

  let data: unknown = null;
  try {
    const text = await response.text();
    if (text) data = JSON.parse(text);
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = (data as Record<string, unknown> | null)?.error;
    throw new Error(typeof message === "string" ? message : fallbackError);
  }

  return data as T;
}
