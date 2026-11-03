import type { User } from "@prisma/client";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { can, homeFor, studentScope, type Permission } from "@/lib/rbac";
import { signToken, verifyToken } from "@/lib/tokens";

export const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export async function getUser(): Promise<User | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  const userId = token ? verifyToken(token, "session") : null;
  return userId ? prisma.user.findUnique({ where: { id: userId } }) : null;
}

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Logged-in user allowed to perform `permission`; others are sent to their own home page. */
export async function requirePermission(permission: Permission): Promise<User> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect(homeFor(user.role));
  return user;
}

/** Guardian profile of the logged-in user, for guardian-only pages and actions. */
export async function requireGuardian(permission: Permission) {
  const user = await requirePermission(permission);
  const guardian = await prisma.guardian.findUniqueOrThrow({ where: { userId: user.id } });
  return { user, guardian };
}

export function startSession(userId: string): void {
  cookies().set(SESSION_COOKIE, signToken(userId, "session", SESSION_TTL_MS), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
}

export async function canAccessStudent(user: User, studentId: string): Promise<boolean> {
  const count = await prisma.student.count({ where: { AND: [{ id: studentId }, studentScope(user)] } });
  return count > 0;
}
