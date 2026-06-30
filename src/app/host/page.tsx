"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

type Pass = {
  id: string;
  visitorName: string;
  visitorPhone: string;
  purpose: string;
  status: string;
  visitType: string;
  validUntil: string;
  createdAt: string;
  visits: { id: string; status: string }[];
};

type Approval = {
  id: string;
  status: string;
  expiresAt: string;
  pass: { visitorName: string; visitorPhone: string; purpose: string; id: string };
};

export default function HostPortalPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; department?: string } | null>(null);
  const [passes, setPasses] = useState<Pass[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [tab, setTab] = useState<"register" | "approve" | "history">("register");
  const [form, setForm] = useState({
    visitorName: "",
    visitorPhone: "",
    purpose: "",
    expectedArrival: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [newPassId, setNewPassId] = useState<string | null>(null);

  const loadData = () => {
    fetch("/api/visitors")
      .then((r) => r.json())
      .then((d) => setPasses(d.passes ?? []));
    fetch("/api/approval/pending")
      .then((r) => r.json())
      .then((d) => setApprovals(d.approvals ?? []));
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated || d.user.role !== "HOST") {
          router.replace("/host/login");
          return;
        }
        setUser(d.user);
        loadData();
      });

    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [router]);

  async function registerVisitor(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/visitors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage("Visitor registered! Share the QR pass link with your visitor.");
      setNewPassId(data.pass.id);
      setForm({ visitorName: "", visitorPhone: "", purpose: "", expectedArrival: "" });
      loadData();
    } else {
      setMessage(data.error ?? "Registration failed");
    }
    setLoading(false);
  }

  async function respondApproval(approvalId: string, approved: boolean) {
    setLoading(true);
    const res = await fetch("/api/approval", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalId, approved }),
    });
    if (res.ok) {
      setMessage(approved ? "Visitor approved for entry" : "Visitor denied");
      loadData();
    }
    setLoading(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/host/login");
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Host Portal
            </p>
            <h1 className="text-lg font-bold text-slate-900">{user.name}</h1>
            {user.department && <p className="text-sm text-slate-500">{user.department}</p>}
          </div>
          <Button variant="secondary" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>

        <div className="mx-auto flex max-w-3xl gap-1 px-4 pb-3">
          {(
            [
              ["register", "Register Visitor"],
              ["approve", `Approve (${approvals.length})`],
              ["history", "History"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4">
        {message && (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>
        )}

        {newPassId && (
          <Card className="border-green-200 bg-green-50">
            <p className="font-medium text-green-900">QR Pass ready</p>
            <Link
              href={`/visitor/${newPassId}`}
              className="mt-2 inline-block text-blue-600 underline"
              target="_blank"
            >
              Open visitor pass →
            </Link>
          </Card>
        )}

        {tab === "register" && (
          <Card>
            <h2 className="mb-4 text-xl font-bold">Register Planned Visitor</h2>
            <form onSubmit={registerVisitor} className="space-y-4">
              <Input
                placeholder="Visitor full name"
                value={form.visitorName}
                onChange={(e) => setForm({ ...form, visitorName: e.target.value })}
                required
              />
              <Input
                placeholder="Visitor phone (10 digits)"
                value={form.visitorPhone}
                onChange={(e) => setForm({ ...form, visitorPhone: e.target.value })}
                inputMode="numeric"
                required
              />
              <Input
                placeholder="Purpose of visit"
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                required
              />
              <Input
                type="datetime-local"
                value={form.expectedArrival}
                onChange={(e) => setForm({ ...form, expectedArrival: e.target.value })}
              />
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                Generate QR Pass
              </Button>
            </form>
          </Card>
        )}

        {tab === "approve" && (
          <div className="space-y-4">
            {approvals.length === 0 ? (
              <Card>
                <p className="text-center text-slate-500">No pending approval requests</p>
              </Card>
            ) : (
              approvals.map((a) => (
                <Card key={a.id}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">{a.pass.visitorName}</h3>
                      <p className="text-sm text-slate-600">{a.pass.visitorPhone}</p>
                      <p className="mt-1 text-sm">{a.pass.purpose}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        Expires {formatDateTime(a.expiresAt)}
                      </p>
                    </div>
                    <StatusBadge status="PENDING" />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Button
                      variant="success"
                      size="lg"
                      onClick={() => respondApproval(a.id, true)}
                      disabled={loading}
                    >
                      ✓ Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="lg"
                      onClick={() => respondApproval(a.id, false)}
                      disabled={loading}
                    >
                      ✗ Deny
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="space-y-3">
            {passes.map((p) => (
              <Card key={p.id} className="!p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{p.visitorName}</p>
                    <p className="text-sm text-slate-500">
                      {p.purpose} · {p.visitType}
                    </p>
                    <p className="text-xs text-slate-400">{formatDateTime(p.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <StatusBadge status={p.status} />
                    {["APPROVED", "ACTIVE"].includes(p.status) && (
                      <Link href={`/visitor/${p.id}`} className="text-xs text-blue-600 underline">
                        View pass
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
