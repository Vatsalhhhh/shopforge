"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-100 rounded-xl mb-3">
            <Mail className="w-6 h-6 text-brand-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-gray-500 text-sm mt-1">We&apos;ll send you a reset link</p>
        </div>

        {sent ? (
          <div className="text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-700 font-medium mb-2">Check your inbox</p>
            <p className="text-sm text-gray-500 mb-4">
              If <strong>{email}</strong> has an account, we sent a reset link. It expires in 30 minutes.
            </p>
            <Link href="/auth/login" className="text-brand-600 text-sm hover:underline">Back to login</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email address</label>
              <input id="email" type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <button type="submit" disabled={loading} className="btn btn-md btn-primary w-full">
              {loading ? "Sending…" : "Send reset link"}
            </button>
            <p className="text-center text-sm text-gray-500">
              <Link href="/auth/login" className="text-brand-600 hover:underline">Back to login</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
