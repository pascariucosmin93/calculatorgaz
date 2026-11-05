import { NextResponse } from "next/server";
import { ensureDefaultLocation, locationNotFound, readingScope, resolveLocation, type LocationRecord } from "@/lib/locations";
import prisma from "@/lib/prisma";
import { BillingInput, BillingResult, calculateBilling } from "@/lib/billing";
import { calculateViaBillingService, isBillingServiceConfigured } from "@/lib/billing-client";
import { sendNotification } from "@/lib/notification-client";
import { canCorrectReading } from "@/lib/reading-correction";
import { deleteReadingPhoto } from "@/lib/reading-photo";

const READING_TYPES = ["SELF_READING", "SUPPLIER_ESTIMATE", "REGULARIZATION"] as const;
type ReadingType = (typeof READING_TYPES)[number];

type Payload = {
  userId: string;
  locationId?: string;
  previousReading?: number;
  currentReading: number;
  pcs: number;
  gasPriceMwh: number;
  transportPriceMwh: number;
  distributionPriceMwh: number;
  cap26PriceMwh: number;
  cap6PriceMwh: number;
  fixedFee: number;
  vatRate: number;
  includeVat: boolean;
  readingAt?: string;
  readingType?: ReadingType;
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
const isReadingType = (value: unknown): value is ReadingType =>
  typeof value === "string" && READING_TYPES.includes(value as ReadingType);

const configuredMaxConsumption = Number(process.env.MAX_READING_CONSUMPTION_M3 ?? 10_000);
const MAX_READING_CONSUMPTION_M3 =
  Number.isFinite(configuredMaxConsumption) && configuredMaxConsumption > 0
    ? configuredMaxConsumption
    : 10_000;

const configuredAnomalyMultiplier = Number(process.env.ANOMALY_THRESHOLD_MULTIPLIER ?? 2);
const ANOMALY_THRESHOLD_MULTIPLIER =
  Number.isFinite(configuredAnomalyMultiplier) && configuredAnomalyMultiplier > 1
    ? configuredAnomalyMultiplier
    : 2;

const configuredAnomalyMinHistory = Number(process.env.ANOMALY_MIN_HISTORY ?? 3);
const ANOMALY_MIN_HISTORY =
  Number.isInteger(configuredAnomalyMinHistory) && configuredAnomalyMinHistory > 0
    ? configuredAnomalyMinHistory
    : 3;

const ANOMALY_HISTORY_WINDOW = 6;

// Comparat cu media propriilor citiri anterioare ale userului, nu cu un
// plafon global — spre deosebire de MAX_READING_CONSUMPTION_M3 de mai sus,
// care doar respinge valori absurde. Aici avertizăm, nu blocăm: un consum
// mare poate fi legitim (iarnă), doar userul știe sigur.
async function detectConsumptionAnomaly(
  userId: string,
  location: LocationRecord,
  readingId: string,
  consumptionM3: number,
  readingAt: Date,
  previousReadingAt: Date | undefined
): Promise<void> {
  if (!previousReadingAt) return;
  const currentDays = Math.round((readingAt.getTime() - previousReadingAt.getTime()) / 86_400_000);
  if (currentDays <= 0) return;

  const history = await prisma.reading.findMany({
    where: { AND: [readingScope(location), { id: { not: readingId } }] },
    orderBy: [{ readingAt: "desc" }, { createdAt: "desc" }],
    take: ANOMALY_HISTORY_WINDOW + 1,
    select: { consumptionM3: true, readingAt: true, isBaseline: true }
  });
  const ordered = [...history].reverse();
  const dailyRates = ordered.flatMap((item, index) => {
    if (index === 0 || item.isBaseline) return [];
    const days = Math.round((item.readingAt.getTime() - ordered[index - 1].readingAt.getTime()) / 86_400_000);
    return days > 0 ? [item.consumptionM3 / days] : [];
  });
  if (dailyRates.length < ANOMALY_MIN_HISTORY) return;

  const averageDaily = dailyRates.reduce((sum, value) => sum + value, 0) / dailyRates.length;
  const currentDaily = consumptionM3 / currentDays;
  if (averageDaily <= 0 || currentDaily < averageDaily * ANOMALY_THRESHOLD_MULTIPLIER) return;

  const monthKey = `${readingAt.getUTCFullYear()}-${String(readingAt.getUTCMonth() + 1).padStart(2, "0")}`;

  try {
    await prisma.appNotification.create({
      data: {
        userId,
        type: "consumption-anomaly",
        // O alertă pe lună și pe locație (cheia unică e userId + type + monthKey).
        monthKey: location.isDefault ? monthKey : `${monthKey}:${location.id}`,
        title: location.isDefault ? "Consum neobișnuit de mare" : `Consum neobișnuit de mare · ${location.name}`,
        message: `Ritmul consumului este de ${currentDaily.toFixed(1)} m³/zi, de ${(currentDaily / averageDaily).toFixed(1)}× peste media ultimelor ${dailyRates.length} perioade (${averageDaily.toFixed(1)} m³/zi). Verifică indexul, setările centralei sau o posibilă scurgere.`
      }
    });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("Unique constraint")) throw error;
  }
}

