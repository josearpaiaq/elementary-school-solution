import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { createInvitation, generateCode, INVITATION_TTL_MS, normalizeCode, redeemInvitation } from "@/lib/invitations";
import { checkPassword } from "@/lib/password";

describe("invitation codes", () => {
  it("look like XXXX-XXXX without ambiguous characters", () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  });

  it("accept lowercase, spaces and a missing dash", () => {
    expect(normalizeCode(" abcd efgh ")).toBe("ABCD-EFGH");
    expect(normalizeCode("abcdefgh")).toBe("ABCD-EFGH");
  });
});

describe("redeemInvitation", () => {
  let adminId: string;
  let guardianId: string;
  let familyAId: string;
  let familyBId: string;

  beforeAll(async () => {
    adminId = (await prisma.user.create({ data: { login: "inv-admin", name: "A", role: "ADMIN", passwordHash: "x" } })).id;
    guardianId = (await prisma.guardian.create({ data: { name: "Laura", phone: "+525588880001" } })).id;
    familyAId = (await prisma.guardian.create({ data: { name: "Familia A", phone: "+525588880002" } })).id;
    familyBId = (await prisma.guardian.create({ data: { name: "Familia B", phone: "+525588880003" } })).id;
  });

  it("creates a guardian account when code and phone match, and the code works once", async () => {
    const code = await createInvitation({ guardianId }, adminId);
    expect(await redeemInvitation({ code, phone: "55 8888 0009", password: "secreto123" })).toEqual({
      ok: false,
      error: "phoneMismatch",
    });

    const result = await redeemInvitation({ code: code.toLowerCase(), phone: "5588880001", password: "secreto123" });
    expect(result.ok).toBe(true);
    const guardian = await prisma.guardian.findUniqueOrThrow({ where: { id: guardianId }, include: { user: true } });
    expect(guardian.user?.role).toBe("GUARDIAN");
    expect(guardian.user?.login).toBe("+525588880001");
    expect(checkPassword("secreto123", guardian.user!.passwordHash)).toBe(true);

    expect(await redeemInvitation({ code, phone: "5588880001", password: "secreto123" })).toEqual({
      ok: false,
      error: "invalidCode",
    });
  });

  it("rejects expired codes, replaced codes and short passwords", async () => {
    const past = new Date(Date.now() - INVITATION_TTL_MS - 1000);
    const expired = await createInvitation({ guardianId: familyAId }, adminId, past);
    expect((await redeemInvitation({ code: expired, phone: "5588880002", password: "secreto123" })).ok).toBe(false);

    const first = await createInvitation({ guardianId: familyAId }, adminId);
    const second = await createInvitation({ guardianId: familyAId }, adminId);
    expect(await redeemInvitation({ code: first, phone: "5588880002", password: "secreto123" })).toEqual({
      ok: false,
      error: "invalidCode",
    });
    expect(await redeemInvitation({ code: second, phone: "5588880002", password: "corta" })).toEqual({
      ok: false,
      error: "weakPassword",
    });
  });

  it("links a pickup person invited by two families to the same account", async () => {
    const personA = await prisma.pickupPerson.create({
      data: { name: "Abuela", relationship: "Abuela", phone: "+525577770001", addedByGuardianId: familyAId },
    });
    const personB = await prisma.pickupPerson.create({
      data: { name: "Abuela", relationship: "Abuela", phone: "+525577770001", addedByGuardianId: familyBId },
    });

    const codeA = await createInvitation({ pickupPersonId: personA.id }, adminId);
    const first = await redeemInvitation({ code: codeA, phone: "5577770001", password: "abuela1234" });
    expect(first.ok).toBe(true);

    const codeB = await createInvitation({ pickupPersonId: personB.id }, adminId);
    expect(await redeemInvitation({ code: codeB, phone: "5577770001", password: "otra-clave" })).toEqual({
      ok: false,
      error: "phoneTaken",
    });
    const second = await redeemInvitation({ code: codeB, phone: "5577770001", password: "abuela1234" });
    expect(second).toEqual(first);

    const linked = await prisma.pickupPerson.findMany({ where: { id: { in: [personA.id, personB.id] } } });
    expect(linked.every((p) => first.ok && p.userId === first.userId)).toBe(true);
  });
});
