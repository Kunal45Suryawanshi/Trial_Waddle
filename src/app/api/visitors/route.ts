import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createVisitorPass, logAudit } from "@/lib/services";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where =
    session.role === "HOST"
      ? { hostId: session.userId }
      : session.role === "ADMIN"
        ? {}
        : null;

  if (!where && session.role !== "GUARD" && session.role !== "SUPERVISOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const passes = await prisma.visitorPass.findMany({
    where: where ?? undefined,
    include: {
      host: { select: { name: true, email: true, department: true } },
      visits: { where: { status: "INSIDE" }, take: 1 },
      approvalRequests: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ passes });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "HOST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { visitorName, visitorPhone, purpose, expectedArrival } = body;

  if (!visitorName || !visitorPhone || !purpose) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const pass = await createVisitorPass({
    visitorName,
    visitorPhone,
    purpose,
    hostId: session.userId,
    visitType: "PLANNED",
    expectedArrival: expectedArrival ? new Date(expectedArrival) : undefined,
    status: "APPROVED",
  });

  await logAudit(session.userId, "CREATE_PASS", "VisitorPass", pass.id);

  return NextResponse.json({ pass }, { status: 201 });
}
