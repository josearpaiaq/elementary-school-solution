import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { can, ROLES, studentScope, type Permission } from "@/lib/rbac";

describe("permission matrix", () => {
  const expected: Record<Permission, string[]> = {
    "requests:manage": ["ADMIN"],
    "requests:view": ["ADMIN", "TEACHER"],
    "requests:recordPaper": ["ADMIN", "TEACHER"],
    "requests:answer": ["GUARDIAN"],
    "students:import": ["ADMIN"],
    "invitations:guardians": ["ADMIN", "TEACHER"],
    "pickup:deliver": ["ADMIN", "TEACHER"],
    "pickup:approve": ["GUARDIAN"],
    "pickupPeople:manage": ["GUARDIAN"],
    "pass:show": ["GUARDIAN", "PICKUP"],
  };

  for (const [permission, roles] of Object.entries(expected) as [Permission, string[]][]) {
    it(`${permission} is granted only to ${roles.join(", ")}`, () => {
      expect(ROLES.filter((role) => can(role, permission))).toEqual(roles);
    });
  }

  it("denies unknown roles", () => {
    expect(can("HACKER", "requests:view")).toBe(false);
  });
});

describe("studentScope", () => {
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    const user = (login: string, role: string) =>
      prisma.user.create({ data: { login: `rbac-${login}`, name: login, role, passwordHash: "x" } });
    const [teacherA, guardianUser, pickupUser] = await Promise.all([
      user("teacher-a", "TEACHER"),
      user("guardian", "GUARDIAN"),
      user("pickup", "PICKUP"),
    ]);
    const roomA = await prisma.classroom.create({ data: { name: "RBAC A", teacherId: teacherA.id } });
    const roomB = await prisma.classroom.create({ data: { name: "RBAC B" } });
    const guardian = await prisma.guardian.create({ data: { name: "G", phone: "+525599990001", userId: guardianUser.id } });
    const child = await prisma.student.create({
      data: { name: "Child", classroomId: roomA.id, guardians: { create: { guardianId: guardian.id } } },
    });
    const sibling = await prisma.student.create({
      data: { name: "Sibling", classroomId: roomB.id, guardians: { create: { guardianId: guardian.id } } },
    });
    const stranger = await prisma.student.create({ data: { name: "Stranger", classroomId: roomA.id } });
    await prisma.pickupPerson.create({
      data: {
        name: "Abuela",
        relationship: "Abuela",
        userId: pickupUser.id,
        addedByGuardianId: guardian.id,
        authorizations: { create: { studentId: child.id } },
      },
    });
    Object.assign(ids, {
      teacherA: teacherA.id,
      guardian: guardianUser.id,
      pickup: pickupUser.id,
      child: child.id,
      sibling: sibling.id,
      stranger: stranger.id,
    });
  });

  const visible = async (id: string, role: string) => {
    const students = await prisma.student.findMany({
      where: { AND: [studentScope({ id, role }), { id: { in: [ids.child, ids.sibling, ids.stranger] } }] },
      orderBy: { name: "asc" },
    });
    return students.map((s) => s.name);
  };

  it("lets a teacher see only their classroom", async () => {
    expect(await visible(ids.teacherA, "TEACHER")).toEqual(["Child", "Stranger"]);
  });

  it("lets a guardian see only their children, across classrooms", async () => {
    expect(await visible(ids.guardian, "GUARDIAN")).toEqual(["Child", "Sibling"]);
  });

  it("lets a pickup person see only the children they are authorized for", async () => {
    expect(await visible(ids.pickup, "PICKUP")).toEqual(["Child"]);
  });

  it("lets the admin see everyone and unknown roles no one", async () => {
    expect(await visible("any", "ADMIN")).toEqual(["Child", "Sibling", "Stranger"]);
    expect(await visible(ids.guardian, "HACKER")).toEqual([]);
  });
});
