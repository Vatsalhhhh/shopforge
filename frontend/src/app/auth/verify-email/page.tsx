"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import api from "@/lib/api";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("Missing verification token."); return; }
    api.get(`/auth/verify-email?token=${token}`)
      .then(() => { setStatus("success"); setMessage("Your email has been verified!"); })
      .catch(err => {
        const msg = err?.response?.data?.detail || "Verification failed. The link may have expired.";
        setStatus("error");
        setMessage(msg);
      });
  }, [token]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
      {status === "loading" && (
        <>
          <Loader2 className="w-12 h-12 text-brand-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Verifying your email…</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Email verified!</h2>
          <p className="text-gray-500 mb-6">{message}</p>
          <Link href="/auth/login" className="btn btn-md btn-primary">Continue to login</Link>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verification failed</h2>
          <p className="text-gray-500 mb-6">{message}</p>
          <Link href="/auth/register" className="btn btn-md btn-secondary">Back to register</Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="animate-pulse h-48 w-96 bg-gray-100 rounded-2xl" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
