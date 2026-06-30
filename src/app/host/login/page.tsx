"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input } from "@/components/ui";

export default function HostLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("arjun.mehta@iiml.ac.in");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [devOtp, setDevOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user.role === "HOST") router.replace("/host");
      });
  }, [router]);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "send-otp", email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setLoading(false);
      return;
    }
    if (data.devOtp) setDevOtp(data.devOtp);
    setStep("otp");
    setLoading(false);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/auth/host", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify-otp", email, otp }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error);
      setLoading(false);
      return;
    }
    router.push("/host");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-white p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back
        </Link>
        <div className="mt-6 mb-8 text-center">
          <div className="text-5xl">👤</div>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Host Portal</h1>
          <p className="mt-2 text-slate-600">Register visitors & approve entry requests</p>
        </div>

        <Card>
          {step === "email" ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Institute Email
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@iiml.ac.in"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? "Sending…" : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <p className="text-sm text-slate-600">
                OTP sent to <strong>{email}</strong>
              </p>
              {devOtp && (
                <p className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
                  Dev mode OTP: <strong>{devOtp}</strong>
                </p>
              )}
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="6-digit OTP"
                inputMode="numeric"
                maxLength={6}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                Verify & Sign In
              </Button>
              <button
                type="button"
                className="w-full text-sm text-slate-500 hover:text-slate-700"
                onClick={() => setStep("email")}
              >
                Use different email
              </button>
            </form>
          )}
          <p className="mt-4 text-center text-xs text-slate-400">
            Demo: arjun.mehta@iiml.ac.in
          </p>
        </Card>
      </div>
    </div>
  );
}
