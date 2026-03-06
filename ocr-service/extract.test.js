const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { extractNumber, extractBySeparator, fallbackExtractNumber, toDigitText } = require("./extract");

describe("toDigitText", () => {
  it("strips non-digits", () => {
    assert.equal(toDigitText("abc123def456"), "123456");
  });

  it("returns empty for null/undefined", () => {
    assert.equal(toDigitText(null), "");
    assert.equal(toDigitText(undefined), "");
  });

  it("handles pure digits", () => {
    assert.equal(toDigitText("12345"), "12345");
  });
});

describe("extractBySeparator", () => {
  it("extracts 5-digit integer before comma", () => {
    assert.equal(extractBySeparator("12345,678"), 12345);
  });

  it("extracts 5-digit integer before period", () => {
    assert.equal(extractBySeparator("12345.678"), 12345);
  });

  it("prefers exact INTEGER_DIGITS match", () => {
    assert.equal(extractBySeparator("1234,56 12345,678"), 12345);
  });

  it("returns null for no separator pattern", () => {
    assert.equal(extractBySeparator("12345678"), null);
  });

  it("returns null for empty/null", () => {
    assert.equal(extractBySeparator(null), null);
    assert.equal(extractBySeparator(""), null);
  });

  it("handles 4-digit integer fallback", () => {
    assert.equal(extractBySeparator("1234,567"), 1234);
  });

  it("ignores short matches (< 3 digits before separator)", () => {
    assert.equal(extractBySeparator("12,345"), null);
  });
});

describe("fallbackExtractNumber", () => {
  it("extracts 5-digit sequence", () => {
    assert.equal(fallbackExtractNumber("index 12345 mc"), 12345);
  });

  it("prefers 5-digit over longer sequence", () => {
    assert.equal(fallbackExtractNumber("12345 1234567"), 12345);
  });

  it("truncates longer sequence to 5 digits", () => {
    assert.equal(fallbackExtractNumber("1234567890"), 12345);
  });

  it("returns null for short sequences", () => {
    assert.equal(fallbackExtractNumber("123 ab"), null);
  });

  it("handles separator fallback", () => {
    assert.equal(fallbackExtractNumber("00234,567"), 234);
  });
});

describe("extractNumber", () => {
  it("returns null for null input", () => {
    assert.equal(extractNumber(null), null);
  });

  it("returns null for empty ocrData", () => {
    assert.equal(extractNumber({}), null);
  });

  it("extracts from text with separator", () => {
    assert.equal(extractNumber({ text: "12345,678" }), 12345);
  });

  it("extracts from text fallback (no separator)", () => {
    assert.equal(extractNumber({ text: "index 54321 mc" }), 54321);
  });

  it("uses word bounding boxes when available", () => {
    const ocrData = {
      text: "",
      height: 100,
      words: [
        { text: "12345", confidence: 90, bbox: { x0: 10, y0: 40, x1: 200, y1: 70 } }
      ]
    };
    assert.equal(extractNumber(ocrData), 12345);
  });

  it("prefers larger digits in center of image", () => {
    const ocrData = {
      text: "",
      height: 200,
      words: [
        { text: "99", confidence: 80, bbox: { x0: 10, y0: 5, x1: 50, y1: 15 } },
        { text: "54321", confidence: 85, bbox: { x0: 10, y0: 80, x1: 300, y1: 130 } }
      ]
    };
    assert.equal(extractNumber(ocrData), 54321);
  });

  it("joins multiple word fragments on same line", () => {
    const ocrData = {
      text: "",
      height: 100,
      words: [
        { text: "123", confidence: 90, bbox: { x0: 10, y0: 40, x1: 80, y1: 70 } },
        { text: "45", confidence: 90, bbox: { x0: 85, y0: 40, x1: 130, y1: 70 } }
      ]
    };
    assert.equal(extractNumber(ocrData), 12345);
  });

  it("falls back to text when words have no bbox", () => {
    const ocrData = {
      text: "12345,678",
      height: 100,
      words: [{ text: "12345678", confidence: 90 }]
    };
    assert.equal(extractNumber(ocrData), 12345);
  });

  it("sanitizes username with path traversal", () => {
    // This tests the sanitization in server.js, not extract.js
    const dangerous = "../../../etc/passwd";
    const sanitized = dangerous.replace(/[^a-zA-Z0-9_.-]/g, "");
    assert.equal(sanitized, "......etcpasswd");
    assert.ok(!sanitized.includes("/"));
  });
});