function parseReadingAt(value: unknown): Date | null {
  if (value === undefined) return new Date();
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function createBaselineBill(input: BillingInput): BillingResult {
  const zero = { unitPriceMwh: 0, value: 0 };
  return {
    consumptionM3: 0,
    consumptionKwh: 0,
    consumptionMwh: 0,
    pcs: input.pcs,
    variableCost: 0,
    pricePerKwh: 0,
    pricePerKwhWithVat: 0,
    pricePerM3: 0,
    pricePerM3WithVat: 0,
    baseCost: 0,
    adjustmentCost: 0,
    fixedFee: 0,
    subtotal: 0,
    vat: 0,
    vatRate: input.vatRate,
    total: 0,
    breakdown: { gas: zero, transport: zero, distribution: zero, cap26: zero, cap6: zero }
  };
}

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
  if (!userId) {
    return NextResponse.json({ error: "Lipsește utilizatorul." }, { status: 401 });
  }

  const location = await resolveLocation(userId, new URL(request.url).searchParams.get("locationId"));
  if (!location) return locationNotFound();

  const readings = await prisma.reading.findMany({
    where: readingScope(location),
    orderBy: [{ readingAt: "desc" }, { createdAt: "desc" }],
    take: 120
  });

  return NextResponse.json(readings);
}

