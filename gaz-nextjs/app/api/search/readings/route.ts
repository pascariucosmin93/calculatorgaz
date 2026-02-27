import { NextResponse } from "next/server";
import { isElasticConfigured, searchReadings } from "@/lib/elasticsearch";

const clampSize = (value: number) => {
  if (Number.isNaN(value) || value <= 0) {
    return 20;
  }
  return Math.min(value, 100);
};

export async function GET(request: Request) {
  if (!isElasticConfigured()) {
    return NextResponse.json(
      { error: "Elasticsearch nu este configurat (ELASTICSEARCH_URL)." },
      { status: 503 }
    );
  }

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId")?.trim() ?? "";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const size = clampSize(Number.parseInt(url.searchParams.get("size") ?? "20", 10));

  const must: Array<Record<string, unknown>> = [];
  if (userId) {
    must.push({ term: { userId } });
  }
  if (q) {
    must.push({
      multi_match: {
        query: q,
        fields: ["id^3", "userId^2"],
        type: "best_fields"
      }
    });
  }

  const query =
    must.length === 0
      ? { match_all: {} }
      : {
          bool: {
            must
          }
        };

  try {
    const data = (await searchReadings({
      size,
      sort: [{ createdAt: { order: "desc" } }],
      query
    })) as {
      hits?: { hits?: Array<{ _id: string; _source?: Record<string, unknown> }> };
    };

    const hits = data.hits?.hits ?? [];
    const items = hits.map((item) => ({
      id: item._id,
      ...(item._source ?? {})
    }));

    return NextResponse.json({ count: items.length, items });
  } catch (error) {
    console.error("Elasticsearch search failed", error);
    return NextResponse.json({ error: "Nu am putut face căutarea în Elasticsearch." }, { status: 502 });
  }
}
