import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/services";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const incidents = await prisma.incident.findMany({
    include: { guard: { select: { name: true, guardId: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ incidents });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !["GUARD", "SUPERVISOR"].includes(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { description, photoUrl } = await request.json();

  if (!description) {
    return NextResponse.json({ error: "Description required" }, { status: 400 });
  }

  const incident = await prisma.incident.create({
    data: {
      guardId: session.userId,
      description,
      photoUrl,
    },
  });

  await logAudit(session.userId, "INCIDENT", "Incident", incident.id, { description });

  return NextResponse.json({ incident }, { status: 201 });
}
