import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

export const MAX_LOCATIONS_PER_USER = 10;
export const DEFAULT_LOCATION_NAME = "Acasă";

export type LocationRecord = {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  meterSerial: string | null;
  isDefault: boolean;
};

// Utilizatorii creați după migrare (sau de versiunea stable veche) nu au încă
// locație: o creăm la prima folosire, din datele de profil existente.
export async function ensureDefaultLocation(userId: string): Promise<LocationRecord> {
  const existing = await prisma.location.findFirst({ where: { userId, isDefault: true } });
  if (existing) return existing;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { address: true, meterSerial: true }
  });
  try {
    return await prisma.location.create({
      data: {
        id: `loc_${userId}`,
        userId,
        name: DEFAULT_LOCATION_NAME,
        address: user?.address ?? null,
        meterSerial: user?.meterSerial ?? null,
        isDefault: true
      }
    });
  } catch (error) {
    // Cerere paralelă care a creat-o deja (id sau index unic al locației implicite).
    if ((error as { code?: string }).code === "P2002") {
      const created = await prisma.location.findFirst({ where: { userId, isDefault: true } });
      if (created) return created;
    }
    throw error;
  }
}

// Fără locationId se folosește locația implicită. Un id străin sau inexistent
// returnează null (apelantul răspunde 404), ca să nu se citească date ale altuia.
export async function resolveLocation(
  userId: string,
  locationId: unknown
): Promise<LocationRecord | null> {
  const requested = typeof locationId === "string" ? locationId.trim() : "";
  if (!requested) return ensureDefaultLocation(userId);
  await ensureDefaultLocation(userId);
  return prisma.location.findFirst({ where: { id: requested, userId } });
}

// Citirile salvate de versiunea veche au locationId NULL: aparțin locației implicite.
export function readingScope(location: Pick<LocationRecord, "id" | "userId" | "isDefault">): Prisma.ReadingWhereInput {
  return location.isDefault
    ? { userId: location.userId, OR: [{ locationId: location.id }, { locationId: null }] }
    : { userId: location.userId, locationId: location.id };
}

export function tariffHistoryScope(location: Pick<LocationRecord, "id" | "userId" | "isDefault">): Prisma.TariffHistoryWhereInput {
  return location.isDefault
    ? { userId: location.userId, OR: [{ locationId: location.id }, { locationId: null }] }
    : { userId: location.userId, locationId: location.id };
}

export const locationNotFound = () =>
  Response.json({ error: "Locația nu există." }, { status: 404 });

export function parseLocationFields(payload: Record<string, unknown>) {
  const text = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : undefined;
  return {
    name: text(payload.name, 80),
    address: text(payload.address, 300),
    meterSerial: text(payload.meterSerial, 80)
  };
}