export async function POST(request: Request) {
  let payload: Payload;
  try {
    payload = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ error: "Body invalid." }, { status: 400 });
  }

  const {
    userId,
    previousReading: suppliedPreviousReading,
    currentReading,
    pcs,
    gasPriceMwh,
    transportPriceMwh,
    distributionPriceMwh,
    cap26PriceMwh,
    cap6PriceMwh,
    fixedFee,
    vatRate,
    includeVat
  } = payload;

  if (typeof userId !== "string" || !userId.trim()) {
    return NextResponse.json({ error: "Lipsește utilizatorul." }, { status: 401 });
  }

  const owner = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, ownerName: true, email: true }
  });
  if (!owner) {
    return NextResponse.json({ error: "Utilizator invalid." }, { status: 401 });
  }

  if (
    ![
      currentReading,
      pcs,
      gasPriceMwh,
      transportPriceMwh,
      distributionPriceMwh,
      cap26PriceMwh,
      cap6PriceMwh,
      fixedFee,
      vatRate
    ].every(isNumber) ||
    typeof includeVat !== "boolean" ||
    (payload.readingType !== undefined && !isReadingType(payload.readingType))
  ) {
    return NextResponse.json({ error: "Date invalide pentru salvare." }, { status: 400 });
  }

  const readingAt = parseReadingAt(payload.readingAt);
  if (!readingAt || readingAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return NextResponse.json({ error: "Data citirii nu este validă." }, { status: 422 });
  }

  const location = await resolveLocation(userId, payload.locationId);
  if (!location) return locationNotFound();

  const latestReading = await prisma.reading.findFirst({
    where: readingScope(location),
    orderBy: [{ readingAt: "desc" }, { createdAt: "desc" }],
    select: { currentReading: true, readingAt: true }
  });
  if (latestReading && readingAt <= latestReading.readingAt) {
    return NextResponse.json(
      { error: "Data citirii trebuie să fie după ultima citire salvată." },
      { status: 422 }
    );
  }

  const isBaseline = !latestReading && !isNumber(suppliedPreviousReading);
  const previousReading = isBaseline
    ? currentReading
    : latestReading?.currentReading ?? suppliedPreviousReading;
  if (!isNumber(previousReading) || previousReading < 0) {
    return NextResponse.json(
      { error: "Pentru prima citire introdu indexul anterior valid al contorului." },
      { status: 422 }
    );
  }

  if (currentReading < 0) {
    return NextResponse.json({ error: "Indexul contorului nu poate fi negativ." }, { status: 422 });
  }

  if (!isBaseline && currentReading === previousReading) {
    return NextResponse.json({ error: "Această citire este deja salvată." }, { status: 409 });
  }

  if (!isBaseline && currentReading < previousReading) {
    return NextResponse.json(
      { error: "Indexul este mai mic decât ultima citire confirmată." },
      { status: 422 }
    );
  }

  if (!isBaseline && currentReading - previousReading > MAX_READING_CONSUMPTION_M3) {
    return NextResponse.json(
      { error: `Diferența de index depășește ${MAX_READING_CONSUMPTION_M3.toLocaleString("ro-RO")} m³. Verifică fotografia și indexul introdus.` },
      { status: 422 }
    );
  }

  if (pcs <= 0) {
    return NextResponse.json(
      { error: "Pcs (kWh/mc) trebuie să fie pozitiv." },
      { status: 422 }
    );
  }

  if (vatRate < 0 || vatRate > 1) {
    return NextResponse.json({ error: "TVA trebuie să fie un procent între 0 și 1." }, { status: 422 });
  }

  if ([gasPriceMwh, transportPriceMwh, distributionPriceMwh].some((value) => value < 0)) {
    return NextResponse.json(
      { error: "Tarifele unitare nu pot fi negative (compensațiile pot fi însă negative)." },
      { status: 422 }
    );
  }

  if (fixedFee < 0) {
    return NextResponse.json({ error: "Abonamentul nu poate fi negativ." }, { status: 422 });
  }

  const billingInput: BillingInput = {
    previousReading,
    currentReading,
    pcs,
    gasPriceMwh,
    transportPriceMwh,
    distributionPriceMwh,
    cap26PriceMwh,
    cap6PriceMwh,
    fixedFee: isBaseline ? 0 : fixedFee,
    vatRate,
    includeVat
  };

  const bill = isBaseline
    ? createBaselineBill(billingInput)
    : isBillingServiceConfigured()
    ? await calculateViaBillingService(billingInput).catch((error) => {
        console.error("Billing service unavailable, using local calculator", error);
        return calculateBilling(billingInput);
      })
    : calculateBilling(billingInput);

  const entry = await prisma.reading.create({
    data: {
      previousReading,
      currentReading,
      consumptionM3: bill.consumptionM3,
      consumptionKwh: bill.consumptionKwh,
      pricePerKwh: bill.pricePerKwh,
      pricePerM3: bill.pricePerM3,
      conversionFactor: pcs,
      fixedFee: bill.fixedFee,
      includeVat,
      subtotal: bill.subtotal,
      vat: bill.vat,
      total: bill.total,
      userId,
      locationId: location.id,
      isBaseline,
      readingType: payload.readingType ?? "SELF_READING",
      readingAt
    }
  });

  if (!isBaseline) {
    detectConsumptionAnomaly(userId, location, entry.id, bill.consumptionM3, readingAt, latestReading?.readingAt).catch((error) => {
      console.error("Anomaly detection failed", error);
    });
  }

  sendNotification({
    message: isBaseline ? "Index inițial salvat" : "Citire nouă salvată",
    details: {
      username: owner.username,
      ownerName: owner.ownerName ?? "-",
      email: owner.email ?? "-",
      userId,
      location: location.name,
      readingId: entry.id,
      previousReading: Number(previousReading.toFixed(3)),
      currentReading: Number(currentReading.toFixed(3)),
      consumptionM3: Number(bill.consumptionM3.toFixed(3)),
      totalLei: Number(bill.total.toFixed(2))
    }
  }).catch((error) => {
    console.error("Failed to send Discord notification", error);
  });

  return NextResponse.json(
    {
      ...entry,
      ...bill
    },
    { status: 201 }
  );
}

