const http = require("http");
const { Readable } = require("stream");
const Busboy = require("busboy");
const Tesseract = require("tesseract.js");
const {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} = require("@aws-sdk/client-s3");

const PORT = Number(process.env.PORT || 8089);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

// S3 config
const S3_ENDPOINT =
  process.env.SEAWEED_S3_ENDPOINT?.trim() || "https://s3.galeata.devjobs.ro";
const S3_REGION = process.env.SEAWEED_S3_REGION?.trim() || "us-east-1";
const S3_ACCESS_KEY = process.env.SEAWEED_S3_ACCESS_KEY?.trim() || "";
const S3_SECRET_KEY = process.env.SEAWEED_S3_SECRET_KEY?.trim() || "";
const PHOTOS_BUCKET = "contor";

// ── Tesseract worker (singleton, sequential) ──────────────────────────
let worker = null;
let workerReady = null;

function initWorker() {
  if (workerReady) return workerReady;
  workerReady = (async () => {
    const w = await Tesseract.createWorker("eng");
    await w.setParameters({ tessedit_char_whitelist: "0123456789,." });
    worker = w;
    return w;
  })();
  return workerReady;
}

let pending = Promise.resolve();

async function recognizeDigits(buffer) {
  const run = pending.then(async () => {
    const w = await initWorker();
    const { data } = await w.recognize(buffer);
    return data;
  });
  pending = run.catch(() => {});
  return run;
}

// ── Number extraction ─────────────────────────────────────────────────
const INTEGER_DIGITS = Number(process.env.METER_INTEGER_DIGITS || 5);

function toDigitText(value) {
  if (!value) return "";
  return String(value).replace(/\D+/g, "");
}

// Try to extract reading using the comma/period separator visible on the meter.
// Meters display "XXXXX,YYY" where XXXXX is the integer part (black digits)
// and YYY is the decimal part (red digits in red box). We want only XXXXX.
function extractBySeparator(rawText) {
  if (!rawText) return null;
  // Collect ALL matches: 3-6 digits, comma or period, 1-4 digits
  const matches = [...rawText.matchAll(/(\d{3,6})[,.](\d{1,4})/g)];
  if (matches.length === 0) return null;
  // Prefer match with exactly INTEGER_DIGITS before separator (most reliable)
  const exact = matches.find((m) => m[1].length === INTEGER_DIGITS);
  if (exact) return parseInt(exact[1], 10);
  // Fall back to longest integer part that is still >= 4 digits
  const best = matches
    .filter((m) => m[1].length >= 4)
    .sort((a, b) => b[1].length - a[1].length)[0];
  if (best) return parseInt(best[1], 10);
  return null;
}

function fallbackExtractNumber(rawText) {
  // First try to use the separator (most reliable for this meter type)
  const bySep = extractBySeparator(rawText);
  if (bySep !== null) return bySep;

  const matches = rawText.match(/\d{4,}/g);
  if (!matches || matches.length === 0) return null;
  // Prefer exact match, then longer (merged integer+decimal), then first found
  const best =
    matches.find((s) => s.length === INTEGER_DIGITS) ||
    matches.find((s) => s.length > INTEGER_DIGITS) ||
    matches[0];
  // Always truncate to INTEGER_DIGITS to ignore decimal digits (red-box on meter)
  return parseInt(best.slice(0, INTEGER_DIGITS), 10);
}

function extractNumber(ocrData) {
  if (!ocrData) return null;

  // Best case: Tesseract preserved the comma/period separator — use it directly.
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

      // Prefer the register row: large digits placed in the lower-middle of the image.
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

// ── S3 helpers ────────────────────────────────────────────────────────
let bucketReady = false;
let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;
  s3Client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    forcePathStyle: true,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY,
    },
  });
  return s3Client;
}

async function ensurePhotoBucket() {
  if (bucketReady) return;
  const client = getS3Client();
  try {
    await client.send(new HeadBucketCommand({ Bucket: PHOTOS_BUCKET }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: PHOTOS_BUCKET }));
  }
  bucketReady = true;
}

