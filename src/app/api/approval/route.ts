import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit, recordEntry, recordExit, syncOfflineCache } from "@/lib/services";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["GUARD", "SUPERVISOR"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { passId, gateId, type } = await request.json();

  if (!passId || !gateId || !type) {
    return NextResponse.json({ error: "passId, gateId, type required" }, { status: 400 });
  }

  if (type === "entry") {
    const visit = await recordEntry(passId, gateId, session.userId);
    return NextResponse.json({ visit, message: "Entry logged" });
  }

  if (type === "exit") {
    const visit = await recordExit(passId, session.userId);
    if (!visit) {
      return NextResponse.json({ error: "No active visit found" }, { status: 404 });
    }
    return NextResponse.json({ visit, message: "Exit logged" });
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "HOST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { approvalId, approved } = await request.json();

  const approval = await prisma.approvalRequest.findUnique({
    where: { id: approvalId },
    include: { pass: true },
  });

  if (!approval || approval.hostId !== session.userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (approval.status !== "PENDING") {
    return NextResponse.json({ error: "Already responded" }, { status: 400 });
  }

  if (new Date() > approval.expiresAt) {
    await prisma.approvalRequest.update({
      where: { id: approvalId },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json({ error: "Approval expired" }, { status: 410 });
  }

  const status = approved ? "APPROVED" : "DENIED";
  await prisma.approvalRequest.update({
    where: { id: approvalId },
    data: { status, respondedAt: new Date() },
  });

  await prisma.visitorPass.update({
    where: { id: approval.passId },
    data: { status: approved ? "APPROVED" : "DENIED" },
  });

  if (approved) await syncOfflineCache(approval.passId);
  await logAudit(session.userId, approved ? "APPROVE" : "DENY", "ApprovalRequest", approvalId);

  return NextResponse.json({ status, passId: approval.passId });
}
