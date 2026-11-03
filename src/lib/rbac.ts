import type { Prisma } from "@prisma/client";

export const ROLES = ["ADMIN", "TEACHER", "GUARDIAN", "PICKUP"] as const;
export type Role = (typeof ROLES)[number];

/** Which roles may perform each action. Data-level limits are applied by `studentScope`. */
const PERMISSIONS = {
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
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: string, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export type Actor = { id: string; role: string };

/**
 * Students an actor may see. Every student lookup goes through this filter:
 * teachers see their classrooms, guardians their children, pickup people the
 * children they are authorized for.
 */
export function studentScope(actor: Actor): Prisma.StudentWhereInput {
  switch (actor.role) {
    case "ADMIN":
      return {};
    case "TEACHER":
      return { classroom: { teacherId: actor.id } };
    case "GUARDIAN":
      return { guardians: { some: { guardian: { userId: actor.id } } } };
    case "PICKUP":
      return { pickupAuthorizations: { some: { pickupPerson: { userId: actor.id } } } };
    default:
      return { id: { in: [] } };
  }
}

export function classroomScope(actor: Actor): Prisma.ClassroomWhereInput {
  return actor.role === "ADMIN" ? {} : actor.role === "TEACHER" ? { teacherId: actor.id } : { id: { in: [] } };
}

const HOME: Record<Role, string> = { ADMIN: "/dashboard", TEACHER: "/dashboard", GUARDIAN: "/family", PICKUP: "/pass" };

export function homeFor(role: string): string {
  return HOME[role as Role] ?? "/login";
}
