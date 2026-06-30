import prisma from "./db";
import type { OverrideType, PassStatus, VisitType } from "@prisma/client";
import { generatePassSecret } from "./qr";

export async function logAudit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId?: string,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      actorId: actorId ?? undefined,
      action,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : undefined,
    },
  });
}

export async function createVisitorPass(data: {
  visitorName: string;
  visitorPhone: string;
  purpose: string;
  hostId?: string;
  visitType?: VisitType;
  expectedArrival?: Date;
  validHours?: number;
  organization?: string;
  status?: PassStatus;
}) {
  const validUntil = new Date();
  validUntil.setHours(validUntil.getHours() + (data.validHours ?? 8));

  const pass = await prisma.visitorPass.create({
    data: {
      visitorName: data.visitorName,
      visitorPhone: data.visitorPhone.replace(/\D/g, "").slice(-10),
      purpose: data.purpose,
      hostId: data.hostId,
      visitType: data.visitType ?? "PLANNED",
      expectedArrival: data.expectedArrival,
      validUntil,
      status: data.status ?? (data.visitType === "UNPLANNED" ? "PENDING" : "APPROVED"),
      qrSecret: generatePassSecret(),
      organization: data.organization,
    },
    include: { host: true },
  });

  await syncOfflineCache(pass.id);
  return pass;
}

export async function syncOfflineCache(passId: string) {
  const pass = await prisma.visitorPass.findUnique({ where: { id: passId } });
  if (!pass || !["APPROVED", "ACTIVE"].includes(pass.status)) return;

  await prisma.offlineCache.upsert({
    where: { passId },
    create: {
      passId,
      visitorName: pass.visitorName,
      visitorPhone: pass.visitorPhone,
      status: pass.status,
      validUntil: pass.validUntil,
    },
    update: {
      visitorName: pass.visitorName,
      visitorPhone: pass.visitorPhone,
      status: pass.status,
      validUntil: pass.validUntil,
      syncedAt: new Date(),
    },
  });
}

export async function recordEntry(passId: string, gateId: string, guardId: string) {
  const existing = await prisma.visit.findFirst({
    where: { passId, status: "INSIDE" },
  });
  if (existing) return existing;

  const visit = await prisma.visit.create({
    data: { passId, gateId, guardId, status: "INSIDE" },
    include: { pass: { include: { host: true } }, gate: true },
  });

  await prisma.visitorPass.update({
    where: { id: passId },
    data: { status: "ACTIVE" },
  });

  await logAudit(guardId, "ENTRY", "Visit", visit.id, { passId, gateId });
  return visit;
}

export async function recordExit(passId: string, guardId?: string) {
  const visit = await prisma.visit.findFirst({
    where: { passId, status: "INSIDE" },
    orderBy: { entryAt: "desc" },
  });
  if (!visit) return null;

  const updated = await prisma.visit.update({
    where: { id: visit.id },
    data: { exitAt: new Date(), status: "EXITED" },
    include: { pass: true, gate: true },
  });

  await logAudit(guardId ?? null, "EXIT", "Visit", visit.id, { passId });
  return updated;
}

export async function createOverride(data: {
  guardId: string;
  passId?: string;
  type: OverrideType;
  reason: string;
}) {
  const override = await prisma.overrideLog.create({ data });
  await logAudit(data.guardId, "OVERRIDE", "OverrideLog", override.id, {
    type: data.type,
    reason: data.reason,
    passId: data.passId,
  });
  return override;
}

export async function getOccupancyStats() {
  const inside = await prisma.visit.count({ where: { status: "INSIDE" } });
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const entriesToday = await prisma.visit.count({
    where: { entryAt: { gte: todayStart } },
  });
  const exitsToday = await prisma.visit.count({
    where: { exitAt: { gte: todayStart } },
  });

  const byCategory = await prisma.visit.groupBy({
    by: ["status"],
    where: { status: "INSIDE" },
    _count: true,
  });

  const activePasses = await prisma.visit.findMany({
    where: { status: "INSIDE" },
    include: {
      pass: true,
      gate: true,
      guard: { select: { name: true, guardId: true } },
    },
    orderBy: { entryAt: "desc" },
    take: 50,
  });

  const overstays = activePasses.filter((v) => new Date() > v.pass.validUntil);

  return { inside, entriesToday, exitsToday, byCategory, activePasses, overstays: overstays.length };
}

export async function expirePendingApprovals() {
  const now = new Date();
  const expired = await prisma.approvalRequest.findMany({
    where: { status: "PENDING", expiresAt: { lt: now } },
  });

  for (const req of expired) {
    await prisma.approvalRequest.update({
      where: { id: req.id },
      data: { status: "EXPIRED" },
    });
    await prisma.visitorPass.update({
      where: { id: req.passId },
      data: { status: "EXPIRED" },
    });
  }
  return expired.length;
}

export async function generateOtp(email: string): Promise<string> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.otpSession.deleteMany({ where: { email } });
  await prisma.otpSession.create({ data: { email, otp, expiresAt } });
  return otp;
}

export async function verifyOtp(email: string, otp: string): Promise<boolean> {
  const session = await prisma.otpSession.findFirst({
    where: { email, otp, expiresAt: { gt: new Date() } },
  });
  if (!session) return false;
  await prisma.otpSession.delete({ where: { id: session.id } });
  return true;
}
