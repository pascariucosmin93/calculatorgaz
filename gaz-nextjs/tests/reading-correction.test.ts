import { describe, expect, it } from "vitest";
import { canCorrectReading, correctionDeadline, READING_CORRECTION_WINDOW_MS } from "../lib/reading-correction";

describe("reading correction window", () => {
  const createdAt = new Date("2026-02-02T10:00:00.000Z");

  it("allows a correction through exactly four days after saving", () => {
    expect(canCorrectReading(createdAt, new Date(createdAt.getTime() + READING_CORRECTION_WINDOW_MS))).toBe(true);
  });

  it("rejects a correction after the four-day deadline", () => {
    expect(canCorrectReading(createdAt, new Date(createdAt.getTime() + READING_CORRECTION_WINDOW_MS + 1))).toBe(false);
    expect(correctionDeadline(createdAt).toISOString()).toBe("2026-02-06T10:00:00.000Z");
  });
});
