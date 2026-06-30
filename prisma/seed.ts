import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generatePassSecret } from "../src/lib/qr";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding IIML SVAP database...");

  await prisma.auditLog.deleteMany();
  await prisma.offlineCache.deleteMany();
  await prisma.qrToken.deleteMany();
  await prisma.visit.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.overrideLog.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.visitorPass.deleteMany();
  await prisma.blacklistEntry.deleteMany();
  await prisma.otpSession.deleteMany();
  await prisma.user.deleteMany();
  await prisma.gate.deleteMany();

  const pinHash = await bcrypt.hash("1234", 10);
  const adminPassword = await bcrypt.hash("admin123", 10);

  const gates = await Promise.all([
    prisma.gate.create({ data: { name: "Main Gate", location: "Campus Entry" } }),
    prisma.gate.create({ data: { name: "Hostel Gate", location: "North Campus" } }),
    prisma.gate.create({ data: { name: "Admin Block", location: "Central Campus" } }),
  ]);

  const guards = await Promise.all([
    prisma.user.create({
      data: {
        name: "Ramesh Kumar",
        role: "GUARD",
        guardId: "G001",
        pinHash,
        phone: "9876500001",
      },
    }),
    prisma.user.create({
      data: {
        name: "Suresh Patel",
        role: "GUARD",
        guardId: "G002",
        pinHash,
        phone: "9876500002",
      },
    }),
    prisma.user.create({
      data: {
        name: "Vikram Singh",
        role: "SUPERVISOR",
        guardId: "S001",
        pinHash,
        phone: "9876500003",
      },
    }),
  ]);

  const hosts = await Promise.all([
    prisma.user.create({
      data: {
        name: "Arjun Mehta",
        email: "arjun.mehta@iiml.ac.in",
        phone: "9876543210",
        role: "HOST",
        department: "PGP Student — Batch 2025",
      },
    }),
    prisma.user.create({
      data: {
        name: "Dr. Priya Sharma",
        email: "priya.sharma@iiml.ac.in",
        phone: "9876543211",
        role: "HOST",
        department: "Faculty — Finance",
      },
    }),
    prisma.user.create({
      data: {
        name: "Rajesh Verma",
        email: "rajesh.verma@iiml.ac.in",
        phone: "9876543212",
        role: "HOST",
        department: "Administrative Staff",
      },
    }),
  ]);

  const admin = await prisma.user.create({
    data: {
      name: "Campus Security Admin",
      email: "admin@iiml.ac.in",
      role: "ADMIN",
      passwordHash: adminPassword,
    },
  });

  await prisma.blacklistEntry.create({
    data: {
      phone: "9999999999",
      name: "Blocked Individual",
      reason: "Repeated unauthorized entry attempts",
    },
  });

  const validUntil = new Date();
  validUntil.setHours(validUntil.getHours() + 8);

  const plannedPass = await prisma.visitorPass.create({
    data: {
      visitorName: "Mrs. Mehta (Parent)",
      visitorPhone: "9123456789",
      purpose: "Parent visit",
      hostId: hosts[0].id,
      status: "APPROVED",
      visitType: "PLANNED",
      expectedArrival: new Date(),
      validUntil,
      qrSecret: generatePassSecret(),
    },
  });

  const recurringValid = new Date();
  recurringValid.setDate(recurringValid.getDate() + 30);

  await prisma.visitorPass.create({
    data: {
      visitorName: "Airtel Technician",
      visitorPhone: "9111222333",
      purpose: "Network maintenance",
      hostId: hosts[2].id,
      status: "APPROVED",
      visitType: "RECURRING",
      validUntil: recurringValid,
      organization: "Airtel India",
      approvedZones: "Admin Block, Main Gate",
      qrSecret: generatePassSecret(),
    },
  });

  console.log("\n✅ Seed complete!\n");
  console.log("Gates:", gates.map((g) => g.name).join(", "));
  console.log("\n--- Demo Credentials ---");
  console.log("Guard Tablet:  G001 / PIN 1234  (or G002 / 1234)");
  console.log("Supervisor:    S001 / PIN 1234");
  console.log("Host Portal:   arjun.mehta@iiml.ac.in (OTP shown in dev mode)");
  console.log("Admin:         admin@iiml.ac.in / admin123");
  console.log("\nSample planned visitor pass ID:", plannedPass.id);
  console.log("Visitor QR page: /visitor/" + plannedPass.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
