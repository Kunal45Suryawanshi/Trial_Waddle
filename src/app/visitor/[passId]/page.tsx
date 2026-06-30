"use client";

import { use, useEffect, useState, useCallback } from "react";
import { StatusBadge, Card } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export default function VisitorPassPage({ params }: { params: Promise<{ passId: string }> }) {
  const { passId } = use(params);
  const [data, setData] = useState<{
    pass: {
      visitorName: string;
      visitorPhone: string;
      purpose: string;
      status: string;
      validUntil: string;
      hostName?: string;
      visitType: string;
    };
    qrDataUrl: string;
    refreshSeconds: number;
  } | null>(null);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(30);

  const refreshQr = useCallback(async () => {
    if (!passId) return;
    try {
      const res = await fetch(`/api/qr/${passId}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Failed to load pass");
        return;
      }
      setData(json);
      setCountdown(json.refreshSeconds);
      setError("");
    } catch {
      setError("Unable to load QR pass");
    }
  }, [passId]);

  useEffect(() => {
    if (passId) refreshQr();
  }, [passId, refreshQr]);

  useEffect(() => {
    if (!data) return;
    const tick = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          refreshQr();
          return data.refreshSeconds;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [data, refreshQr]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <Card className="text-center">
          <p className="text-red-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Loading pass…</p>
      </div>
    );
  }

  const { pass, qrDataUrl } = data;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600 to-blue-800 p-6 text-white">
      <div className="mx-auto max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-widest text-blue-200">IIM Lucknow</p>
          <h1 className="text-2xl font-bold">Visitor Pass</h1>
        </div>

        <Card className="overflow-hidden !p-0 text-slate-900">
          <div className="bg-slate-900 p-4 text-center text-white">
            <p className="text-2xl font-bold">{pass.visitorName}</p>
            <p className="text-sm text-slate-300">{pass.purpose}</p>
          </div>

          <div className="flex flex-col items-center p-6">
            <div className="relative rounded-2xl border-4 border-slate-100 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Visitor QR Code" width={280} height={280} />
              <div
                className="absolute inset-0 rounded-2xl border-4 border-blue-500/30 animate-pulse-ring pointer-events-none"
                style={{ opacity: countdown <= 5 ? 1 : 0 }}
              />
            </div>

            <p className="mt-4 text-center text-sm text-slate-500">
              QR refreshes in{" "}
              <span className="font-mono font-bold text-blue-600">{countdown}s</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">Single-use · Do not screenshot</p>

            <div className="mt-6 w-full space-y-2 text-sm">
              {pass.hostName && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Host</span>
                  <span className="font-medium">{pass.hostName}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Valid until</span>
                <span>{formatDateTime(pass.validUntil)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status</span>
                <StatusBadge status={pass.status} />
              </div>
            </div>
          </div>
        </Card>

        <p className="mt-6 text-center text-sm text-blue-200">
          Show this QR to security at the gate
        </p>
      </div>
    </div>
  );
}
