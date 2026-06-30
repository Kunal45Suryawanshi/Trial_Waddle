"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, Select, StatusBadge, Textarea } from "@/components/ui";
import { formatDuration, formatDateTime } from "@/lib/utils";

type Tab = "scan" | "phone" | "emergency" | "exit" | "incident";
type Gate = { id: string; name: string; location: string };
type Host = { id: string; name: string; phone: string | null; department: string | null };
type Verification = {
  result: "GREEN" | "RED" | "YELLOW";
  message: string;
  visitorName?: string;
  visitorPhone?: string;
  hostName?: string;
  purpose?: string;
  passId?: string;
  responseMs?: number;
  gateProcessingMs?: number;
};

export default function GuardAppPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; guardId?: string; role: string } | null>(null);
  const [gates, setGates] = useState<Gate[]>([]);
  const [gateId, setGateId] = useState("");
  const [tab, setTab] = useState<Tab>("scan");
  const [qrInput, setQrInput] = useState("");
  const [verification, setVerification] = useState<Verification | null>(null);
  const [phone, setPhone] = useState("");
  const [visitorName, setVisitorName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hosts, setHosts] = useState<Host[]>([]);
  const [hostId, setHostId] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [exitPassId, setExitPassId] = useState("");
  const [incidentDesc, setIncidentDesc] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [offline, setOffline] = useState(false);
  const [lastProcessingMs, setLastProcessingMs] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!d.authenticated || !["GUARD", "SUPERVISOR"].includes(d.user.role)) {
          router.replace("/guard/login");
          return;
        }
        setUser(d.user);
      });

    fetch("/api/gates")
      .then((r) => r.json())
      .then((d) => {
        setGates(d.gates ?? []);
        if (d.gates?.[0]) setGateId(d.gates[0].id);
      });

    const updateOnline = () => setOffline(!navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, [router]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const processQr = useCallback(
    async (token: string, action: "verify-only" | "entry" | "exit" = "verify-only") => {
      if (!gateId) {
        setMessage("Select a gate first");
        return;
      }
      setLoading(true);
      setMessage("");
      const start = Date.now();

      try {
        const res = await fetch("/api/verify/qr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, gateId, action }),
        });
        const data = await res.json();
        setVerification(data);
        setLastProcessingMs(data.gateProcessingMs ?? Date.now() - start);

        if (action === "entry" && data.result === "GREEN") {
          setMessage(`✓ Entry recorded for ${data.visitorName}`);
          setQrInput("");
        }
        if (action === "exit" && data.exitRecorded) {
          setMessage(`✓ Exit recorded for ${data.visitorName}`);
          setQrInput("");
        }
      } catch {
        setMessage("Network error — check offline cache");
      } finally {
        setLoading(false);
      }
    },
    [gateId]
  );

  async function lookupPhone() {
    setLoading(true);
    const res = await fetch("/api/verify/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, action: "lookup" }),
    });
    const data = await res.json();
    setHosts(data.hosts ?? []);
    if (data.existingPass) {
      setVerification({
        result: data.existingPass.status === "PENDING" ? "YELLOW" : "GREEN",
        message: `Existing pass: ${data.existingPass.status}`,
        visitorName: data.existingPass.visitorName,
        passId: data.existingPass.id,
        hostName: data.existingPass.host?.name,
      });
    }
    setLoading(false);
  }

  async function requestApproval() {
    setLoading(true);
    const res = await fetch("/api/verify/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        action: "request-approval",
        hostId,
        visitorName,
        purpose,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setVerification({
        result: "YELLOW",
        message: "Waiting for host approval (10 min)",
        visitorName,
        passId: data.pass?.id,
      });
      setMessage("Approval request sent to host");
    } else {
      setMessage(data.error ?? "Failed");
    }
    setLoading(false);
  }

  async function sendVisitorOtp() {
    const res = await fetch("/api/verify/phone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, action: "send-otp" }),
    });
    const data = await res.json();
    setOtpSent(true);
    if (data.devOtp) setDevOtp(data.devOtp);
  }

  async function handleEmergency() {
    if (!emergencyReason.trim()) {
      setMessage("Reason required for emergency entry");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "EMERGENCY",
        reason: emergencyReason,
        gateId,
        visitorName: "Emergency Services",
        purpose: "Emergency access",
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setVerification({ result: "GREEN", message: "Emergency entry granted", passId: data.pass?.id });
      setMessage("Emergency entry logged — supervisor review required");
      setEmergencyReason("");
    }
    setLoading(false);
  }

  async function handleManualOverride() {
    if (!verification?.passId || !overrideReason.trim()) return;
    setLoading(true);
    const res = await fetch("/api/override", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "MANUAL",
        reason: overrideReason,
        passId: verification.passId,
        gateId,
      }),
    });
    if (res.ok) {
      setVerification({ ...verification, result: "GREEN", message: "Manual override — entry granted" });
      setMessage("Override logged for supervisor audit");
      setOverrideReason("");
    }
    setLoading(false);
  }

  async function handleManualExit() {
    if (!exitPassId.trim()) {
      setMessage("Enter a pass ID");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/approval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passId: exitPassId.trim(), gateId, type: "exit" }),
    });
    const data = await res.json();
    setMessage(res.ok ? (data.message ?? "Exit logged") : (data.error ?? "Exit failed"));
    setLoading(false);
  }

  async function submitIncident() {
    setLoading(true);
    const res = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ description: incidentDesc }),
    });
    if (res.ok) {
      setMessage("Incident reported");
      setIncidentDesc("");
    }
    setLoading(false);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/guard/login");
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "scan", label: "Scan QR", icon: "📷" },
    { id: "phone", label: "Phone", icon: "📱" },
    { id: "emergency", label: "Emergency", icon: "🚨" },
    { id: "exit", label: "Exit", icon: "🚪" },
    { id: "incident", label: "Incident", icon: "⚠️" },
  ];

  if (!user) {
    return (
      <div className="guard-theme flex min-h-screen items-center justify-center">
        <p className="text-white/60">Loading…</p>
      </div>
    );
  }

  return (
    <div className="guard-theme min-h-screen">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[var(--guard-bg)]/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-xs text-white/50">IIML SVAP · Guard</p>
            <p className="font-semibold">
              {user.name} ({user.guardId})
            </p>
          </div>
          <div className="flex items-center gap-3">
            {offline && (
              <span className="rounded-full bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400">
                Offline
              </span>
            )}
            {lastProcessingMs !== null && (
              <span
                className={`text-xs font-mono ${lastProcessingMs < 8000 ? "text-green-400" : "text-red-400"}`}
              >
                {formatDuration(lastProcessingMs)}
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <Select dark value={gateId} onChange={(e) => setGateId(e.target.value)}>
            {gates.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {g.location}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex gap-1 overflow-x-auto px-4 pb-3">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setVerification(null);
                setMessage("");
              }}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                tab === t.id ? "bg-blue-600 text-white" : "bg-white/5 text-white/70 hover:bg-white/10"
              }`}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="space-y-4 p-4 pb-24">
        {message && (
          <div className="rounded-xl bg-blue-500/20 px-4 py-3 text-sm text-blue-200">{message}</div>
        )}

        {verification && (
          <Card
            dark
            className={`border-2 ${
              verification.result === "GREEN"
                ? "border-green-500"
                : verification.result === "RED"
                  ? "border-red-500"
                  : "border-yellow-500"
            }`}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <StatusBadge status={verification.result} large />
              <p className="text-lg">{verification.message}</p>
              {verification.visitorName && (
                <div className="w-full space-y-1 text-left text-sm text-white/80">
                  <p>
                    <span className="text-white/50">Visitor:</span> {verification.visitorName}
                  </p>
                  {verification.hostName && (
                    <p>
                      <span className="text-white/50">Host:</span> {verification.hostName}
                    </p>
                  )}
                  {verification.purpose && (
                    <p>
                      <span className="text-white/50">Purpose:</span> {verification.purpose}
                    </p>
                  )}
                  {verification.responseMs && (
                    <p className="font-mono text-xs text-white/40">
                      Verified in {formatDuration(verification.responseMs)}
                    </p>
                  )}
                </div>
              )}

              {verification.result === "GREEN" && tab === "scan" && (
                <Button
                  size="xl"
                  variant="success"
                  className="w-full"
                  onClick={() => processQr(qrInput, "entry")}
                  disabled={loading}
                >
                  ✓ ALLOW ENTRY
                </Button>
              )}

              {verification.result === "YELLOW" && verification.passId && (
                <div className="w-full space-y-3">
                  <p className="text-sm text-yellow-300">Host approval pending…</p>
                  {user.role === "SUPERVISOR" && (
                    <>
                      <Input
                        dark
                        placeholder="Supervisor override reason"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                      />
                      <Button
                        variant="warning"
                        size="lg"
                        className="w-full"
                        onClick={handleManualOverride}
                        disabled={loading || !overrideReason.trim()}
                      >
                        Supervisor Override
                      </Button>
                    </>
                  )}
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => verification.passId && processQr(qrInput || verification.passId, "verify-only")}
                  >
                    Refresh Status
                  </Button>
                </div>
              )}

              {verification.result === "RED" && (
                <Button variant="danger" size="lg" className="w-full" onClick={() => setVerification(null)}>
                  Deny & Clear
                </Button>
              )}
            </div>
          </Card>
        )}

        {tab === "scan" && (
          <Card dark>
            <h2 className="mb-4 text-xl font-bold">QR Verification</h2>
            <Input
              dark
              placeholder="Paste or scan QR token"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              className="font-mono text-sm"
              autoFocus
            />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="w-full"
                onClick={() => processQr(qrInput, "verify-only")}
                disabled={loading || !qrInput.trim()}
              >
                Verify
              </Button>
              <Button
                size="lg"
                variant="success"
                className="w-full"
                onClick={() => processQr(qrInput, "entry")}
                disabled={loading || !qrInput.trim()}
              >
                Verify + Enter
              </Button>
            </div>
          </Card>
        )}

        {tab === "phone" && (
          <Card dark>
            <h2 className="mb-4 text-xl font-bold">Unplanned Visitor</h2>
            <div className="space-y-3">
              <Input
                dark
                placeholder="Visitor phone (10 digits)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="numeric"
              />
              <Button size="lg" className="w-full" onClick={lookupPhone} disabled={loading}>
                Lookup
              </Button>

              <hr className="border-white/10" />

              <Input
                dark
                placeholder="Visitor name"
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
              />
              <Input
                dark
                placeholder="Visit purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
              <Select dark value={hostId} onChange={(e) => setHostId(e.target.value)}>
                <option value="">Select host…</option>
                {hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} — {h.department}
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="secondary" onClick={sendVisitorOtp} disabled={!phone}>
                  Send OTP
                </Button>
                <Button
                  size="lg"
                  variant="warning"
                  onClick={requestApproval}
                  disabled={loading || !hostId || !visitorName}
                >
                  Request Approval
                </Button>
              </div>

              {otpSent && (
                <div className="space-y-2">
                  {devOtp && (
                    <p className="text-xs text-yellow-400">Dev OTP: {devOtp}</p>
                  )}
                  <Input
                    dark
                    placeholder="Visitor OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                  />
                </div>
              )}
            </div>
          </Card>
        )}

        {tab === "emergency" && (
          <Card dark>
            <h2 className="mb-2 text-xl font-bold text-red-400">Emergency Entry</h2>
            <p className="mb-4 text-sm text-white/60">
              Ambulance, police, fire services. Creates mandatory audit log.
            </p>
            <Textarea
              dark
              rows={3}
              placeholder="Reason for emergency entry (required)"
              value={emergencyReason}
              onChange={(e) => setEmergencyReason(e.target.value)}
            />
            <Button
              size="xl"
              variant="danger"
              className="mt-4 w-full"
              onClick={handleEmergency}
              disabled={loading}
            >
              🚨 GRANT EMERGENCY ENTRY
            </Button>
          </Card>
        )}

        {tab === "exit" && (
          <Card dark>
            <h2 className="mb-4 text-xl font-bold">Log Exit</h2>
            <Input
              dark
              placeholder="Pass ID or scan exit QR"
              value={exitPassId}
              onChange={(e) => setExitPassId(e.target.value)}
            />
            <Button size="lg" className="mt-4 w-full" onClick={handleManualExit} disabled={loading}>
              Log Exit
            </Button>
          </Card>
        )}

        {tab === "incident" && (
          <Card dark>
            <h2 className="mb-4 text-xl font-bold">Report Incident</h2>
            <Textarea
              dark
              rows={4}
              placeholder="Describe the incident…"
              value={incidentDesc}
              onChange={(e) => setIncidentDesc(e.target.value)}
            />
            <Button
              size="lg"
              variant="danger"
              className="mt-4 w-full"
              onClick={submitIncident}
              disabled={loading || !incidentDesc.trim()}
            >
              Submit Report
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
}
