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
    await w.setParameters({ tessedit_char_whitelist: "0123456789" });
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
    return data.text;
  });
  pending = run.catch(() => {});
  return run;
}

// ── Number extraction ─────────────────────────────────────────────────
function extractNumber(rawText) {
  if (!rawText) return null;
  const matches = rawText.match(/\d{4,7}/g);
  if (!matches || matches.length === 0) return null;
  const likely = matches.find((seq) => seq.length === 5 || seq.length === 6);
  return likely ? parseInt(likely, 10) : parseInt(matches[0], 10);
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
      const prevText = await recognizeDigits(previousFile.buffer);
      const prevValue = extractNumber(prevText);

      const currText = await recognizeDigits(currentFile.buffer);
      const currValue = extractNumber(currText);

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
