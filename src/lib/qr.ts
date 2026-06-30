import { createHmac, randomBytes } from "crypto";
import prisma from "./db";
import type { VerificationResult } from "@prisma/client";

const QR_WINDOW_SECONDS = 30;

function getQrSecret(): string {
  return process.env.QR_SECRET ?? "dev-qr-secret-change-in-production";
}

export function generatePassSecret(): string {
  return randomBytes(32).toString("hex");
}

export function getCurrentWindow(): number {
  return Math.floor(Date.now() / 1000 / QR_WINDOW_SECONDS);
}

export function generateQrToken(passId: string, passSecret: string, window?: number): string {
  const w = window ?? getCurrentWindow();
  const payload = `${passId}:${w}`;
  const sig = createHmac("sha256", `${getQrSecret()}:${passSecret}`)
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  return `${passId}.${w}.${sig}`;
}

export function parseQrToken(raw: string): { passId: string; window: number; sig: string } | null {
  const parts = raw.trim().split(".");
  if (parts.length !== 3) return null;
  const [passId, windowStr, sig] = parts;
  const window = parseInt(windowStr, 10);
  if (!passId || Number.isNaN(window) || !sig) return null;
  return { passId, window, sig };
}

export function validateQrSignature(
  passId: string,
  passSecret: string,
  window: number,
  sig: string
): boolean {
  const expected = generateQrToken(passId, passSecret, window).split(".")[2];
  return expected === sig;
}

export async function ensureQrTokenRecord(passId: string, passSecret: string) {
  const window = getCurrentWindow();
  const token = generateQrToken(passId, passSecret, window);
  const expiresAt = new Date((window + 2) * QR_WINDOW_SECONDS * 1000);

  const existing = await prisma.qrToken.findFirst({
    where: { passId, token, usedAt: null },
  });
  if (existing) return existing;

  await prisma.qrToken.deleteMany({
    where: { passId, expiresAt: { lt: new Date() } },
  });

  return prisma.qrToken.create({
    data: { passId, token, expiresAt },
  });
}

export interface VerificationResponse {
  result: VerificationResult;
  message: string;
  passId?: string;
  visitorName?: string;
  visitorPhone?: string;
  hostName?: string;
  purpose?: string;
  visitType?: string;
  responseMs: number;
}

export async function verifyQrScan(
  rawToken: string,
  gateId: string
): Promise<VerificationResponse> {
  const start = Date.now();

  const parsed = parseQrToken(rawToken);
  if (!parsed) {
    return { result: "RED", message: "Invalid QR format", responseMs: Date.now() - start };
  }

  const { passId, window, sig } = parsed;
  const currentWindow = getCurrentWindow();

  if (window < currentWindow - 1 || window > currentWindow + 1) {
    return { result: "RED", message: "QR expired — ask visitor to refresh", responseMs: Date.now() - start };
  }

  const pass = await prisma.visitorPass.findUnique({
    where: { id: passId },
    include: { host: true, approvalRequests: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!pass) {
    return { result: "RED", message: "Pass not found", responseMs: Date.now() - start };
  }

  if (!validateQrSignature(passId, pass.qrSecret, window, sig)) {
    return { result: "RED", message: "Invalid or tampered QR", responseMs: Date.now() - start };
  }

  const blacklisted = await prisma.blacklistEntry.findUnique({
    where: { phone: pass.visitorPhone },
  });
  if (blacklisted) {
    return {
      result: "RED",
      message: "Visitor blacklisted",
      passId,
      visitorName: pass.visitorName,
      responseMs: Date.now() - start,
    };
  }

  if (pass.status === "PENDING") {
    return {
      result: "YELLOW",
      message: "Awaiting host approval",
      passId,
      visitorName: pass.visitorName,
      visitorPhone: pass.visitorPhone,
      hostName: pass.host?.name,
      purpose: pass.purpose,
      visitType: pass.visitType,
      responseMs: Date.now() - start,
    };
  }

  if (pass.status === "DENIED" || pass.status === "CANCELLED") {
    return { result: "RED", message: "Entry denied", passId, responseMs: Date.now() - start };
  }

  if (new Date() > pass.validUntil) {
    await prisma.visitorPass.update({ where: { id: passId }, data: { status: "EXPIRED" } });
    return { result: "RED", message: "Pass expired", passId, responseMs: Date.now() - start };
  }

  const tokenRecord = await prisma.qrToken.findUnique({ where: { token: rawToken } });
  if (tokenRecord?.usedAt) {
    return { result: "RED", message: "QR already used — screenshot blocked", passId, responseMs: Date.now() - start };
  }

  if (pass.status === "APPROVED" || pass.status === "ACTIVE") {
    return {
      result: "GREEN",
      message: "Entry allowed",
      passId,
      visitorName: pass.visitorName,
      visitorPhone: pass.visitorPhone,
      hostName: pass.host?.name,
      purpose: pass.purpose,
      visitType: pass.visitType,
      responseMs: Date.now() - start,
    };
  }

  return { result: "RED", message: "Entry not permitted", passId, responseMs: Date.now() - start };
}

export async function markQrTokenUsed(rawToken: string) {
  await prisma.qrToken.updateMany({
    where: { token: rawToken, usedAt: null },
    data: { usedAt: new Date() },
  });
}

export { QR_WINDOW_SECONDS };
