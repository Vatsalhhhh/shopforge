"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import api from "@/lib/api";

interface Payout {
  id: string; period_start: string; period_end: string;
  gross_amount: string; deductions: string; net_amount: string;
  status: string; paid_at: string | null; payment_reference: string | null;
  notes: string | null; created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pending:    { label: "Pending",    icon: Clock,         color: "bg-amber-100 text-amber-700" },
  processing: { label: "Processing", icon: AlertCircle,   color: "bg-blue-100 text-blue-700" },
  paid:       { label: "Paid",       icon: CheckCircle,   color: "bg-green-100 text-green-700" },
  failed:     { label: "Failed",     icon: XCircle,       color: "bg-red-100 text-red-700" },
};

export default function VendorPayoutsPage() {
  const { data: payouts = [], isLoading } = useQuery<Payout[]>({
    queryKey: ["vendor-payouts"],
    queryFn: () => api.get("/vendor/payouts").then((r) => r.data),
  });

  const totalPaid = payouts
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + parseFloat(p.net_amount), 0);

  const totalPending = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + parseFloat(p.net_amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">Payouts</h1>
        <p className="text-gray-500 text-sm mt-0.5">Your payment history from ShopForge</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
          <p className="text-sm text-green-700 font-medium">Total Received</p>
          <p className="text-2xl font-bold text-green-800 mt-1">
            ${totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
          <p className="text-sm text-amber-700 font-medium">Pending Payout</p>
          <p className="text-2xl font-bold text-amber-800 mt-1">
            ${totalPending.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Payout list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : payouts.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No payouts yet</p>
          <p className="text-gray-400 text-sm mt-1">Payouts are issued after orders are delivered</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payouts.map((p) => {
            const cfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
            const Icon = cfg.icon;
            return (
              <div key={p.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge flex items-center gap-1 ${cfg.color}`}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(p.period_start).toLocaleDateString()} – {new Date(p.period_end).toLocaleDateString()}
                    </p>
                    {p.payment_reference && (
                      <p className="text-xs text-gray-400 mt-0.5 font-mono">Ref: {p.payment_reference}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      ${parseFloat(p.net_amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    {parseFloat(p.deductions) > 0 && (
                      <p className="text-xs text-red-500">
                        −${parseFloat(p.deductions).toFixed(2)} deductions
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      Gross: ${parseFloat(p.gross_amount).toFixed(2)}
                    </p>
                  </div>
                </div>
                {p.paid_at && (
                  <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-50">
                    Paid on {new Date(p.paid_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm text-gray-500">
        Payouts are processed by the ShopForge admin team after your orders are marked delivered.
        Typical processing time: 3–5 business days.
      </div>
    </div>
  );
}
