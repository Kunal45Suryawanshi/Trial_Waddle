import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET() {
  const gates = await prisma.gate.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ gates });
}
