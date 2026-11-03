import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { hashPassword, checkPassword } from "@/lib/password";
import { normalizePhone } from "@/lib/phone";

// 32 symbols (no 0/O/1/I) so every random byte maps to a symbol without bias.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const INVITATION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
export const MIN_PASSWORD_LENGTH = 8;

export function generateCode(): string {
  const chars = Array.from(randomBytes(8), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${chars.slice(0, 4)}-${chars.slice(4)}`;
}

/** Accepts codes typed in lowercase, with spaces or without the dash. */
export function normalizeCode(input: string): string {
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length === 8 ? `${cleaned.slice(0, 4)}-${cleaned.slice(4)}` : cleaned;
}

/** Only the hash is stored; the plain code is shown once to whoever generates it. */
export function hashCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex");
}

type Target = { guardianId: string } | { pickupPersonId: string };

/** Creates a new code for a guardian or pickup person, replacing their unused ones. */
export async function createInvitation(target: Target, createdById: string, now = new Date()): Promise<string> {
  const code = generateCode();
  await prisma.$transaction([
    prisma.invitation.deleteMany({ where: { ...target, usedAt: null } }),
    prisma.invitation.create({
      data: {
        ...target,
        role: "guardianId" in target ? "GUARDIAN" : "PICKUP",
        codeHash: hashCode(code),
        createdById,
        expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
      },
    }),
  ]);
  return code;
}

export type RedeemError = "invalidCode" | "phoneMismatch" | "invalidPhone" | "weakPassword" | "phoneTaken";
export type RedeemResult = { ok: true; userId: string } | { ok: false; error: RedeemError };

/**
 * Turns an invitation into an account. The phone acts as a second factor: it must
 * match the one the school (or the guardian) registered, and becomes the login.
 * A pickup person invited by two families reuses their account by entering the same password.
 */
export async function redeemInvitation(
  input: { code: string; phone: string; password: string },
  now = new Date(),
): Promise<RedeemResult> {
  const invitation = await prisma.invitation.findUnique({
    where: { codeHash: hashCode(input.code) },
    include: { guardian: true, pickupPerson: true },
  });
  if (!invitation || invitation.usedAt || invitation.expiresAt < now) return { ok: false, error: "invalidCode" };

  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, error: "invalidPhone" };
  if (input.password.length < MIN_PASSWORD_LENGTH) return { ok: false, error: "weakPassword" };

  const { guardian, pickupPerson } = invitation;
  const expectedPhone = guardian?.phone ?? pickupPerson?.phone;
  if (expectedPhone && expectedPhone !== phone) return { ok: false, error: "phoneMismatch" };
  if (guardian?.userId || pickupPerson?.userId) return { ok: false, error: "invalidCode" };

  const existing = await prisma.user.findUnique({ where: { login: phone } });
  if (existing && (existing.role !== invitation.role || !checkPassword(input.password, existing.passwordHash))) {
    return { ok: false, error: "phoneTaken" };
  }

  return prisma.$transaction(async (tx) => {
    // Claiming with `usedAt: null` makes concurrent redemptions of the same code fail.
    const claimed = await tx.invitation.updateMany({ where: { id: invitation.id, usedAt: null }, data: { usedAt: now } });
    if (claimed.count === 0) return { ok: false, error: "invalidCode" } as const;

    const user =
      existing ??
      (await tx.user.create({
        data: {
          login: phone,
          name: guardian?.name ?? pickupPerson!.name,
          role: invitation.role,
          passwordHash: hashPassword(input.password),
        },
      }));
    if (guardian) await tx.guardian.update({ where: { id: guardian.id }, data: { userId: user.id } });
    if (pickupPerson) {
      await tx.pickupPerson.update({ where: { id: pickupPerson.id }, data: { userId: user.id, phone } });
    }
    return { ok: true, userId: user.id } as const;
  });
}
