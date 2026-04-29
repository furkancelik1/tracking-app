/**
 * Playwright Global Setup — DB-backed auth injection
 *
 * Strategy: use NextAuth's database session strategy directly.
 * We upsert test users in the DB, create real Session rows with known
 * UUIDs, then write Playwright storage-state files containing only the
 * session cookie. Tests load these files via test.use({ storageState })
 * to skip the entire OAuth flow.
 *
 * Session cookie name in HTTP (dev/test): "next-auth.session-token"
 * Session cookie name in HTTPS (prod):    "__Secure-next-auth.session-token"
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

const FIXTURES_DIR = path.join(__dirname, "fixtures");
const SESSION_COOKIE = "next-auth.session-token";
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1_000;

const USERS = [
  {
    key: "userA",
    email: "e2e-user-a@test.local",
    name: "E2E User A",
    tier: "FREE" as const,
  },
  {
    key: "userB",
    email: "e2e-user-b@test.local",
    name: "E2E User B",
    tier: "FREE" as const,
  },
  {
    key: "freeUser",
    email: "e2e-free@test.local",
    name: "E2E Free User",
    tier: "FREE" as const,
  },
  {
    key: "proUser",
    email: "e2e-pro@test.local",
    name: "E2E Pro User",
    tier: "PRO" as const,
  },
] as const;

function writeStorageState(token: string, expires: Date, file: string) {
  const state = {
    cookies: [
      {
        name: SESSION_COOKIE,
        value: token,
        domain: "localhost",
        path: "/",
        expires: Math.floor(expires.getTime() / 1_000),
        httpOnly: true,
        secure: false,
        sameSite: "Lax" as const,
      },
    ],
    origins: [],
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(state, null, 2));
}

export default async function globalSetup() {
  if (!process.env.DATABASE_URL) {
    throw new Error("[E2E Setup] DATABASE_URL is not set. Check your .env file.");
  }

  const prisma = new PrismaClient();

  try {
    for (const def of USERS) {
      // 1. Upsert test user
      const user = await prisma.user.upsert({
        where: { email: def.email },
        update: { subscriptionTier: def.tier, name: def.name },
        create: {
          email: def.email,
          name: def.name,
          subscriptionTier: def.tier,
        },
      });

      // 2. Remove stale sessions for this user
      await prisma.session.deleteMany({ where: { userId: user.id } });

      // 3. Create a fresh session with a known token
      const token = randomUUID();
      const expires = new Date(Date.now() + ONE_WEEK_MS);
      await prisma.session.create({
        data: { sessionToken: token, userId: user.id, expires },
      });

      // 4. Write Playwright storage-state file
      const outPath = path.join(FIXTURES_DIR, `storage-state-${def.key}.json`);
      writeStorageState(token, expires, outPath);

      console.log(`[E2E Setup] ${def.key} (${def.tier}) → ${outPath}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}
