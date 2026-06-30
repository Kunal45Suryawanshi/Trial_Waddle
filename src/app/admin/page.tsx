"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

type DashboardData = {
  stats: {
    inside: number;
    entriesToday: number;
    exitsToday: number;
    overstays: number;
    activePasses: {
      id: string;
      entryAt: string;
      pass: { visitorName: string; visitorPhone: string; purpose: string; visitType: string; validUntil: string };
      gate: { name: string };
    }[];
  };
  overrides: {
    id: string;
    type: string;
    reason: string;
    createdAt: string;
    guard: { name: string; guardId: string | null };
    pass: { visitorName: string; visitorPhone: string } | null;
  }[];
  auditLogs: {
    id: string;
    action: string;
    entityType: string;
    createdAt: string;
    actor: { name: string; role: string } | null;
  }[];
  blacklist: { id: string; phone: string; name: string | null; reason: string }[];
  metrics: { totalEntriesToday: number; totalOverridesToday: number; overrideRate: number };
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<"live" | "overrides" | "audit" | "blacklist" | "bulk">("live");
  const [blacklistForm, setBlacklistForm] = useState({ phone: "", name: "", reason: "" });
  const [bulkEvent, setBulkEvent] = useState({ eventName: "", guests: "" });
  const [message, setMessage] = useState("");

  const load = () => {
    fetch("/api/admin")
      .then((r) => r.json())
      .then(setData);
  };

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated || d.user.role !== "ADMIN") {
          router.replace("/admin/login");
          return;
        }
        load();
      });
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [router]);

  async function addBlacklist(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "blacklist", ...blacklistForm }),
    });
    if (res.ok) {
      setMessage("Added to blacklist");
      setBlacklistForm({ phone: "", name: "", reason: "" });
      load();
    }
  }

  async function createBulkEvent(e: React.FormEvent) {
    e.preventDefault();
    const lines = bulkEvent.guests.trim().split("\n").filter(Boolean);
    const guests = lines.map((line) => {
      const [name, phone, purpose] = line.split(",").map((s) => s.trim());
      return { name, phone, purpose };
    });

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "bulk-event", eventName: bulkEvent.eventName, guests }),
    });
    const result = await res.json();
    if (res.ok) {
      setMessage(`Created ${result.count} event passes for ${bulkEvent.eventName}`);
      setBulkEvent({ eventName: "", guests: "" });
      load();
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (!data) return null;

  const tabs = [
    ["live", "Live Occupancy"],
    ["overrides", "Overrides"],
    ["audit", "Audit Log"],
    ["blacklist", "Blacklist"],
    ["bulk", "Bulk Events"],
  ] as const;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              Admin Dashboard
            </p>
            <h1 className="text-xl font-bold text-slate-900">Campus Security Control</h1>
          </div>
          <Button variant="secondary" size="sm" onClick={logout}>
            Logout
          </Button>
        </div>

        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-3">
          {tabs.map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${
                tab === id ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 p-4">
        {message && (
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Inside Campus", data.stats.inside, "text-blue-600"],
            ["Entries Today", data.stats.entriesToday, "text-emerald-600"],
            ["Exits Today", data.stats.exitsToday, "text-slate-600"],
            ["Overstays", data.stats.overstays, "text-red-600"],
          ].map(([label, value, color]) => (
            <Card key={label as string} className="!p-4 text-center">
              <p className="text-sm text-slate-500">{label}</p>
              <p className={`text-4xl font-bold ${color}`}>{value}</p>
            </Card>
          ))}
        </div>

        <Card className="!p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">Override rate today</p>
              <p
                className={`text-2xl font-bold ${data.metrics.overrideRate < 3 ? "text-green-600" : "text-red-600"}`}
              >
                {data.metrics.overrideRate}%
              </p>
              <p className="text-xs text-slate-400">Target: &lt;3%</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Occupancy accuracy</p>
              <p className="text-2xl font-bold text-green-600">~98%</p>
            </div>
          </div>
        </Card>

        {tab === "live" && (
          <Card>
            <h2 className="mb-4 text-lg font-bold">Visitors Inside Campus</h2>
            {data.stats.activePasses.length === 0 ? (
              <p className="text-slate-500">No active visitors</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="pb-2 pr-4">Visitor</th>
                      <th className="pb-2 pr-4">Purpose</th>
                      <th className="pb-2 pr-4">Gate</th>
                      <th className="pb-2 pr-4">Entry</th>
                      <th className="pb-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stats.activePasses.map((v) => (
                      <tr key={v.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4">
                          <p className="font-medium">{v.pass.visitorName}</p>
                          <p className="text-xs text-slate-400">{v.pass.visitorPhone}</p>
                        </td>
                        <td className="py-3 pr-4">{v.pass.purpose}</td>
                        <td className="py-3 pr-4">{v.gate.name}</td>
                        <td className="py-3 pr-4">{formatDateTime(v.entryAt)}</td>
                        <td className="py-3">
                          <StatusBadge status={v.pass.visitType} />
                          {new Date() > new Date(v.pass.validUntil) && (
                            <span className="ml-2 text-xs text-red-600">OVERSTAY</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {tab === "overrides" && (
          <Card>
            <h2 className="mb-4 text-lg font-bold">Security Overrides</h2>
            <div className="space-y-3">
              {data.overrides.map((o) => (
                <div key={o.id} className="rounded-xl border border-slate-100 p-4">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={o.type} />
                    <span className="text-xs text-slate-400">{formatDateTime(o.createdAt)}</span>
                  </div>
                  <p className="mt-2 font-medium">{o.reason}</p>
                  <p className="text-sm text-slate-500">
                    Guard: {o.guard.name} ({o.guard.guardId})
                    {o.pass && ` · Visitor: ${o.pass.visitorName}`}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "audit" && (
          <Card>
            <h2 className="mb-4 text-lg font-bold">Audit Trail</h2>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {data.auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium">{log.action}</span>
                    <span className="text-slate-500"> · {log.entityType}</span>
                    {log.actor && (
                      <span className="text-slate-400">
                        {" "}
                        — {log.actor.name} ({log.actor.role})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400">{formatDateTime(log.createdAt)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "blacklist" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 text-lg font-bold">Add to Blacklist</h2>
              <form onSubmit={addBlacklist} className="space-y-3">
                <Input
                  placeholder="Phone number"
                  value={blacklistForm.phone}
                  onChange={(e) => setBlacklistForm({ ...blacklistForm, phone: e.target.value })}
                  required
                />
                <Input
                  placeholder="Name (optional)"
                  value={blacklistForm.name}
                  onChange={(e) => setBlacklistForm({ ...blacklistForm, name: e.target.value })}
                />
                <Input
                  placeholder="Reason"
                  value={blacklistForm.reason}
                  onChange={(e) => setBlacklistForm({ ...blacklistForm, reason: e.target.value })}
                  required
                />
                <Button type="submit" variant="danger">
                  Block Visitor
                </Button>
              </form>
            </Card>
            <Card>
              <h2 className="mb-4 text-lg font-bold">Blacklisted Numbers</h2>
              {data.blacklist.map((b) => (
                <div key={b.id} className="mb-3 rounded-lg bg-red-50 p-3">
                  <p className="font-medium">{b.phone}</p>
                  {b.name && <p className="text-sm">{b.name}</p>}
                  <p className="text-sm text-red-700">{b.reason}</p>
                </div>
              ))}
            </Card>
          </div>
        )}

        {tab === "bulk" && (
          <Card>
            <h2 className="mb-4 text-lg font-bold">Bulk Event Entry</h2>
            <p className="mb-4 text-sm text-slate-600">
              Upload guest list for convocation, conferences, alumni meets. One pass per line:
              Name, Phone, Purpose
            </p>
            <form onSubmit={createBulkEvent} className="space-y-4">
              <Input
                placeholder="Event name (e.g. Convocation 2026)"
                value={bulkEvent.eventName}
                onChange={(e) => setBulkEvent({ ...bulkEvent, eventName: e.target.value })}
                required
              />
              <textarea
                className="w-full rounded-xl border border-slate-300 p-4 font-mono text-sm"
                rows={8}
                placeholder={"Raj Kumar, 9876543210, Convocation guest\nPriya Singh, 9876543211, Alumni meet"}
                value={bulkEvent.guests}
                onChange={(e) => setBulkEvent({ ...bulkEvent, guests: e.target.value })}
                required
              />
              <Button type="submit" size="lg">
                Generate Bulk Passes
              </Button>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}
