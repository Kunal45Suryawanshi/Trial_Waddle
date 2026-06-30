import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { expirePendingApprovals, getOccupancyStats, logAudit } from "@/lib/services";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await expirePendingApprovals();

  const [stats, overrides, auditLogs, blacklist, pendingApprovals] = await Promise.all([
    getOccupancyStats(),
    prisma.overrideLog.findMany({
      include: {
        guard: { select: { name: true, guardId: true } },
        pass: { select: { visitorName: true, visitorPhone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.auditLog.findMany({
      include: { actor: { select: { name: true, role: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.blacklistEntry.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.approvalRequest.findMany({
      where: { status: "PENDING" },
      include: {
        pass: true,
        host: { select: { name: true, email: true } },
      },
    }),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const totalEntriesToday = await prisma.visit.count({
    where: { entryAt: { gte: todayStart } },
  });
  const totalOverridesToday = await prisma.overrideLog.count({
    where: { createdAt: { gte: todayStart } },
  });
  const overrideRate =
    totalEntriesToday > 0 ? (totalOverridesToday / totalEntriesToday) * 100 : 0;

  return NextResponse.json({
    stats,
    overrides,
    auditLogs,
    blacklist,
    pendingApprovals,
    metrics: {
      totalEntriesToday,
      totalOverridesToday,
      overrideRate: Math.round(overrideRate * 100) / 100,
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  if (body.action === "blacklist") {
    const { phone, name, reason } = body;
    const entry = await prisma.blacklistEntry.upsert({
      where: { phone: phone.replace(/\D/g, "").slice(-10) },
      create: {
        phone: phone.replace(/\D/g, "").slice(-10),
        name,
        reason,
      },
      update: { name, reason },
    });
    await logAudit(session.userId, "BLACKLIST", "BlacklistEntry", entry.id);
    return NextResponse.json({ entry });
  }

  if (body.action === "bulk-event") {
    const { eventName, guests } = body as {
      eventName: string;
      guests: { name: string; phone: string; purpose?: string }[];
    };

    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 1);

    const { generatePassSecret } = await import("@/lib/qr");
    const passes = await Promise.all(
      guests.map((g) =>
        prisma.visitorPass.create({
          data: {
            visitorName: g.name,
            visitorPhone: g.phone.replace(/\D/g, "").slice(-10),
            purpose: g.purpose ?? eventName,
            visitType: "BULK_EVENT",
            status: "APPROVED",
            validUntil,
            qrSecret: generatePassSecret(),
          },
        })
      )
    );

    await logAudit(session.userId, "BULK_EVENT", "VisitorPass", undefined, {
      eventName,
      count: passes.length,
    });

    return NextResponse.json({ passes, count: passes.length });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
