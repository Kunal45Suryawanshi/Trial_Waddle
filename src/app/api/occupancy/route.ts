import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getSession } from "@/lib/auth";
import { expirePendingApprovals, getOccupancyStats } from "@/lib/services";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await expirePendingApprovals();
  const stats = await getOccupancyStats();

  return NextResponse.json(stats);
}
