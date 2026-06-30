import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { logAudit } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const admin = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!admin || admin.role !== "ADMIN" || !admin.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await setSessionCookie({
      userId: admin.id,
      role: admin.role,
      name: admin.name,
    });

    await logAudit(admin.id, "LOGIN", "User", admin.id);

    return NextResponse.json({ user: { id: admin.id, name: admin.name, email: admin.email } });
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
