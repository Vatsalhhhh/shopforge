"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShoppingBag } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  // 2FA state
  const [twoFaRequired, setTwoFaRequired] = useState(false);
  const [twoFaToken, setTwoFaToken] = useState("");
  const [twoFaCode, setTwoFaCode] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { email, password });
      const data = res.data;

      if (data.requires_2fa) {
        setTwoFaToken(data.two_fa_token);
        setTwoFaRequired(true);
        return;
      }

      setAuth(
        {
          id: data.user_id,
          email: data.email,
          first_name: data.first_name,
          last_name: data.last_name,
          role: data.role,
          is_active: true,
          is_verified: data.email_verified,
          created_at: new Date().toISOString(),
        },
        data.access_token,
        data.refresh_token
      );

      if (data.role === "admin") router.push("/admin/dashboard");
      else router.push("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/2fa/verify", { two_fa_token: twoFaToken, code: twoFaCode });
      const data = res.data;
      setAuth(
        {
          id: data.user_id, email: data.email,
          first_name: data.first_name, last_name: data.last_name,
          role: data.role, is_active: true,
          is_verified: data.email_verified, created_at: new Date().toISOString(),
        },
        data.access_token,
        data.refresh_token
      );
      if (data.role === "admin") router.push("/admin/dashboard");
      else router.push("/");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  if (twoFaRequired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Two-factor verification</h2>
          <p className="text-gray-500 text-sm mb-6">Enter the 6-digit code from your authenticator app.</p>
          <form onSubmit={handleVerify2FA} className="space-y-4">
            <input
              className="input text-center text-2xl tracking-widest font-mono"
              maxLength={6} value={twoFaCode}
              onChange={e => setTwoFaCode(e.target.value)} placeholder="000000" required
            />
            <button type="submit" disabled={loading || twoFaCode.length < 6}
              className="btn btn-md btn-primary w-full">
              {loading ? "Verifying…" : "Verify"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-xl mb-3">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your ShopForge account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label !mb-0" htmlFor="password">Password</label>
                <Link href="/auth/forgot-password" className="text-xs text-brand-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input id="password" type={showPw ? "text" : "password"} className="input pr-10"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn btn-md btn-primary w-full">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-brand-600 font-medium hover:underline">Create one</Link>
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Are you a vendor?{" "}
            <Link href="/vendor-auth/login" className="text-brand-600 font-medium hover:underline">Vendor login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
