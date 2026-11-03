"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createInvitation } from "@/lib/invitations";
import { normalizePhone } from "@/lib/phone";
import { saveFile } from "@/lib/storage";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_EXTENSIONS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const personSchema = z.object({
  name: z.string().trim().min(2).max(80),
  relationship: z.string().trim().min(2).max(40),
  phone: z.string().transform((value, ctx) => {
    const phone = normalizePhone(value);
    if (!phone) ctx.addIssue({ code: "custom" });
    return phone ?? "";
  }),
});

export type PeopleState = { code?: string; personName?: string; error?: boolean };

class InvalidInput extends Error {}

async function savePhoto(file: FormDataEntryValue | null): Promise<string | undefined> {
  if (!(file instanceof File) || file.size === 0) return undefined;
  const ext = PHOTO_EXTENSIONS[file.type];
  if (!ext || file.size > MAX_PHOTO_BYTES) throw new InvalidInput();
  return saveFile(Buffer.from(await file.arrayBuffer()), ext);
}

async function parsePerson(formData: FormData) {
  const parsed = personSchema.safeParse({
    name: formData.get("name"),
    relationship: formData.get("relationship"),
    phone: formData.get("phone") ?? "",
  });
  if (!parsed.success) throw new InvalidInput();
  return { ...parsed.data, photoKey: await savePhoto(formData.get("photo")) };
}

/** The guardian's own children among the submitted ids; anything else is ignored. */
async function ownChildren(guardianId: string, studentIds: string[]): Promise<string[]> {
  const links = await prisma.studentGuardian.findMany({ where: { guardianId, studentId: { in: studentIds } } });
  return links.map((l) => l.studentId);
}

/** People a guardian may edit: authorized for at least one of their children, or added by them. */
async function findManageablePerson(guardianId: string, personId: string) {
  return prisma.pickupPerson.findFirst({
    where: {
      id: personId,
      OR: [
        { addedByGuardianId: guardianId },
        { authorizations: { some: { student: { guardians: { some: { guardianId } } } } } },
      ],
    },
  });
}

async function guarded(action: () => Promise<PeopleState>): Promise<PeopleState> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof InvalidInput) return { error: true };
    throw error;
  }
}

export async function addPickupPerson(_: PeopleState, formData: FormData): Promise<PeopleState> {
  const { user, guardian } = await requireGuardian("pickupPeople:manage");
  return guarded(async () => {
    const studentIds = await ownChildren(guardian.id, formData.getAll("studentIds").map(String));
    if (studentIds.length === 0) throw new InvalidInput();
    const data = await parsePerson(formData);
    const person = await prisma.pickupPerson.create({
      data: {
        ...data,
        addedByGuardianId: guardian.id,
        authorizations: { create: studentIds.map((studentId) => ({ studentId })) },
      },
    });
    const code = await createInvitation({ pickupPersonId: person.id }, user.id);
    revalidatePath("/family/people");
    return { code, personName: person.name };
  });
}

export async function updatePickupPerson(_: PeopleState, formData: FormData): Promise<PeopleState> {
  const { guardian } = await requireGuardian("pickupPeople:manage");
  return guarded(async () => {
    const person = await findManageablePerson(guardian.id, String(formData.get("personId")));
    if (!person) throw new Error("Forbidden");
    const { phone, ...data } = await parsePerson(formData);
    // Once the person has an account their phone is their login, so it can't change here.
    await prisma.pickupPerson.update({ where: { id: person.id }, data: person.userId ? data : { ...data, phone } });

    // Only the guardian's own children are touched; other families' authorizations stay.
    const children = await prisma.studentGuardian.findMany({ where: { guardianId: guardian.id } });
    const selected = await ownChildren(guardian.id, formData.getAll("studentIds").map(String));
    await prisma.$transaction([
      prisma.pickupAuthorization.deleteMany({
        where: { pickupPersonId: person.id, studentId: { in: children.map((c) => c.studentId) } },
      }),
      ...selected.map((studentId) =>
        prisma.pickupAuthorization.create({ data: { pickupPersonId: person.id, studentId } }),
      ),
    ]);
    revalidatePath("/family/people");
    return {};
  });
}

export async function removePickupPerson(personId: string) {
  const { guardian } = await requireGuardian("pickupPeople:manage");
  const person = await findManageablePerson(guardian.id, personId);
  if (!person) throw new Error("Forbidden");
  await prisma.pickupAuthorization.deleteMany({
    where: { pickupPersonId: person.id, student: { guardians: { some: { guardianId: guardian.id } } } },
  });
  revalidatePath("/family/people");
}

export async function newPickupInvitation(personId: string, _: PeopleState): Promise<PeopleState> {
  const { user, guardian } = await requireGuardian("pickupPeople:manage");
  const person = await findManageablePerson(guardian.id, personId);
  if (!person || person.userId) throw new Error("Forbidden");
  return { code: await createInvitation({ pickupPersonId: person.id }, user.id), personName: person.name };
}
