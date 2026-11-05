import { describe, expect, it } from "vitest";
import { parseTariffValidFrom } from "@/lib/tariff-history";

describe("tariff history effective date", () => {
  it("keeps a valid calendar date at midnight UTC", () => {
    expect(parseTariffValidFrom("2026-09-29")?.toISOString()).toBe("2026-09-29T00:00:00.000Z");
  });

  it("rejects malformed and impossible dates", () => {
    expect(parseTariffValidFrom("29.09.2026")).toBeNull();
    expect(parseTariffValidFrom("2026-02-31")).toBeNull();
  });
});
