import { createHmac } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { studentScope } from "@/lib/rbac";
import { getSecret, signToken, verifyToken } from "@/lib/tokens";

/** Pass codes change every 5 minutes, so a screenshot stops working quickly. */
export const PASS_WINDOW_MS = 5 * 60 * 1000;

export function passCode(userId: string, now = Date.now(), key = getSecret()): string {
  const window = Math.floor(now / PASS_WINDOW_MS);
  const digest = createHmac("sha256", key).update(`pass:${userId}:${window}`).digest();
  return String(digest.readUInt32BE(0) % 1_000_000).padStart(6, "0");
}

/** Accepts the current and the previous window, so a code read at the boundary still works. */
export function matchesPassCode(userId: string, code: string, now = Date.now(), key = getSecret()): boolean {
  return [0, 1].some((back) => passCode(userId, now - back * PASS_WINDOW_MS, key) === code);
}

/** Token embedded in the QR; it expires with the code window. */
export function passToken(userId: string, now = Date.now()): string {
  return signToken(userId, "pass", PASS_WINDOW_MS, now);
}

/** Pass holders (guardians and pickup people with an account) of students the teacher can see. */
async function holdersInScope(teacher: User) {
  const scope = studentScope(teacher);
  return prisma.user.findMany({
    where: {
      OR: [
        { role: "GUARDIAN", guardian: { students: { some: { student: scope } } } },
        { role: "PICKUP", pickupPeople: { some: { authorizations: { some: { student: scope } } } } },
      ],
    },
  });
}

/**
 * Resolves a typed 6-digit code or a scanned QR token to its holder, plus the
 * students that holder may take home among those the teacher can see.
 */
export async function resolvePass(credential: string, teacher: User, now = Date.now()) {
  const value = credential.trim();
  let holder: User | null = null;
  if (/^\d{6}$/.test(value)) {
    holder = (await holdersInScope(teacher)).find((u) => matchesPassCode(u.id, value, now)) ?? null;
  } else {
    const userId = verifyToken(value, "pass", now);
    holder = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  }
  if (!holder || (holder.role !== "GUARDIAN" && holder.role !== "PICKUP")) return null;

  const students = await prisma.student.findMany({
    where: { AND: [studentScope(teacher), studentScope(holder)] },
    include: { classroom: true },
    orderBy: { name: "asc" },
  });
  if (students.length === 0) return null;

  const pickupPeople =
    holder.role === "PICKUP"
      ? await prisma.pickupPerson.findMany({ where: { userId: holder.id }, include: { authorizations: true } })
      : [];
  return { holder, students, pickupPeople };
}