function fileExtension(filename, contentType) {
  if (filename) {
    const dot = filename.lastIndexOf(".");
    if (dot !== -1) return filename.slice(dot);
  }
  if (contentType === "image/jpeg") return ".jpg";
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  return ".bin";
}

// ── Multipart parser ──────────────────────────────────────────────────
function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const files = {};
    const fields = {};
    const bb = Busboy({
      headers: req.headers,
      limits: { fileSize: MAX_IMAGE_SIZE, files: 3 },
    });

    bb.on("file", (fieldname, stream, info) => {
      const chunks = [];
      let size = 0;
      stream.on("data", (chunk) => {
        size += chunk.length;
        if (size <= MAX_IMAGE_SIZE) chunks.push(chunk);
      });
      stream.on("end", () => {
        if (size > 0) {
          files[fieldname] = {
            buffer: Buffer.concat(chunks),
            filename: info.filename,
            mimeType: info.mimeType,
          };
        }
      });
    });

    bb.on("field", (name, value) => {
      fields[name] = value;
    });

    bb.on("finish", () => resolve({ files, fields }));
    bb.on("error", reject);

    req.pipe(bb);
  });
}

// ── JSON helpers ──────────────────────────────────────────────────────
const json = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

// ── HTTP Server ───────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/health") {
      return json(res, 200, { ok: true });
    }

    if (req.method === "POST" && req.url === "/ocr") {
      const { files, fields } = await parseMultipart(req);

      const previousFile = files.previous;
      const currentFile = files.current;
      const username = fields.username || "unknown";

      if (!previousFile || !currentFile) {
        return json(res, 400, {
          error:
            "Trimite două imagini: una pentru luna trecută și una pentru luna curentă.",
        });
      }

      // Sequential OCR (shared WASM worker)
      const prevData = await recognizeDigits(previousFile.buffer);
      const prevValue = extractNumber(prevData);

      const currData = await recognizeDigits(currentFile.buffer);
      const currValue = extractNumber(currData);

      if (prevValue === null || currValue === null) {
        return json(res, 422, {
          error: "Nu am reușit să detectez cifre clare în imagine.",
          previousReading: prevValue,
          currentReading: currValue,
        });
      }

      // Upload photos to S3 (non-blocking)
      const photos = {};
      if (S3_ACCESS_KEY && S3_SECRET_KEY) {
        try {
          const client = getS3Client();

          const ts = Date.now();
          const prevKey = `${username}/${ts}-previous${fileExtension(previousFile.filename, previousFile.mimeType)}`;
          const currKey = `${username}/${ts}-current${fileExtension(currentFile.filename, currentFile.mimeType)}`;

          await Promise.all([
            client.send(
              new PutObjectCommand({
                Bucket: PHOTOS_BUCKET,
                Key: prevKey,
                Body: previousFile.buffer,
                ContentType: previousFile.mimeType || "image/jpeg",
              })
            ),
            client.send(
              new PutObjectCommand({
                Bucket: PHOTOS_BUCKET,
                Key: currKey,
                Body: currentFile.buffer,
                ContentType: currentFile.mimeType || "image/jpeg",
              })
            ),
          ]);

          const base = S3_ENDPOINT.replace(/\/+$/, "");
          photos.previous = `${base}/${PHOTOS_BUCKET}/${prevKey}`;
          photos.current = `${base}/${PHOTOS_BUCKET}/${currKey}`;
        } catch (s3Err) {
          console.error(
            "S3 upload error (non-blocking):",
            s3Err.message || s3Err
          );
        }
      }

      return json(res, 200, {
        previousReading: prevValue,
        currentReading: currValue,
        photos,
      });
    }

    return json(res, 404, { error: "Not found" });
  } catch (error) {
    console.error("OCR service error:", error.message || error);
    return json(res, 500, {
      error: "Eroare la procesarea imaginii.",
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ocr-service listening on ${PORT}`);
  // Pre-init Tesseract worker
  initWorker().then(() => console.log("Tesseract worker ready"));
});
