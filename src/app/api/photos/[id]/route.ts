import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { studentScope } from "@/lib/rbac";
import { contentType, readStoredFile } from "@/lib/storage";

/**
 * A pickup person's photo is visible to the person themself and to anyone who can
 * see one of the students they are authorized for (staff in scope and the family).
 */
export async function GET(_: Request, { params }: { params: { id: string } }) {
  const user = await getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const person = await prisma.pickupPerson.findFirst({
    where: {
      id: params.id,
      OR: [{ userId: user.id }, { authorizations: { some: { student: studentScope(user) } } }],
    },
  });
  if (!person?.photoKey) return new Response("Not found", { status: 404 });

  const data = await readStoredFile(person.photoKey);
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType(person.photoKey),
      "Cache-Control": "private, max-age=300",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
