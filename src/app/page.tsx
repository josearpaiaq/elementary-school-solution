import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { homeFor } from "@/lib/rbac";

export default async function Home() {
  const user = await getUser();
  redirect(user ? homeFor(user.role) : "/login");
}
