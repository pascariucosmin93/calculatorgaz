import { NextRequest, NextResponse } from "next/server";
import { isErrorResponse, verifySession } from "@/lib/auth";
import { locationNotFound, resolveLocation } from "@/lib/locations";
import prisma from "@/lib/prisma";
import { parseTariffValidFrom } from "@/lib/tariff-history";

const fields = [
  "pcs", "gasPriceMwh", "transportPriceMwh", "distributionPriceMwh",
  "cap26PriceMwh", "cap6PriceMwh", "fixedFee", "vatRate"
] as const;

const validNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

export async function GET(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;
  const location = await resolveLocation(session.id, request.nextUrl.searchParams.get("locationId"));
  if (!location) return locationNotFound();

  const tariff = await prisma.locationTariff.findUnique({ where: { locationId: location.id } });
  if (!location.isDefault) return NextResponse.json(tariff);

  // Versiunea stable veche scrie doar TariffProfile: pentru locația implicită
  // câștigă profilul modificat cel mai recent.
  const legacy = await prisma.tariffProfile.findUnique({ where: { userId: session.id } });
  if (legacy && (!tariff || legacy.updatedAt > tariff.updatedAt)) return NextResponse.json(legacy);
  return NextResponse.json(tariff);
}

export async function PUT(request: NextRequest) {
  const session = await verifySession(request);
  if (isErrorResponse(session)) return session;

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    if (!fields.every((field) => validNumber(payload[field]))) {
      return NextResponse.json({ error: "Tarife invalide." }, { status: 422 });
    }
    const values = {
      pcs: payload.pcs as number,
      gasPriceMwh: payload.gasPriceMwh as number,
      transportPriceMwh: payload.transportPriceMwh as number,
      distributionPriceMwh: payload.distributionPriceMwh as number,
      cap26PriceMwh: payload.cap26PriceMwh as number,
      cap6PriceMwh: payload.cap6PriceMwh as number,
      fixedFee: payload.fixedFee as number,
      vatRate: payload.vatRate as number
    };
    if (values.pcs <= 0 || values.gasPriceMwh < 0 || values.transportPriceMwh < 0 || values.distributionPriceMwh < 0 || values.fixedFee < 0 || values.vatRate < 0 || values.vatRate > 1) {
      return NextResponse.json({ error: "Valorile tarifelor nu sunt valide." }, { status: 422 });
    }
    const ownerName = typeof payload.ownerName === "string" ? payload.ownerName.trim() : undefined;
    const address = typeof payload.address === "string" ? payload.address.trim() : undefined;
    const meterSerial = typeof payload.meterSerial === "string" ? payload.meterSerial.trim().slice(0, 80) : undefined;
    const location = await resolveLocation(session.id, payload.locationId);
    if (!location) return locationNotFound();
    const validFrom = parseTariffValidFrom(payload.validFrom);
    if (!validFrom) {
      return NextResponse.json({ error: "Data de valabilitate nu este validă." }, { status: 422 });
    }
    const requestedCity = typeof payload.city === "string" && payload.city.trim()
      ? payload.city.trim()
      : null;
    const includeVat = payload.includeVat !== false;
    const source = payload.source === "INVOICE" ? "INVOICE" : "MANUAL";
    const profile = await prisma.$transaction(async (tx) => {
      const currentProfile = await tx.locationTariff.findUnique({ where: { locationId: location.id } });
      const city = requestedCity ?? currentProfile?.city ?? "generic";
      const profileChanged = !currentProfile ||
        currentProfile.city !== city ||
        currentProfile.includeVat !== includeVat ||
        fields.some((field) => currentProfile[field] !== values[field]);
      const savedProfile = await tx.locationTariff.upsert({
        where: { locationId: location.id },
        create: { locationId: location.id, city, includeVat, ...values },
        update: { city, includeVat, ...values }
      });
      if (profileChanged) {
        await tx.tariffHistory.create({
          data: { userId: session.id, locationId: location.id, city, includeVat, validFrom, source, ...values }
        });
      }
      if (address !== undefined || meterSerial !== undefined) {
        await tx.location.update({
          where: { id: location.id },
          data: {
            ...(address !== undefined ? { address: address || null } : {}),
            ...(meterSerial !== undefined ? { meterSerial: meterSerial || null } : {})
          }
        });
      }
      if (ownerName !== undefined || (location.isDefault && (address !== undefined || meterSerial !== undefined))) {
        await tx.user.update({
          where: { id: session.id },
          data: {
            ...(ownerName !== undefined ? { ownerName: ownerName || null } : {}),
            ...(location.isDefault && address !== undefined ? { address: address || null } : {}),
            ...(location.isDefault && meterSerial !== undefined ? { meterSerial: meterSerial || null } : {})
          }
        });
      }
      if (location.isDefault) {
        // Oglindă pentru versiunea stable, care încă citește TariffProfile.
        await tx.tariffProfile.upsert({
          where: { userId: session.id },
          create: { userId: session.id, city, includeVat, ...values },
          update: { city, includeVat, ...values }
        });
      }
      return savedProfile;
    });
    return NextResponse.json(profile);
  } catch {
    return NextResponse.json({ error: "Nu am putut salva tarifele." }, { status: 400 });
  }
}
