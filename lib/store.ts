import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { AppData, AuditEvent } from "./domain";

const file = path.join(process.cwd(), "data", "foxscan.json");
const empty = (): AppData => ({ tenants: [], users: [], sessions: [], invitations: [], buildings: [], boqItems: [], projects: [], activities: [], stages: [], invoices: [], payments: [], deviceRegistrations: [], dlpCases: [], warranties: [], disputes: [], notifications: [], siteUpdates: [], delays: [], documents: [], audits: [], activityComments: [], quotations: [], holidays: [] });

export async function getData(): Promise<AppData> {
  try {
    return { ...empty(), ...JSON.parse(await readFile(file, "utf8")) } as AppData;
  } catch {
    return empty();
  }
}

// Serializes every write so concurrent requests can never interleave two
// writes into a corrupt file, and writes land via temp-file+rename so a
// crash mid-write can never truncate the store.
let writeQueue: Promise<unknown> = Promise.resolve();

async function atomicWrite(data: AppData) {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${randomUUID()}`;
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, file);
}

export async function saveData(data: AppData) {
  const next = writeQueue.then(() => atomicWrite(data));
  writeQueue = next.catch(() => undefined);
  return next;
}

// For call sites that need the full read-modify-write to be atomic with
// respect to other requests (not just the write itself): acquires the same
// queue, re-reads fresh data, runs the mutation, then saves before releasing.
export async function withDataLock<T>(fn: (data: AppData) => Promise<T> | T): Promise<T> {
  const run = writeQueue.then(async () => {
    const data = await getData();
    const result = await fn(data);
    await atomicWrite(data);
    return result;
  });
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}

export async function audit(data: AppData, input: Omit<AuditEvent, "id" | "createdAt" | "hash">) {
  const createdAt = new Date().toISOString();
  const payload = JSON.stringify({ ...input, createdAt });
  data.audits.push({ ...input, id: randomUUID(), createdAt, hash: createHash("sha256").update(payload).digest("hex") });
}

export const id = () => randomUUID();
