"use client";

import { Suspense, useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

function VendorVerifyEmailContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    if (val && i < 5) refs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = [...digits];
    text.split("").forEach((c, i) => { next[i] = c; });
    setDigits(next);
    refs.current[Math.min(text.length, 5)]?.focus();
  };

  const code = digits.join("");

  const handleSubmit = async () => {
    if (code.length < 6) { toast.error("Enter the 6-digit code"); return; }
    setLoading(true);
    try {
      await api.get("/auth/verify-email", { params: { token: code } });
      toast.success("Email verified!");
      router.push(`/vendor-auth/verify-phone${email ? `?email=${encodeURIComponent(email)}` : ""}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post("/auth/resend-email-verification", { email });
      toast.success("Resent!");
    } catch { toast.error("Failed to resend"); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Brand */}
      <div className="text-center mb-8">
        <p className="text-white font-bold text-xl tracking-widest">SHOPFORGE</p>
        <p className="text-slate-500 text-xs tracking-widest mt-1">VENDOR PORTAL</p>
      </div>

      {/* Progress */}
      <div className="w-full max-w-sm mb-6">
        <div className="flex items-center gap-2 text-xs mb-2">
          <span className="text-slate-400">Step 1 of 3</span>
          <span className="ml-auto text-slate-500 tracking-widest">VERIFICATION</span>
        </div>
        <div className="h-1 bg-slate-800 rounded-full">
          <div className="h-1 bg-brand-500 rounded-full w-1/3" />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-brand-600/20 border border-brand-500/30 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Mail className="w-7 h-7 text-brand-400" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Verify your email</h1>
        <p className="text-slate-400 text-sm mb-6">
          We sent a 6-digit code to{" "}
          <span className="text-brand-400">{email || "your email"}</span>.<br />
          Please enter it below to confirm your account.
        </p>

        {/* OTP boxes */}
        <div className="flex gap-2 justify-center mb-6">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKey(i, e)}
              onPaste={handlePaste}
              className="w-11 h-12 text-center text-white text-xl font-bold bg-slate-800 border border-slate-700 rounded-xl focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
            />
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || code.length < 6}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm tracking-wide"
        >
          {loading ? "Verifying…" : "VERIFY ACCOUNT"}
        </button>

        <p className="text-slate-500 text-xs mt-5">
          Didn&apos;t receive the code?{" "}
          <button onClick={handleResend} className="text-brand-400 hover:text-brand-300 font-medium">
            Resend Code
          </button>
        </p>
      </div>

      <button
        onClick={() => router.push("/vendor-auth/register")}
        className="mt-6 text-slate-500 hover:text-slate-300 text-xs transition-colors"
      >
        ← Back to registration
      </button>
    </div>
  );
}

export default function VendorVerifyEmailPage() {
  return (
    <Suspense>
      <VendorVerifyEmailContent />
    </Suspense>
  );
}
