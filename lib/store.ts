import { createHash, randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { AppData, AuditEvent } from "./domain";

const file = path.join(process.cwd(), "data", "foxscan.json");
const empty = (): AppData => ({ tenants: [], users: [], sessions: [], invitations: [], buildings: [], boqItems: [], projects: [], activities: [], stages: [], invoices: [], payments: [], deviceRegistrations: [], dlpCases: [], warranties: [], disputes: [], notifications: [], siteUpdates: [], delays: [], documents: [], audits: [], activityComments: [], quotations: [], holidays: [] });
export async function getData(): Promise<AppData> { try { return { ...empty(), ...JSON.parse(await readFile(file, "utf8")) } as AppData; } catch { return empty(); } }
export async function saveData(data: AppData) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, JSON.stringify(data, null, 2), "utf8"); }
export async function audit(data: AppData, input: Omit<AuditEvent, "id" | "createdAt" | "hash">) {
 const createdAt = new Date().toISOString(); const payload = JSON.stringify({ ...input, createdAt });
 data.audits.push({ ...input, id: randomUUID(), createdAt, hash: createHash("sha256").update(payload).digest("hex") });
}
export const id = () => randomUUID();
