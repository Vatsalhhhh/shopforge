"use client";

import { useState } from "react";
import Link from "next/link";
import { Store, CheckCircle, Eye, EyeOff, Mail } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

export default function VendorRegisterPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", phone: "",
    password: "", confirm_password: "",
    business_name: "", business_email: "", business_phone: "",
    business_address: "", description: "",
  });

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      toast.error("Passwords do not match"); return;
    }
    setLoading(true);
    try {
      await api.post("/vendor/register", form);
      setSubmittedEmail(form.email);
      setDone(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Registration failed");
    } finally { setLoading(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-14 h-14 text-green-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Application received!</h2>
          <div className="space-y-3 text-sm text-gray-400 mb-6 text-left bg-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-brand-400 shrink-0" />
              <span>Verify your email at <strong className="text-white">{submittedEmail}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 text-center text-xs font-bold text-amber-400">2</span>
              <span>Verify your phone number</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 text-center text-xs font-bold text-amber-400">3</span>
              <span>Admin reviews and approves your account</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 text-center text-xs font-bold text-green-400">4</span>
              <span>You&apos;re live and can start selling!</span>
            </div>
          </div>
          <p className="text-xs text-gray-500">Approval usually takes 1–2 business days.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-2xl mb-4">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white font-display">Apply to sell on ShopForge</h1>
          <p className="text-gray-400 text-sm mt-1">Start your vendor journey</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Account Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Account Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="first_name">First name *</label>
                  <input id="first_name" className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    value={form.first_name} onChange={set("first_name")} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="last_name">Last name *</label>
                  <input id="last_name" className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    value={form.last_name} onChange={set("last_name")} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="email">Email *</label>
                  <input id="email" type="email" className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    value={form.email} onChange={set("email")} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="phone">Phone *</label>
                  <input id="phone" type="tel" placeholder="+12025551234" className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    value={form.phone} onChange={set("phone")} required />
                </div>
                <div className="relative">
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="password">Password *</label>
                  <input id="password" type={showPw ? "text" : "password"} className="w-full px-4 py-2.5 pr-10 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    value={form.password} onChange={set("password")} required minLength={8} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 bottom-2.5 text-gray-400">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="confirm_password">Confirm password *</label>
                  <input id="confirm_password" type="password" className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    value={form.confirm_password} onChange={set("confirm_password")} required />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">Min 8 chars • uppercase • lowercase • number • special char</p>
            </div>

            {/* Business Info */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">Business Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="business_name">Business name *</label>
                  <input id="business_name" className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    value={form.business_name} onChange={set("business_name")} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="business_email">Business email *</label>
                  <input id="business_email" type="email" className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    value={form.business_email} onChange={set("business_email")} required />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="business_phone">Business phone *</label>
                  <input id="business_phone" type="tel" placeholder="+12025551234" className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    value={form.business_phone} onChange={set("business_phone")} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="business_address">Business address *</label>
                  <input id="business_address" className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500"
                    placeholder="123 Main St, City, State, ZIP" value={form.business_address} onChange={set("business_address")} required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm text-gray-400 mb-1.5" htmlFor="description">Description <span className="text-gray-600">(optional)</span></label>
                  <textarea id="description" rows={3} className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-500 resize-none"
                    value={form.description} onChange={set("description")} />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold rounded-xl transition-colors">
              {loading ? "Submitting…" : "Submit application"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/vendor-auth/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
