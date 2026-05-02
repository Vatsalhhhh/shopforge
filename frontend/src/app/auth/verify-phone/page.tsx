"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function VerifyPhonePage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "otp" | "done">("phone");
  const [loading, setLoading] = useState(false);

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/send-phone-otp", { phone });
      setStep("otp");
      toast.success("Code sent to your phone");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Failed to send code");
    } finally { setLoading(false); }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/verify-phone-otp", { phone, code });
      setStep("done");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Invalid code");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-100 rounded-xl mb-3">
            <Phone className="w-6 h-6 text-brand-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Verify your phone</h1>
        </div>

        {step === "phone" && (
          <form onSubmit={sendOTP} className="space-y-4">
            <div>
              <label className="label">Phone number</label>
              <input type="tel" className="input" placeholder="+12025551234"
                value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn btn-md btn-primary w-full">
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={verifyOTP} className="space-y-4">
            <p className="text-sm text-gray-500 text-center">Enter the 6-digit code sent to {phone}</p>
            <input className="input text-center text-2xl tracking-widest font-mono"
              maxLength={6} value={code} onChange={e => setCode(e.target.value)}
              placeholder="000000" required />
            <button type="submit" disabled={loading || code.length < 6} className="btn btn-md btn-primary w-full">
              {loading ? "Verifying…" : "Verify"}
            </button>
            <button type="button" onClick={() => setStep("phone")}
              className="text-sm text-brand-600 hover:underline w-full text-center">
              Change number
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-900 mb-1">Phone verified!</p>
            <p className="text-sm text-gray-500 mb-6">Your number {phone} is verified.</p>
            <button onClick={() => router.back()} className="btn btn-md btn-primary w-full">Continue</button>
          </div>
        )}
      </div>
    </div>
  );
}
