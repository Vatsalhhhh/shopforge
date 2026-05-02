"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Star, Zap, Truck, ArrowUpRight, MoreHorizontal } from "lucide-react";
import api from "@/lib/api";

interface Dashboard {
  total_orders: number; pending_orders: number; shipped_orders: number;
  delivered_orders: number; total_revenue: string; pending_payout: string;
  low_stock_count: number; rating: number | null; vendor_status: string;
}

const CHART_DATA = [62, 45, 78, 55, 88, 128, 95, 110, 75, 130];
const PERIODS = ["7D", "30D", "90D"] as const;

const RECENT_ORDERS = [
  { id: "#SF-9021", product: "Velocity X1 Runners",    color: "#ef4444", customer: "Marcus Chen",     amount: "$189.00", status: "DELIVERED",  statusColor: "text-emerald-400 bg-emerald-400/10" },
  { id: "#SF-9018", product: "Obsidian Chrono Watch",  color: "#6366f1", customer: "Elena Rodriguez", amount: "$425.50", status: "PROCESSING", statusColor: "text-brand-400 bg-brand-400/10" },
  { id: "#SF-8994", product: "SonicFlow ANC Headset",  color: "#f59e0b", customer: "James Wilson",    amount: "$299.00", status: "SHIPPED",    statusColor: "text-amber-400 bg-amber-400/10" },
  { id: "#SF-8982", product: "Metro Nomad Backpack",   color: "#10b981", customer: "Sarah Blake",     amount: "$145.00", status: "DELIVERED",  statusColor: "text-emerald-400 bg-emerald-400/10" },
];

function BarChart({ period }: { period: string }) {
  const max = Math.max(...CHART_DATA);
  return (
    <div className="flex items-end gap-1.5 h-20 mt-4">
      {CHART_DATA.map((v, i) => (
        <div
          key={i}
          className={`flex-1 rounded-sm transition-all duration-300 ${i === 5 ? "bg-brand-500" : "bg-slate-700 hover:bg-slate-600"}`}
          style={{ height: `${(v / max) * 100}%` }}
          title={`$${v}k (${period})`}
        />
      ))}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-slate-500 text-xs font-label font-semibold uppercase tracking-wide">{label}</p>
        <p className="text-white font-bold text-lg leading-tight">{value}</p>
      </div>
    </div>
  );
}

export default function VendorDashboardPage() {
  const [period, setPeriod] = useState<typeof PERIODS[number]>("30D");

  const { data } = useQuery<Dashboard>({
    queryKey: ["vendor-dashboard"],
    queryFn: () => api.get("/vendor/dashboard").then((r) => r.data),
  });

  const revenue = data ? parseFloat(data.total_revenue).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "128,430.50";
  const status = data?.vendor_status ?? "approved";

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-slate-400 text-sm mt-0.5">Welcome back, ShopForge Pro Partner.</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-label font-semibold
          ${status === "approved" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "bg-amber-400/10 text-amber-400 border border-amber-400/20"}`}>
          <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
          VENDOR STATUS: {status.toUpperCase()}
        </span>
      </div>

      {/* Revenue + stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue card */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-label font-semibold text-slate-500 uppercase tracking-widest">Revenue Performance</p>
            <div className="flex gap-1">
              {PERIODS.map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-label font-semibold transition-colors
                    ${period === p ? "bg-brand-600 text-white" : "text-slate-500 hover:text-white"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <p className="text-3xl font-bold text-white mt-3">${revenue}</p>
          <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
            <ArrowUpRight className="w-3 h-3" /> +14.3% from last month
          </p>
          <BarChart period={period} />
        </div>

        {/* Stat cards */}
        <div className="flex flex-col gap-3">
          <StatCard icon={Truck}   label="Active Shipments"  value={String(data?.shipped_orders ?? 42)}   color="bg-brand-600/20 text-brand-400" />
          <StatCard icon={Star}    label="Customer Rating"   value={data?.rating ? `${data.rating.toFixed(1)}/5.0` : "4.9/5.0"} color="bg-amber-500/20 text-amber-400" />
          <StatCard icon={Zap}     label="Conversion Rate"   value="3.24%"                                color="bg-emerald-500/20 text-emerald-400" />
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <p className="text-white font-semibold text-sm">Recent Orders</p>
          <button className="text-brand-400 text-xs font-label font-semibold hover:text-brand-300 flex items-center gap-1">
            VIEW ALL ORDERS <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {["ORDER ID", "PRODUCT", "CUSTOMER", "AMOUNT", "STATUS", "ACTIONS"].map((h) => (
                <th key={h} className="text-left px-5 py-3 text-xs font-label font-semibold text-slate-600 tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RECENT_ORDERS.map((order) => (
              <tr key={order.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="px-5 py-3.5 text-brand-400 font-mono text-xs">{order.id}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg shrink-0" style={{ background: order.color }} />
                    <span className="text-slate-200 text-sm">{order.product}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-400 text-sm">{order.customer}</td>
                <td className="px-5 py-3.5 text-white font-semibold text-sm">{order.amount}</td>
                <td className="px-5 py-3.5">
                  <span className={`px-2 py-0.5 rounded-md text-xs font-label font-semibold ${order.statusColor}`}>
                    {order.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <button className="text-slate-600 hover:text-slate-400 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bottom cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <p className="text-white font-semibold text-sm mb-1">Inventory Notice</p>
          <p className="text-slate-400 text-xs mb-4">
            {data?.low_stock_count ?? 3} items are currently running low on stock. Replenish inventory soon to avoid delivery delays for pending customer orders.
          </p>
          <button className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-lg transition-colors">
            Restock Now
          </button>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-white font-semibold text-sm">Growth Insights</p>
            <Package className="w-4 h-4 text-slate-600" />
          </div>
          <p className="text-slate-400 text-xs mb-3">
            Your shop performance is in the top 5% of your category this week.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {["#4f46e5","#7c3aed","#2563eb"].map((c, i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900" style={{ background: c }} />
              ))}
            </div>
            <span className="text-slate-500 text-xs">Shared with your team</span>
          </div>
        </div>
      </div>
    </div>
  );
}
