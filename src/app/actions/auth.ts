"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, startSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redeemInvitation, type RedeemError } from "@/lib/invitations";
import { checkPassword } from "@/lib/password";
import { normalizeLogin } from "@/lib/phone";
import { homeFor } from "@/lib/rbac";

export async function login(formData: FormData) {
  const login = normalizeLogin(String(formData.get("login") ?? ""));
  const password = String(formData.get("password") ?? "");
  const user = login ? await prisma.user.findUnique({ where: { login } }) : null;
  if (!user || !checkPassword(password, user.passwordHash)) redirect("/login?error=1");
  startSession(user.id);
  redirect(homeFor(user.role));
}

export async function logout() {
  cookies().delete(SESSION_COOKIE);
  redirect("/login");
}

export type ActivateState = { error?: RedeemError };

export async function activate(_: ActivateState, formData: FormData): Promise<ActivateState> {
  const result = await redeemInvitation({
    code: String(formData.get("code") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (!result.ok) return { error: result.error };
  const user = await prisma.user.findUniqueOrThrow({ where: { id: result.userId } });
  startSession(user.id);
  redirect(homeFor(user.role));
}
