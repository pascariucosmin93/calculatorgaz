import Tesseract, { Worker } from "tesseract.js";

const WHITELIST = "0123456789";

let worker: Worker | null = null;
let workerReady: Promise<Worker> | null = null;

function initWorker(): Promise<Worker> {
  if (workerReady) return workerReady;

  workerReady = (async () => {
    const w = await Tesseract.createWorker("eng");
    await w.setParameters({ tessedit_char_whitelist: WHITELIST });
    worker = w;
    return w;
  })();

  return workerReady;
}

/**
 * Recognize text from image buffer using a shared singleton Tesseract worker.
 * Sequential access is enforced (one OCR at a time) to avoid memory spikes.
 */
let pending: Promise<unknown> = Promise.resolve();

export async function recognizeDigits(buffer: Buffer): Promise<string> {
  const run = pending.then(async () => {
    const w = await initWorker();
    const { data } = await w.recognize(buffer);
    return data.text;
  });

  // Chain: next caller waits for this one to finish
  pending = run.catch(() => {});

  return run;
}
