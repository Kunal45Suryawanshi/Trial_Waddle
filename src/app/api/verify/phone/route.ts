import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createVisitorPass, generateOtp, logAudit } from "@/lib/services";
import { formatPhone } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["GUARD", "SUPERVISOR"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { phone, hostId, visitorName, purpose, action, otp } = await request.json();
  const normalizedPhone = formatPhone(phone ?? "");

  if (!normalizedPhone || normalizedPhone.length !== 10) {
    return NextResponse.json({ error: "Valid 10-digit phone required" }, { status: 400 });
  }

  const blacklisted = await prisma.blacklistEntry.findUnique({
    where: { phone: normalizedPhone },
  });
  if (blacklisted) {
    return NextResponse.json(
      { result: "RED", message: "Visitor phone is blacklisted" },
      { status: 403 }
    );
  }

  if (action === "lookup") {
    const existingPass = await prisma.visitorPass.findFirst({
      where: {
        visitorPhone: normalizedPhone,
        status: { in: ["APPROVED", "ACTIVE", "PENDING"] },
        validUntil: { gt: new Date() },
      },
      include: { host: true },
      orderBy: { createdAt: "desc" },
    });

    const hosts = await prisma.user.findMany({
      where: { role: "HOST" },
      select: { id: true, name: true, phone: true, department: true, email: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ existingPass, hosts });
  }

  if (action === "send-otp") {
    const code = await generateOtp(`visitor:${normalizedPhone}`);
    return NextResponse.json({
      message: "OTP sent to visitor phone",
      devOtp: process.env.NODE_ENV !== "production" ? code : undefined,
    });
  }

  if (action === "verify-otp") {
    const { verifyOtp } = await import("@/lib/services");
    const valid = await verifyOtp(`visitor:${normalizedPhone}`, otp);
    if (!valid) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
    }
    return NextResponse.json({ verified: true });
  }

  if (action === "request-approval") {
    if (!hostId || !visitorName || !purpose) {
      return NextResponse.json({ error: "hostId, visitorName, purpose required" }, { status: 400 });
    }

    const pass = await createVisitorPass({
      visitorName,
      visitorPhone: normalizedPhone,
      purpose,
      hostId,
      visitType: "UNPLANNED",
      status: "PENDING",
    });

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    const approval = await prisma.approvalRequest.create({
      data: {
        passId: pass.id,
        hostId,
        expiresAt,
      },
      include: { host: true, pass: true },
    });

    await logAudit(session.userId, "APPROVAL_REQUEST", "ApprovalRequest", approval.id);

    return NextResponse.json({
      result: "YELLOW",
      message: "Approval request sent to host",
      pass,
      approval,
      expiresAt,
    });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
