const INTEGER_DIGITS = Number(process.env.METER_INTEGER_DIGITS || 5);

function toDigitText(value) {
  if (!value) return "";
  return String(value).replace(/\D+/g, "");
}

function extractBySeparator(rawText) {
  if (!rawText) return null;
  const matches = [...rawText.matchAll(/(\d{3,6})[,.](\d{1,4})/g)];
  if (matches.length === 0) return null;
  const exact = matches.find((m) => m[1].length === INTEGER_DIGITS);
  if (exact) return parseInt(exact[1], 10);
  const best = matches
    .filter((m) => m[1].length >= 4)
    .sort((a, b) => b[1].length - a[1].length)[0];
  if (best) return parseInt(best[1], 10);
  return null;
}

function fallbackExtractNumber(rawText) {
  const bySep = extractBySeparator(rawText);
  if (bySep !== null) return bySep;

  const matches = rawText.match(/\d{4,}/g);
  if (!matches || matches.length === 0) return null;
  const best =
    matches.find((s) => s.length === INTEGER_DIGITS) ||
    matches.find((s) => s.length > INTEGER_DIGITS) ||
    matches[0];
  return parseInt(best.slice(0, INTEGER_DIGITS), 10);
}

function extractNumber(ocrData) {
  if (!ocrData) return null;

  const bySeparator = extractBySeparator(ocrData.text || "");
  if (bySeparator !== null) return bySeparator;

  const imageHeight = Number(ocrData.height || 0);
  const words = Array.isArray(ocrData.words) ? ocrData.words : [];

  const digitWords = words
    .map((word) => {
      const digits = toDigitText(word?.text);
      const bbox = word?.bbox;
      if (!digits || !bbox) return null;

      const x0 = Number(bbox.x0 || 0);
      const y0 = Number(bbox.y0 || 0);
      const x1 = Number(bbox.x1 || 0);
      const y1 = Number(bbox.y1 || 0);
      const height = Math.max(0, y1 - y0);
      const cy = y0 + height / 2;
      const confidence = Number(word.confidence || 0);

      return { digits, x0, y0, x1, y1, height, cy, confidence };
    })
    .filter(Boolean);

  if (digitWords.length === 0) {
    return fallbackExtractNumber(ocrData.text || "");
  }

  const maxHeight = digitWords.reduce((max, item) => Math.max(max, item.height), 0);
  const minUsefulHeight = Math.max(10, maxHeight * 0.55);
  const yLowerBound = imageHeight > 0 ? imageHeight * 0.28 : 0;
  const yUpperBound = imageHeight > 0 ? imageHeight * 0.9 : Number.POSITIVE_INFINITY;

  const filteredWords = digitWords.filter(
    (item) => item.height >= minUsefulHeight && item.cy >= yLowerBound && item.cy <= yUpperBound
  );

  const source = filteredWords.length > 0 ? filteredWords : digitWords;
  source.sort((a, b) => a.cy - b.cy);

  const lineGap = Math.max(12, maxHeight * 0.7);
  const lines = [];
  for (const item of source) {
    const lastLine = lines[lines.length - 1];
    if (!lastLine || Math.abs(lastLine.cy - item.cy) > lineGap) {
      lines.push({ cy: item.cy, items: [item] });
      continue;
    }
    lastLine.items.push(item);
    lastLine.cy =
      lastLine.items.reduce((sum, curr) => sum + curr.cy, 0) / lastLine.items.length;
  }

  if (lines.length === 0) {
    return fallbackExtractNumber(ocrData.text || "");
  }

  const bestLine = lines
    .map((line) => {
      const items = [...line.items].sort((a, b) => a.x0 - b.x0);
      const digits = items.map((item) => item.digits).join("");
      const avgHeight = items.reduce((sum, item) => sum + item.height, 0) / items.length;
      const avgConfidence =
        items.reduce((sum, item) => sum + item.confidence, 0) / items.length;
      const normalizedY = imageHeight > 0 ? line.cy / imageHeight : 0.5;

      const yBonus = normalizedY >= 0.35 && normalizedY <= 0.85 ? 20 : -20;
      const digitBonus = digits.length >= INTEGER_DIGITS ? 30 : -30;
      const score = avgHeight * 2 + yBonus + digitBonus + avgConfidence / 10;

      return { digits, score };
    })
    .sort((a, b) => b.score - a.score)[0];

  if (!bestLine || bestLine.digits.length < 4) {
    return fallbackExtractNumber(ocrData.text || "");
  }

  const integerPart = bestLine.digits.slice(0, INTEGER_DIGITS);
  if (integerPart.length < INTEGER_DIGITS) {
    return fallbackExtractNumber(ocrData.text || "");
  }
  return parseInt(integerPart, 10);
}

module.exports = { extractNumber, extractBySeparator, fallbackExtractNumber, toDigitText };
