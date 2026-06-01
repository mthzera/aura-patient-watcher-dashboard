/**
 * Storage abstraction for uploaded files.
 *
 * On Vercel the function filesystem (`/var/task`) is READ-ONLY — only `/tmp`
 * is writable, and even that is ephemeral and not shared across invocations.
 * So we persist uploads in Vercel Blob when a token is configured.
 *
 * In local development (no BLOB_READ_WRITE_TOKEN) we fall back to writing under
 * ./data so the normal dev workflow keeps working without extra setup.
 */

import { put, list } from "@vercel/blob";
import { mkdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const token = process.env.BLOB_READ_WRITE_TOKEN;
const useBlob = Boolean(token);

// On Vercel/Lambda the function filesystem is read-only. If we ever reach the
// local-fs fallback there, a write fails with a cryptic EROFS. Detect it and
// surface an actionable message instead.
const isServerless = Boolean(
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
);

const LOCAL_DIR = path.join(process.cwd(), "data");
const localPath = (name: string) => path.join(LOCAL_DIR, name);

/** Persist a file under a stable, overwritable name. */
export async function saveFile(
  name: string,
  body: Buffer | string,
  contentType: string
): Promise<void> {
  if (!useBlob && isServerless) {
    throw new Error(
      "Armazenamento não configurado: a env BLOB_READ_WRITE_TOKEN não está " +
        "disponível nesta função. Crie um Vercel Blob store, conecte ao projeto " +
        "e faça um Redeploy. O filesystem da função é somente-leitura."
    );
  }

  if (useBlob) {
    await put(name, body, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType,
      token,
    });
    return;
  }

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(localPath(name), body);
}

/** Read a file back as a Buffer, or null if it doesn't exist. */
export async function readFileMaybe(name: string): Promise<Buffer | null> {
  if (useBlob) {
    const match = await findBlob(name);
    if (!match) return null;
    const res = await fetch(match.url, { cache: "no-store" });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  }

  if (!existsSync(localPath(name))) return null;
  return readFile(localPath(name));
}

/** Cheap existence check that avoids downloading the blob contents. */
export async function fileExists(name: string): Promise<boolean> {
  if (useBlob) {
    return (await findBlob(name)) !== null;
  }
  return existsSync(localPath(name));
}

async function findBlob(name: string) {
  const { blobs } = await list({ prefix: name, limit: 1000, token });
  return blobs.find((b) => b.pathname === name) ?? null;
}
