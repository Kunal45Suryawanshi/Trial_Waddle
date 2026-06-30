import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import {
  markQrTokenUsed,
  verifyQrScan,
} from "@/lib/qr";
import { logAudit, recordEntry } from "@/lib/services";

export async function POST(request: Request) {
  const start = Date.now();
  const session = await getSession();
  if (!session || !["GUARD", "SUPERVISOR"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token, gateId, action } = await request.json();

  if (!token || !gateId) {
    return NextResponse.json({ error: "Token and gateId required" }, { status: 400 });
  }

  const verification = await verifyQrScan(token, gateId);

  if (action === "verify-only") {
    return NextResponse.json(verification);
  }

  if (verification.result === "GREEN" && action === "entry") {
    await markQrTokenUsed(token);
    const visit = await recordEntry(verification.passId!, gateId, session.userId);
    await logAudit(session.userId, "QR_ENTRY", "Visit", visit.id, {
      responseMs: Date.now() - start,
    });

    return NextResponse.json({
      ...verification,
      visitId: visit.id,
      entryRecorded: true,
      gateProcessingMs: Date.now() - start,
    });
  }

  if (verification.result === "GREEN" && action === "exit") {
    const { recordExit } = await import("@/lib/services");
    const visit = await recordExit(verification.passId!, session.userId);
    return NextResponse.json({
      ...verification,
      exitRecorded: !!visit,
      gateProcessingMs: Date.now() - start,
    });
  }

  return NextResponse.json({
    ...verification,
    gateProcessingMs: Date.now() - start,
  });
}
