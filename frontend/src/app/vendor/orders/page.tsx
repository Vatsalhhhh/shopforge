"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, Truck, ChevronDown, ChevronUp, Package } from "lucide-react";
import toast from "react-hot-toast";
import api from "@/lib/api";

interface VendorOrder {
  id: string; order_id: string; status: string;
  wholesale_total: string; platform_margin: string;
  vendor_notes: string | null; created_at: string; updated_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  new:             "bg-blue-100 text-blue-700",
  sent_to_vendor:  "bg-purple-100 text-purple-700",
  vendor_accepted: "bg-indigo-100 text-indigo-700",
  processing:      "bg-amber-100 text-amber-700",
  shipped:         "bg-cyan-100 text-cyan-700",
  delivered:       "bg-green-100 text-green-700",
  cancelled:       "bg-red-100 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  new:             "New", sent_to_vendor: "Sent to You",
  vendor_accepted: "Accepted", processing: "Processing",
  shipped:         "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

function OrderRow({ order }: { order: VendorOrder }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [shipForm, setShipForm] = useState({ carrier_name: "", tracking_number: "", notes: "" });

  const actionMutation = useMutation({
    mutationFn: ({ action, body }: { action: string; body?: Record<string, unknown> }) =>
      api.post(`/vendor/orders/${order.id}/${action}`, body ?? {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-orders"] });
      toast.success("Order updated");
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Action failed");
    },
  });

  const handleShip = (e: React.FormEvent) => {
    e.preventDefault();
    actionMutation.mutate({ action: "ship", body: shipForm });
  };

  const canAccept   = ["new", "sent_to_vendor"].includes(order.status);
  const canProcess  = order.status === "vendor_accepted";
  const canShip     = order.status === "processing";
  const canDeliver  = order.status === "shipped";

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {/* Row header */}
      <div
        className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">Order #{order.order_id.slice(-8).toUpperCase()}</p>
          <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`badge text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-600"}`}>
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900">${parseFloat(order.wholesale_total).toFixed(2)}</p>
          <p className="text-xs text-gray-400">wholesale</p>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-6 py-5 bg-gray-50 space-y-4">
          {/* Financials */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-gray-500 text-xs">Your Payout</p>
              <p className="font-bold text-green-600">${parseFloat(order.wholesale_total).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl p-3 border border-gray-100">
              <p className="text-gray-500 text-xs">Platform Margin</p>
              <p className="font-bold text-gray-700">${parseFloat(order.platform_margin).toFixed(2)}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {canAccept && (
              <button
                onClick={() => actionMutation.mutate({ action: "accept", body: {} })}
                disabled={actionMutation.isPending}
                className="btn btn-sm bg-brand-600 text-white hover:bg-brand-700"
              >
                Accept Order
              </button>
            )}
            {canProcess && (
              <button
                onClick={() => actionMutation.mutate({ action: "process" })}
                disabled={actionMutation.isPending}
                className="btn btn-sm bg-amber-500 text-white hover:bg-amber-600"
              >
                Mark Processing
              </button>
            )}
            {canDeliver && (
              <button
                onClick={() => actionMutation.mutate({ action: "deliver" })}
                disabled={actionMutation.isPending}
                className="btn btn-sm bg-green-600 text-white hover:bg-green-700"
              >
                Mark Delivered
              </button>
            )}
          </div>

          {/* Ship form */}
          {canShip && (
            <form onSubmit={handleShip} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="font-medium text-sm text-gray-900 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Add Shipping Info
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">Carrier</label>
                  <input
                    className="input text-sm py-2"
                    value={shipForm.carrier_name}
                    onChange={(e) => setShipForm((f) => ({ ...f, carrier_name: e.target.value }))}
                    placeholder="FedEx, UPS, USPS…"
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs">Tracking Number</label>
                  <input
                    className="input text-sm py-2"
                    value={shipForm.tracking_number}
                    onChange={(e) => setShipForm((f) => ({ ...f, tracking_number: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label text-xs">Notes (optional)</label>
                <input
                  className="input text-sm py-2"
                  value={shipForm.notes}
                  onChange={(e) => setShipForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <button type="submit" disabled={actionMutation.isPending} className="btn btn-sm bg-cyan-600 text-white hover:bg-cyan-700">
                <Truck className="w-3.5 h-3.5" /> Mark as Shipped
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function VendorOrdersPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");

  const { data: orders = [], isLoading } = useQuery<VendorOrder[]>({
    queryKey: ["vendor-orders", statusFilter],
    queryFn: () =>
      api.get("/vendor/orders", { params: statusFilter ? { order_status: statusFilter } : {} })
        .then((r) => r.data),
  });

  const STATUSES = ["", "new", "sent_to_vendor", "vendor_accepted", "processing", "shipped", "delivered", "cancelled"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 font-display">Orders</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage and fulfill your customer orders</p>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {s ? STATUS_LABEL[s] : "All Orders"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
          <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No orders yet</p>
          <p className="text-gray-400 text-sm mt-1">Orders will appear here when customers buy your products</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => <OrderRow key={o.id} order={o} />)}
        </div>
      )}
    </div>
  );
}
