import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";

// Photos go to Vercel Blob when BLOB_READ_WRITE_TOKEN is set (production) and to
// ./storage otherwise (local development). The key is the blob URL or the local
// file name; it is never sent to the browser, which always goes through /api/photos.
const ROOT = path.join(process.cwd(), "storage");
const LOCAL_KEY_PATTERN = /^[\w-]+\.(jpg|png|webp|svg)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
};

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function saveFile(data: Buffer, ext: string): Promise<string> {
  const name = `${randomUUID()}.${ext}`;
  if (!LOCAL_KEY_PATTERN.test(name)) throw new Error(`Unsupported extension: ${ext}`);
  if (blobEnabled()) {
    const blob = await put(`photos/${name}`, data, { access: "public", contentType: CONTENT_TYPES[ext] });
    return blob.url;
  }
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, name), data);
  return name;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  if (key.startsWith("https://")) {
    const res = await fetch(key);
    if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  if (!LOCAL_KEY_PATTERN.test(key)) throw new Error("Invalid storage key");
  return readFile(path.join(ROOT, key));
}

export function contentType(key: string): string {
  return CONTENT_TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream";
}
