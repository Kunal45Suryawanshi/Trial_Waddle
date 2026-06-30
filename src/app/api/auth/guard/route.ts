import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const { guardId, pin } = await request.json();

    if (!guardId || !pin) {
      return NextResponse.json({ error: "Guard ID and PIN required" }, { status: 400 });
    }

    const guard = await prisma.user.findUnique({
      where: { guardId: guardId.toUpperCase() },
    });

    if (!guard || !["GUARD", "SUPERVISOR"].includes(guard.role) || !guard.pinHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(pin, guard.pinHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await setSessionCookie({
      userId: guard.id,
      role: guard.role,
      name: guard.name,
      guardId: guard.guardId ?? undefined,
    });

    await logAudit(guard.id, "LOGIN", "User", guard.id);

    return NextResponse.json({
      user: { id: guard.id, name: guard.name, role: guard.role, guardId: guard.guardId },
    });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
