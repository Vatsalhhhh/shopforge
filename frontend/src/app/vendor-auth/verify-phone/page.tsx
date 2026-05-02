"use client";

import { Suspense, useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

const STEPS = ["Account Details", "Verification", "Launch"];

function VendorVerifyPhoneContent() {
  const router = useRouter();
  const params = useSearchParams();
  const phone = params.get("phone") ?? "";

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
      await api.post("/auth/verify-phone-otp", { phone, code });
      toast.success("Phone verified! Awaiting admin approval.");
      router.push("/vendor-auth/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg ?? "Invalid or expired code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      await api.post("/auth/send-phone-otp", { phone });
      toast.success("SMS resent!");
    } catch { toast.error("Failed to resend"); }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Brand */}
      <p className="text-white font-bold text-2xl tracking-widest mb-8">SHOPFORGE</p>

      {/* Progress stepper */}
      <div className="flex items-center gap-0 mb-10">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                ${i === 0 ? "bg-brand-600 text-white" : i === 1 ? "border-2 border-brand-500 text-brand-400" : "border border-slate-700 text-slate-600"}`}>
                {i === 0 ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`text-xs mt-1.5 font-label ${i === 1 ? "text-brand-400 font-semibold" : i === 0 ? "text-slate-400" : "text-slate-600"}`}>
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-16 h-0.5 mb-5 mx-1 ${i === 0 ? "bg-brand-600" : "bg-slate-800"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Secure your account</h1>
        <p className="text-slate-400 text-sm mb-8">
          Enter the 2FA code sent to your phone via SMS to<br />complete the vendor verification process.
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
          onClick={handleResend}
          className="flex items-center gap-1.5 mx-auto text-slate-400 text-xs mb-6 hover:text-slate-300 transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          Didn&apos;t receive a code? <span className="text-brand-400 font-medium">Resend SMS</span>
        </button>

        <button
          onClick={handleSubmit}
          disabled={loading || code.length < 6}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors text-sm"
        >
          {loading ? "Verifying…" : "Complete Setup →"}
        </button>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-2 mt-8">
          <div className="flex -space-x-2">
            {["#4f46e5","#7c3aed","#0284c7"].map((c, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-slate-950" style={{ background: c }} />
            ))}
          </div>
          <span className="text-slate-500 text-xs font-label font-semibold tracking-wide">JOIN 12K+ GLOBAL VENDORS</span>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 text-slate-600 text-xs font-label">
          <span className="flex items-center gap-1">🔒 END-TO-END ENCRYPTED</span>
          <span className="flex items-center gap-1">🛡️ PCI DSS COMPLIANT</span>
        </div>
      </div>
    </div>
  );
}

export default function VendorVerifyPhonePage() {
  return (
    <Suspense>
      <VendorVerifyPhoneContent />
    </Suspense>
  );
}
