import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { ensureQrTokenRecord, generateQrToken, QR_WINDOW_SECONDS } from "@/lib/qr";
import QRCode from "qrcode";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ passId: string }> }
) {
  const { passId } = await params;

  const pass = await prisma.visitorPass.findUnique({
    where: { id: passId },
    include: { host: { select: { name: true } } },
  });

  if (!pass) {
    return NextResponse.json({ error: "Pass not found" }, { status: 404 });
  }

  await ensureQrTokenRecord(passId, pass.qrSecret);
  const token = generateQrToken(passId, pass.qrSecret);
  const qrDataUrl = await QRCode.toDataURL(token, { width: 280, margin: 2 });

  return NextResponse.json({
    pass: {
      id: pass.id,
      visitorName: pass.visitorName,
      visitorPhone: pass.visitorPhone,
      purpose: pass.purpose,
      status: pass.status,
      validUntil: pass.validUntil,
      hostName: pass.host?.name,
      visitType: pass.visitType,
    },
    token,
    qrDataUrl,
    refreshSeconds: QR_WINDOW_SECONDS,
  });
}
