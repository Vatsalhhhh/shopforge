"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, UserPlus, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function CustomerRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    password: "", confirm_password: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [emailSent, setEmailSent] = useState(true);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match"); return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setEmailSent(data.email_verification_sent !== false);
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-sm text-center">
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account created!</h2>
          {emailSent ? (
            <>
              <p className="text-gray-500 text-sm">
                We sent a verification link to <strong>{form.email}</strong>.
                Click it to activate your account.
              </p>
              <p className="text-sm text-gray-400 mt-4">
                Didn&apos;t receive it?{" "}
                <button
                  onClick={() =>
                    api.post("/auth/resend-email-verification", { email: form.email })
                      .then(() => toast.success("Resent!"))
                      .catch(() => toast.error("Failed to resend"))
                  }
                  className="text-brand-600 hover:underline"
                >
                  Resend
                </button>
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-500 text-sm">
                Your account has been created. Email delivery is not configured on this
                server — ask your administrator for the verification link, or check the
                backend logs.
              </p>
              <p className="text-sm text-gray-400 mt-4">
                Already have your link?{" "}
                <Link href="/auth/login" className="text-brand-600 hover:underline">
                  Go to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-xl mb-3">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Create account</h1>
          <p className="text-gray-500 mt-1 text-sm">Start shopping on ShopForge</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="first_name">First name</label>
                <input id="first_name" className="input" value={form.first_name} onChange={set("first_name")} required />
              </div>
              <div>
                <label className="label" htmlFor="last_name">Last name</label>
                <input id="last_name" className="input" value={form.last_name} onChange={set("last_name")} required />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={form.email} onChange={set("email")} required />
            </div>
            <div>
              <label className="label" htmlFor="phone">Phone <span className="text-gray-400">(optional)</span></label>
              <input id="phone" type="tel" className="input" placeholder="+12025551234" value={form.phone} onChange={set("phone")} />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <div className="relative">
                <input id="password" type={showPw ? "text" : "password"} className="input pr-10"
                  value={form.password} onChange={set("password")} required minLength={8} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">Min 8 chars • uppercase • number • special char</p>
            </div>
            <div>
              <label className="label" htmlFor="confirm_password">Confirm password</label>
              <input id="confirm_password" type="password" className="input" value={form.confirm_password}
                onChange={set("confirm_password")} required />
            </div>
            <button type="submit" disabled={loading}
              className="btn btn-md btn-primary w-full mt-2">
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
