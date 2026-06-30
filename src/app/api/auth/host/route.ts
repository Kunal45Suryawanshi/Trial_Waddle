import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { setSessionCookie } from "@/lib/auth";
import { generateOtp, logAudit } from "@/lib/services";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, otp } = body;

    if (action === "send-otp") {
      if (!email?.endsWith("@iiml.ac.in")) {
        return NextResponse.json({ error: "Use your @iiml.ac.in email" }, { status: 400 });
      }

      const host = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!host || host.role !== "HOST") {
        return NextResponse.json({ error: "Host account not found" }, { status: 404 });
      }

      const code = await generateOtp(email.toLowerCase());

      return NextResponse.json({
        message: "OTP sent",
        devOtp: process.env.NODE_ENV !== "production" ? code : undefined,
      });
    }

    if (action === "verify-otp") {
      const { verifyOtp } = await import("@/lib/services");
      const valid = await verifyOtp(email.toLowerCase(), otp);
      if (!valid) {
        return NextResponse.json({ error: "Invalid or expired OTP" }, { status: 401 });
      }

      const host = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
      if (!host) {
        return NextResponse.json({ error: "Host not found" }, { status: 404 });
      }

      await setSessionCookie({
        userId: host.id,
        role: host.role,
        name: host.name,
      });

      await logAudit(host.id, "LOGIN", "User", host.id);

      return NextResponse.json({
        user: { id: host.id, name: host.name, email: host.email, department: host.department },
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Authentication failed" }, { status: 500 });
  }
}
