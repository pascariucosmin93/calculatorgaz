import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { indexReadingDocument, isElasticConfigured } from "@/lib/elasticsearch";
import { BillingInput, calculateBilling } from "@/lib/billing";
import { calculateViaBillingService, isBillingServiceConfigured } from "@/lib/billing-client";

type Payload = {
  userId: string;
  previousReading: number;
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
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get("userId")?.trim() ?? "";
  if (!userId) {
    return NextResponse.json({ error: "Lipsește utilizatorul." }, { status: 401 });
  }

  const readings = await prisma.reading.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20
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
    previousReading,
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
    select: { id: true }
  });
  if (!owner) {
    return NextResponse.json({ error: "Utilizator invalid." }, { status: 401 });
  }

  if (
    ![
      previousReading,
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
    typeof includeVat !== "boolean"
  ) {
    return NextResponse.json({ error: "Date invalide pentru salvare." }, { status: 400 });
  }

  if (currentReading <= previousReading) {
    return NextResponse.json(
      { error: "Citirea actuală trebuie să fie mai mare decât cea anterioară." },
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
    fixedFee,
    vatRate,
    includeVat
  };

  const bill = isBillingServiceConfigured()
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
      fixedFee,
      includeVat,
      subtotal: bill.subtotal,
      vat: bill.vat,
      total: bill.total,
      userId
    }
  });

  if (isElasticConfigured()) {
    try {
      await indexReadingDocument(entry.id, {
        id: entry.id,
        userId,
        previousReading,
        currentReading,
        consumptionM3: bill.consumptionM3,
        consumptionKwh: bill.consumptionKwh,
        consumptionMwh: bill.consumptionMwh,
        pcs,
        gasPriceMwh,
        transportPriceMwh,
        distributionPriceMwh,
        cap26PriceMwh,
        cap6PriceMwh,
        fixedFee,
        includeVat,
        vatRate,
        subtotal: bill.subtotal,
        vat: bill.vat,
        total: bill.total,
        createdAt: entry.createdAt
      });
    } catch (error) {
      console.error("Failed to index reading in Elasticsearch", error);
    }
  }

  return NextResponse.json(
    {
      ...entry,
      ...bill
    },
    { status: 201 }
  );
}
