"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { KeyRound, Eye, EyeOff, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

function ResetPasswordContent() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [form, setForm] = useState({ password: "", confirm_password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match"); return;
    }
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, ...form });
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Reset failed. Link may have expired.");
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
        <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Password reset!</h2>
        <p className="text-gray-500 mb-6">You can now log in with your new password.</p>
        <Link href="/auth/login" className="btn btn-md btn-primary">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-100 rounded-xl mb-3">
          <KeyRound className="w-6 h-6 text-brand-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900">Set new password</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="password">New password</label>
          <div className="relative">
            <input id="password" type={showPw ? "text" : "password"} className="input pr-10"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required minLength={8} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1">Min 8 chars • uppercase • number • special char</p>
        </div>
        <div>
          <label className="label" htmlFor="confirm_password">Confirm password</label>
          <input id="confirm_password" type="password" className="input"
            value={form.confirm_password}
            onChange={e => setForm(f => ({ ...f, confirm_password: e.target.value }))} required />
        </div>
        <button type="submit" disabled={loading} className="btn btn-md btn-primary w-full">
          {loading ? "Saving…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="animate-pulse h-64 w-96 bg-gray-100 rounded-2xl" />}>
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}