function recalculatedValues(entry: { previousReading: number; currentReading: number; conversionFactor: number; pricePerM3: number; fixedFee: number; includeVat: boolean; subtotal: number; vat: number }) {
  const consumptionM3 = entry.currentReading - entry.previousReading;
  const consumptionKwh = consumptionM3 * entry.conversionFactor;
  const variableCost = consumptionM3 * entry.pricePerM3;
  const subtotal = variableCost + entry.fixedFee;
  const vatRate = entry.includeVat && entry.subtotal > 0 ? entry.vat / entry.subtotal : 0;
  const vat = entry.includeVat ? subtotal * vatRate : 0;
  return { consumptionM3, consumptionKwh, subtotal, vat, total: subtotal + vat };
}

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Vecinii unei citiri se caută doar în locația ei; NULL = locația implicită.
async function scopeForEntry(tx: Tx, entry: { userId: string | null; locationId: string | null }) {
  const location = entry.locationId
    ? await tx.location.findUnique({ where: { id: entry.locationId } })
    : null;
  return readingScope(location ?? (await ensureDefaultLocation(entry.userId as string)));
}

export async function PATCH(request: Request) {
  let payload: { userId?: string; id?: string; currentReading?: number; readingType?: unknown };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Body invalid." }, { status: 400 }); }
  if (!payload.userId?.trim() || !payload.id?.trim() || !isNumber(payload.currentReading) || !isReadingType(payload.readingType)) {
    return NextResponse.json({ error: "Date invalide pentru corectarea citirii." }, { status: 400 });
  }
  const userId = payload.userId.trim();
  const readingId = payload.id.trim();
  const currentReading = payload.currentReading;
  const readingType = payload.readingType;
  if (currentReading < 0) return NextResponse.json({ error: "Indexul contorului nu poate fi negativ." }, { status: 422 });

  try {
    const corrected = await prisma.$transaction(async (tx) => {
      const entry = await tx.reading.findFirst({ where: { id: readingId, userId } });
      if (!entry) throw new Error("NOT_FOUND");
      if (!canCorrectReading(entry.createdAt)) throw new Error("WINDOW_EXPIRED");

      const scope = await scopeForEntry(tx, entry);
      const previous = await tx.reading.findFirst({
        where: { AND: [scope, { OR: [{ readingAt: { lt: entry.readingAt } }, { readingAt: entry.readingAt, createdAt: { lt: entry.createdAt } }] }] },
        orderBy: [{ readingAt: "desc" }, { createdAt: "desc" }]
      });
      const next = await tx.reading.findFirst({
        where: { AND: [scope, { OR: [{ readingAt: { gt: entry.readingAt } }, { readingAt: entry.readingAt, createdAt: { gt: entry.createdAt } }] }] },
        orderBy: [{ readingAt: "asc" }, { createdAt: "asc" }]
      });
      const previousIndex = previous?.currentReading ?? entry.previousReading;
      if (!entry.isBaseline && currentReading < previousIndex) throw new Error("LOWER_THAN_PREVIOUS");
      if (next && currentReading > next.currentReading) throw new Error("HIGHER_THAN_NEXT");
      if (!entry.isBaseline && currentReading - previousIndex > MAX_READING_CONSUMPTION_M3) throw new Error("CONSUMPTION_TOO_HIGH");
      if (next && next.currentReading - currentReading > MAX_READING_CONSUMPTION_M3) throw new Error("NEXT_CONSUMPTION_TOO_HIGH");

      const ownValues = entry.isBaseline
        ? { previousReading: currentReading, consumptionM3: 0, consumptionKwh: 0, pricePerKwh: 0, pricePerM3: 0, fixedFee: 0, subtotal: 0, vat: 0, total: 0 }
        : recalculatedValues({ ...entry, previousReading: previousIndex, currentReading });
      const updated = await tx.reading.update({
        where: { id: entry.id },
        data: { ...ownValues, currentReading, readingType }
      });
      if (next) {
        const nextValues = recalculatedValues({ ...next, previousReading: currentReading });
        await tx.reading.update({ where: { id: next.id }, data: { ...nextValues, previousReading: currentReading } });
      }
      return updated;
    });
    return NextResponse.json(corrected);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      NOT_FOUND: "Citirea nu există sau nu îți aparține.",
      WINDOW_EXPIRED: "Citirea poate fi corectată doar în primele 4 zile de la salvare.",
      LOWER_THAN_PREVIOUS: "Indexul corectat nu poate fi mai mic decât citirea anterioară.",
      HIGHER_THAN_NEXT: "Indexul corectat nu poate depăși citirea următoare.",
      CONSUMPTION_TOO_HIGH: `Diferența de index depășește ${MAX_READING_CONSUMPTION_M3.toLocaleString("ro-RO")} m³.`,
      NEXT_CONSUMPTION_TOO_HIGH: `Corectarea ar face ca următoarea perioadă să depășească ${MAX_READING_CONSUMPTION_M3.toLocaleString("ro-RO")} m³.`
    };
    if (messages[code]) return NextResponse.json({ error: messages[code] }, { status: code === "NOT_FOUND" ? 404 : 422 });
    console.error("Reading correction failed", error);
    return NextResponse.json({ error: "Nu am putut corecta citirea." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  let payload: { userId?: string; id?: string };
  try { payload = await request.json(); } catch { return NextResponse.json({ error: "Body invalid." }, { status: 400 }); }
  const userId = payload.userId?.trim();
  const readingId = payload.id?.trim();
  if (!userId || !readingId) return NextResponse.json({ error: "Date invalide pentru ștergerea citirii." }, { status: 400 });

  try {
    let photoKey = null as string | null;
    await prisma.$transaction(async (tx) => {
      const entry = await tx.reading.findFirst({ where: { id: readingId, userId } });
      if (!entry) throw new Error("NOT_FOUND");
      if (!canCorrectReading(entry.createdAt)) throw new Error("WINDOW_EXPIRED");
      photoKey = entry.photoKey;

      const scope = await scopeForEntry(tx, entry);
      const previous = await tx.reading.findFirst({
        where: { AND: [scope, { OR: [{ readingAt: { lt: entry.readingAt } }, { readingAt: entry.readingAt, createdAt: { lt: entry.createdAt } }] }] },
        orderBy: [{ readingAt: "desc" }, { createdAt: "desc" }]
      });
      const next = await tx.reading.findFirst({
        where: { AND: [scope, { OR: [{ readingAt: { gt: entry.readingAt } }, { readingAt: entry.readingAt, createdAt: { gt: entry.createdAt } }] }] },
        orderBy: [{ readingAt: "asc" }, { createdAt: "asc" }]
      });
      const replacementPreviousReading = previous?.currentReading ?? entry.previousReading;
      if (next) {
        if (next.currentReading < replacementPreviousReading) throw new Error("NEXT_READING_INVALID");
        const nextValues = recalculatedValues({ ...next, previousReading: replacementPreviousReading });
        await tx.reading.update({
          where: { id: next.id },
          data: { ...nextValues, previousReading: replacementPreviousReading }
        });
      }
      await tx.reading.delete({ where: { id: entry.id } });
    });
    if (photoKey) await deleteReadingPhoto(photoKey).catch((error) => console.error("Failed to delete reading photo", error));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    const messages: Record<string, string> = {
      NOT_FOUND: "Citirea nu există sau nu îți aparține.",
      WINDOW_EXPIRED: "Citirea poate fi ștearsă doar în primele 4 zile de la salvare.",
      NEXT_READING_INVALID: "Citirea următoare are un index mai mic și nu poate fi recalculată."
    };
    if (messages[code]) return NextResponse.json({ error: messages[code] }, { status: code === "NOT_FOUND" ? 404 : 422 });
    console.error("Reading deletion failed", error);
    return NextResponse.json({ error: "Nu am putut șterge citirea." }, { status: 500 });
  }
}
