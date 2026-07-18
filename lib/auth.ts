import { createHash, randomBytes } from "crypto";
import { addHours } from "date-fns";
import type { AppData, Role, Session, User } from "./domain";
import { id } from "./store";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function issueOtp(data: AppData, identifier: string) { const code = process.env.NODE_ENV === "production" ? String(Math.floor(100000 + Math.random() * 900000)) : "123456"; const token = `otp.${randomBytes(24).toString("hex")}`; data.sessions = data.sessions.filter(s => !s.token.startsWith("otp.")); data.sessions.push({ token: `${token}:${hash(code)}:${identifier}`, userId: "", expiresAt: addHours(new Date(), 0.25).toISOString() }); return { code, token }; }
export function verifyOtp(data: AppData, identifier: string, code: string): { user: User; session: Session } {
 const pending = data.sessions.find(s => s.token.startsWith("otp.") && s.token.endsWith(`:${identifier}`) && new Date(s.expiresAt) > new Date()); if (!pending || pending.token.split(":")[1] !== hash(code)) throw new Error("Invalid or expired one-time password.");
 const user = data.users.find(u => u.email === identifier || u.phone === identifier); if (!user || !user.active) throw new Error("No active user is registered for this identifier."); const session = { token: `fs_${randomBytes(32).toString("hex")}`, userId: user.id, expiresAt: addHours(new Date(), 24).toISOString() }; data.sessions = data.sessions.filter(s => s !== pending); data.sessions.push(session); return { user, session };
}
export function currentUser(data: AppData, authorization: string | null) { const token = authorization?.replace("Bearer ", ""); const session = data.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date()); if (!session) throw new Error("Authentication required."); const user = data.users.find(u => u.id === session.userId && u.active); if (!user) throw new Error("Session user is not active."); return user; }
export function requireRole(user: User, allowed: Role[]) { if (!allowed.includes(user.role)) throw new Error("You do not have permission for this action."); }
export function invite(data: AppData, actor: User, input: { email?: string; phone?: string; role: Role; projectId?: string }) { const invitation = { id: id(), tenantId: actor.tenantId, ...input, token: randomBytes(24).toString("hex"), expiresAt: addHours(new Date(), 72).toISOString(), createdBy: actor.id, createdAt: new Date().toISOString() }; data.invitations.push(invitation); return invitation; }
