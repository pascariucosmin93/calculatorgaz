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

  const adminUsername = getAdminUsername(ADMIN_EMAIL);
  const [emailMatch, usernameMatch] = await Promise.all([
    prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: { id: true, username: true, email: true }
    }),
    prisma.user.findUnique({
      where: { username: adminUsername },
      select: { id: true, username: true, email: true }
    })
  ]);

  if (emailMatch && usernameMatch && emailMatch.id !== usernameMatch.id) {
    throw new Error(
      `Admin bootstrap conflict: email ${ADMIN_EMAIL} and username ${adminUsername} belong to different users.`
    );
  }

  const existing = emailMatch ?? usernameMatch;
  if (!existing) {
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    await prisma.user.create({
      data: {
        username: adminUsername,
        email: ADMIN_EMAIL,
        ownerName: ADMIN_OWNER_NAME,
        passwordHash
      }
    });
    return;
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: {
      username: adminUsername,
      email: ADMIN_EMAIL,
      ownerName: ADMIN_OWNER_NAME
    }
  });
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
