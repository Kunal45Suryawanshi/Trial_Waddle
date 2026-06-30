import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { createOverride, createVisitorPass, logAudit, recordEntry } from "@/lib/services";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["GUARD", "SUPERVISOR"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, reason, passId, gateId, visitorName, visitorPhone, purpose } =
    await request.json();

  if (!type || !reason || !gateId) {
    return NextResponse.json({ error: "type, reason, gateId required" }, { status: 400 });
  }

  if (type === "EMERGENCY") {
    const pass = await createVisitorPass({
      visitorName: visitorName ?? "Emergency Services",
      visitorPhone: visitorPhone ?? "0000000000",
      purpose: purpose ?? "Emergency entry",
      visitType: "EMERGENCY",
      status: "APPROVED",
      validHours: 2,
    });

    const override = await createOverride({
      guardId: session.userId,
      passId: pass.id,
      type: "EMERGENCY",
      reason,
    });

    const visit = await recordEntry(pass.id, gateId, session.userId);

    return NextResponse.json({
      message: "Emergency entry granted",
      pass,
      override,
      visit,
    });
  }

  if (!passId) {
    return NextResponse.json({ error: "passId required for manual override" }, { status: 400 });
  }

  const overrideType = session.role === "SUPERVISOR" ? "SUPERVISOR" : "MANUAL";

  const override = await createOverride({
    guardId: session.userId,
    passId,
    type: overrideType,
    reason,
  });

  await prisma.visitorPass.update({
    where: { id: passId },
    data: { status: "APPROVED" },
  });

  const visit = await recordEntry(passId, gateId, session.userId);

  return NextResponse.json({
    message: "Override applied — entry logged",
    override,
    visit,
  });
}
