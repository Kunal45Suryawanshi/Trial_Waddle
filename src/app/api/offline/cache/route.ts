import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const cache = await prisma.offlineCache.findMany({
    where: { validUntil: { gt: new Date() } },
    orderBy: { syncedAt: "desc" },
  });
  return NextResponse.json({ cache, syncedAt: new Date().toISOString() });
}
