"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Download, CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, ChevronLeft, ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface Vendor {
  id: string; business_name: string; business_email: string;
  status: string; category?: string; created_at: string;
  total_orders: number; rating: number | null;
}

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
  pending:   { label: "Pending",   dot: "bg-amber-400" },
  approved:  { label: "Approved",  dot: "bg-emerald-400" },
  suspended: { label: "Suspended", dot: "bg-orange-400" },
  rejected:  { label: "Rejected",  dot: "bg-red-400" },
};

const CATEGORIES = ["Outdoors","Furniture","Apparel","Food","Electronics","Lifestyle"];

export default function AdminVendorsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["admin-vendors", statusFilter],
    queryFn: () =>
      api.get("/admin/vendors", { params: { vendor_status: statusFilter || undefined } })
        .then((r) => r.data),
  });

  const approve = useMutation({
    mutationFn: (id: string) => api.post(`/admin/vendors/${id}/approve`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-vendors"] }); toast.success("Approved"); setSelected(null); },
  });
  const reject = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/admin/vendors/${id}/reject`, { reason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-vendors"] }); toast.success("Rejected"); setRejectId(null); setSelected(null); },
  });
  const suspend = useMutation({
    mutationFn: (id: string) => api.post(`/admin/vendors/${id}/suspend`, { reason: "Admin action" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-vendors"] }); toast.success("Suspended"); setSelected(null); },
  });

  const filtered = vendors.filter((v) =>
    v.business_name.toLowerCase().includes(search.toLowerCase()) ||
    v.business_email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    pending: vendors.filter((v) => v.status === "pending").length,
    avgTime: "4.2h",
    approvalRate: vendors.length
      ? Math.round((vendors.filter((v) => v.status === "approved").length / vendors.length) * 100)
      : 68,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Approvals</h1>
          <p className="text-gray-500 text-sm mt-0.5">Review and manage pending partner applications for the ShopForge ecosystem.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl hover:bg-brand-700 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Applications", value: stats.pending, delta: "+12%", icon: Clock, deltaColor: "text-emerald-600" },
          { label: "Avg. Review Time",      value: stats.avgTime, delta: "-0.5h", icon: CheckCircle, deltaColor: "text-red-500" },
          { label: "Approval Rate",          value: `${stats.approvalRate}%`, delta: "-3%", icon: AlertTriangle, deltaColor: "text-red-500" },
        ].map(({ label, value, delta, deltaColor }) => (
          <div key={label} className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-gray-500 text-xs font-label font-semibold uppercase tracking-wide">{label}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              <span className={`text-xs font-semibold ${deltaColor}`}>{delta}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search applications…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Status</option>
          {Object.entries(STATUS_CFG).map(([v, { label }]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100">
                <tr>
                  {["VENDOR NAME","EMAIL ADDRESS","APPLICATION DATE","CATEGORY","ACTIONS"].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-label font-semibold text-gray-400 tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((v) => {
                  const cfg = STATUS_CFG[v.status];
                  const initials = v.business_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  const cat = v.category ?? CATEGORIES[Math.abs(v.id.charCodeAt(0) % CATEGORIES.length)];
                  return (
                    <tr
                      key={v.id}
                      onClick={() => setSelected(selected?.id === v.id ? null : v)}
                      className={`cursor-pointer transition-colors ${selected?.id === v.id ? "bg-brand-50" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{v.business_name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot ?? "bg-gray-400"}`} />
                              <span className="text-xs text-gray-400">{cfg?.label ?? v.status}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">{v.business_email}</td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {new Date(v.created_at).toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-label font-semibold uppercase">
                          {cat}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1.5">
                          {v.status === "pending" && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); approve.mutate(v.id); }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors">
                                Approve
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setRejectId(v.id); }}
                                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors">
                                Reject
                              </button>
                            </>
                          )}
                          {v.status === "approved" && (
                            <button onClick={(e) => { e.stopPropagation(); suspend.mutate(v.id); }}
                              className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 text-xs font-semibold rounded-lg transition-colors">
                              Suspend
                            </button>
                          )}
                          {v.status === "suspended" && (
                            <button onClick={(e) => { e.stopPropagation(); approve.mutate(v.id); }}
                              className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-semibold rounded-lg transition-colors">
                              Reinstate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {/* Pagination stub */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
              <span>Showing 1–{filtered.length} of {filtered.length}</span>
              <div className="flex gap-1">
                <button className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft className="w-3.5 h-3.5" /></button>
                <button className="px-3 py-1.5 bg-brand-600 text-white rounded-lg font-semibold">1</button>
                <button className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Application detail panel */}
      {selected && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-xs font-label font-semibold text-gray-400 uppercase tracking-wide">Application Details</p>
              <h3 className="text-xl font-bold text-gray-900 mt-0.5">{selected.business_name}</h3>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 font-label">COMPLIANCE SCORE</p>
              <div className="mt-1.5 w-40 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: "88%" }} />
              </div>
              <p className="text-xs font-semibold text-emerald-600 mt-1">88% — Excellent</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-label font-semibold text-gray-400 uppercase tracking-wide mb-2">Business Narrative</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                A dedicated marketplace vendor focused on delivering high-quality products. All items are ethically sourced and certified for extreme durability.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-label">CATALOG SIZE</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">{selected.total_orders > 0 ? "142 SKUs" : "—"}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 font-label">EST. REVENUE</p>
                  <p className="text-base font-bold text-gray-900 mt-0.5">$1.2M / yr</p>
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs font-label font-semibold text-gray-400 uppercase tracking-wide mb-2">Documentation Verification</p>
              <div className="space-y-2.5">
                {[
                  { label: "Tax Identification", ok: true },
                  { label: "Liability Insurance", ok: true },
                  { label: "Quality Assurance Cert.", ok: false, note: "AWAITING" },
                ].map(({ label, ok, note }) => (
                  <div key={label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {ok ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Clock className="w-4 h-4 text-amber-500" />}
                      <span className="text-sm text-gray-700">{label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {note && <span className="text-xs text-amber-600 font-label font-semibold">{note}</span>}
                      <button className="flex items-center gap-1 text-brand-600 text-xs font-semibold hover:text-brand-700">
                        <FileText className="w-3.5 h-3.5" /> VIEW FILE
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {selected.status === "pending" && (
            <div className="flex gap-3 mt-6 pt-5 border-t border-gray-100">
              <button
                onClick={() => approve.mutate(selected.id)}
                disabled={approve.isPending}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm disabled:opacity-50 transition-colors"
              >
                APPROVE
              </button>
              <button
                onClick={() => setRejectId(selected.id)}
                className="px-6 py-2.5 bg-red-100 hover:bg-red-200 text-red-700 font-semibold rounded-xl text-sm transition-colors"
              >
                REJECT
              </button>
            </div>
          )}
        </div>
      )}

      {/* Reject modal */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-bold text-gray-900 mb-3">Reject Application</h3>
            <textarea rows={3} placeholder="Reason for rejection (required)…"
              value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => reject.mutate({ id: rejectId, reason: rejectReason })}
                disabled={rejectReason.length < 10 || reject.isPending}
                className="px-5 py-2.5 bg-red-600 text-white font-semibold rounded-xl text-sm disabled:opacity-50"
              >Confirm Reject</button>
              <button onClick={() => setRejectId(null)} className="px-5 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
