import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD ?? "").trim();
const ADMIN_OWNER_NAME = "Administrator";

let bootstrapPromise: Promise<void> | null = null;

function getAdminUsername(email: string) {
  return email;
}

async function bootstrapAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return;
  }

  const existing = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true }
  });

  if (existing) {
    return;
  }

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await prisma.user.create({
    data: {
      username: getAdminUsername(ADMIN_EMAIL),
      email: ADMIN_EMAIL,
      ownerName: ADMIN_OWNER_NAME,
      passwordHash
    }
  });

  console.log(`Bootstrapped admin user ${ADMIN_EMAIL}`);
}

export async function ensureAdminUser() {
  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = bootstrapAdminUser().catch((error) => {
    bootstrapPromise = null;
    throw error;
  });

  return bootstrapPromise;
}
