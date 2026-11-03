import { prisma } from "@/lib/db";

// Pickup-person photos are stored in Postgres: the browser resizes them before upload,
// so a school's worth of photos is a few dozen MB and needs no separate file storage.
export async function savePhoto(data: Buffer, contentType: string): Promise<string> {
  const photo = await prisma.photo.create({ data: { data, contentType } });
  return photo.id;
}
