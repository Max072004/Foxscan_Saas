import { createHash, randomBytes } from "crypto";
import { addDays, addHours } from "date-fns";
import type { AppData, Project, Role, Session, User } from "./domain";
import { id } from "./store";


const INVITE_PERMISSIONS: Record<Role, Role[]> = {
  ADMIN: ["ADMIN", "CONTRACTOR", "MANUFACTURER", "CONSULTANT", "CLIENT"],
  CONTRACTOR: ["CONSULTANT", "CLIENT", "MANUFACTURER"],
  CONSULTANT: ["CONTRACTOR", "CLIENT"],
  MANUFACTURER: [],
  CLIENT: [],
};

const PROJECT_ROLE_FIELD: Partial<Record<Role, keyof Project>> = {
  CONTRACTOR: "contractorId",
  MANUFACTURER: "manufacturerId",
  CONSULTANT: "consultantId",
  CLIENT: "clientId",
};
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
export function issueOtp(data: AppData, rawIdentifier: string) {
  const identifier = rawIdentifier.trim().toLowerCase();
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const token = `otp.${randomBytes(24).toString("hex")}`;
  data.sessions = data.sessions.filter(s => !s.token.startsWith("otp.") || !s.token.endsWith(`:${identifier}`));
  data.sessions.push({ token: `${token}:${hash(code)}:${identifier}`, userId: "", expiresAt: addHours(new Date(), 0.25).toISOString() });
  return { code, token };
}
export function verifyOtp(data: AppData, rawIdentifier: string, code: string): { user: User; session: Session } {
  const identifier = rawIdentifier.trim().toLowerCase();
  const pending = data.sessions.find(s => s.token.startsWith("otp.") && s.token.endsWith(`:${identifier}`) && new Date(s.expiresAt) > new Date());
  if (!pending || pending.token.split(":")[1] !== hash(code.trim())) throw new Error("Invalid or expired one-time password.");
  const user = data.users.find(u => (u.email && u.email.toLowerCase() === identifier) || (u.phone && u.phone.toLowerCase() === identifier));
  if (!user || !user.active) throw new Error("No active user is registered for this identifier.");
  const session = { token: `fs_${randomBytes(32).toString("hex")}`, userId: user.id, expiresAt: addDays(new Date(), 30).toISOString() };
  data.sessions = data.sessions.filter(s => s !== pending);
  data.sessions.push(session);
  return { user, session };
}
export function currentUser(data: AppData, authorization: string | null) { const token = authorization?.replace("Bearer ", ""); const session = data.sessions.find(s => s.token === token && new Date(s.expiresAt) > new Date()); if (!session) throw new Error("Authentication required."); const user = data.users.find(u => u.id === session.userId && u.active); if (!user) throw new Error("Session user is not active."); return user; }
export function requireRole(user: User, allowed: Role[]) { if (!allowed.includes(user.role)) throw new Error("You do not have permission for this action."); }
export function invite(data: AppData, actor: User, input: { email?: string; phone?: string; name?: string; role: Role; projectId?: string }): { user: User; project?: Project } {
  const allowedRoles = INVITE_PERMISSIONS[actor.role];
  if (!allowedRoles.includes(input.role)) {
    throw new Error(`${actor.role} cannot invite a ${input.role}.`);
  }

  const email = input.email?.trim().toLowerCase();
  if (!email) throw new Error("An email is required to invite someone.");
  if (data.users.some(u => u.email.toLowerCase() === email)) {
    throw new Error("A user with this email already exists.");
  }

  let project: Project | undefined;
  if (actor.role === "ADMIN") {
    if (input.projectId) {
      project = data.projects.find(p => p.id === input.projectId && p.tenantId === actor.tenantId);
      if (!project) throw new Error("Project not found.");
    }
  } else {
    if (!input.projectId) throw new Error("A project is required for this invite.");
    project = data.projects.find(p => p.id === input.projectId && p.tenantId === actor.tenantId);
    if (!project) throw new Error("Project not found.");
    const ownsProject =
      (actor.role === "CONTRACTOR" && project.contractorId === actor.id) ||
      (actor.role === "CONSULTANT" && project.consultantId === actor.id);
    if (!ownsProject) throw new Error("You can only invite people to your own project.");
  }

  const user: User = {
    id: id(),
    tenantId: actor.tenantId,
    name: input.name?.trim() || email.split("@")[0],
    email,
    phone: input.phone?.trim() || undefined,
    role: input.role,
    active: true,
  };
  data.users.push(user);

  if (project) {
    const field = PROJECT_ROLE_FIELD[input.role];
    if (field) (project as any)[field] = user.id;
  }

  data.invitations.push({
    id: id(),
    tenantId: actor.tenantId,
    email,
    phone: input.phone?.trim(),
    role: input.role,
    projectId: project?.id,
    token: randomBytes(24).toString("hex"),
    expiresAt: addHours(new Date(), 72).toISOString(),
    acceptedAt: new Date().toISOString(),
    createdBy: actor.id,
    createdAt: new Date().toISOString(),
  });

  return { user, project };
}
