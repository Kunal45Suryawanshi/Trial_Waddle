import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "HOST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const approvals = await prisma.approvalRequest.findMany({
    where: { hostId: session.userId, status: "PENDING" },
    include: { pass: true },
    orderBy: { requestedAt: "desc" },
  });

  return NextResponse.json({ approvals });
}
