import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Local-disk storage. Swap these functions for an S3 client in production.
const ROOT = path.join(process.cwd(), "storage");
const KEY_PATTERN = /^[\w-]+\.(jpg|png|webp|svg)$/;

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
};

export async function saveFile(data: Buffer, ext: string): Promise<string> {
  const key = `${randomUUID()}.${ext}`;
  if (!KEY_PATTERN.test(key)) throw new Error(`Unsupported extension: ${ext}`);
  await mkdir(ROOT, { recursive: true });
  await writeFile(path.join(ROOT, key), data);
  return key;
}

export async function readStoredFile(key: string): Promise<Buffer> {
  if (!KEY_PATTERN.test(key)) throw new Error("Invalid storage key");
  return readFile(path.join(ROOT, key));
}

export function contentType(key: string): string {
  return CONTENT_TYPES[key.split(".").pop() ?? ""] ?? "application/octet-stream";
}
