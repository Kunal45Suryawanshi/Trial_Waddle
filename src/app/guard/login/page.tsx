"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card, Input } from "@/components/ui";

export default function GuardLoginPage() {
  const router = useRouter();
  const [guardId, setGuardId] = useState("G001");
  const [pin, setPin] = useState("1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && ["GUARD", "SUPERVISOR"].includes(d.user.role)) {
          router.replace("/guard");
        }
      });
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/guard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guardId, pin }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Login failed");
      setLoading(false);
      return;
    }

    router.push("/guard");
  }

  return (
    <div className="guard-theme flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-white/50 hover:text-white/80">
          ← Back
        </Link>
        <div className="mt-6 mb-8 text-center">
          <div className="text-5xl">🛡️</div>
          <h1 className="mt-4 text-3xl font-bold">Guard Tablet</h1>
          <p className="mt-2 text-white/60">IIML Secure Visitor Access</p>
        </div>

        <Card dark>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-white/70">Guard ID</label>
              <Input
                dark
                value={guardId}
                onChange={(e) => setGuardId(e.target.value.toUpperCase())}
                placeholder="G001"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-white/70">PIN</label>
              <Input
                dark
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                inputMode="numeric"
                autoComplete="current-password"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" size="xl" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-white/40">
            Demo: G001 / 1234 · Supervisor: S001 / 1234
          </p>
        </Card>
      </div>
    </div>
  );
}
