"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Package, ShoppingBag, Archive,
  BarChart2, Settings, HelpCircle, LogOut, Plus, Menu, X,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const NAV = [
  { label: "Dashboard",  href: "/vendor/dashboard",  icon: LayoutDashboard },
  { label: "Orders",     href: "/vendor/orders",     icon: ShoppingBag },
  { label: "Products",   href: "/vendor/products",   icon: Package },
  { label: "Inventory",  href: "/vendor/inventory",  icon: Archive },
  { label: "Analytics",  href: "/vendor/analytics",  icon: BarChart2 },
];

const BOTTOM_NAV = [
  { label: "Settings",   href: "/vendor/settings",   icon: Settings },
  { label: "Support",    href: "/vendor/support",    icon: HelpCircle },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.push("/vendor-auth/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-30 w-[260px] bg-slate-900 border-r border-slate-800 flex flex-col transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}>

        {/* Brand */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-label font-semibold text-slate-400 tracking-widest">VENDOR PORTAL</p>
              <p className="text-white font-bold text-sm mt-0.5">ShopForge</p>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link key={href} href={href} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? "bg-brand-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"}`}>
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}

          {/* Add product CTA */}
          <div className="pt-4">
            <Link href="/vendor/products?new=1"
              className="flex items-center gap-2 w-full px-3 py-2.5 bg-brand-600/10 hover:bg-brand-600/20 border border-brand-600/30 text-brand-400 rounded-lg text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Add Product
            </Link>
          </div>
        </nav>

        {/* Bottom nav */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-slate-800 pt-3">
          {BOTTOM_NAV.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg text-sm transition-colors">
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
          <button
            onClick={() => { logout(); router.push("/vendor-auth/login"); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg text-sm transition-colors">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-950">
        {/* Top bar */}
        <header className="h-12 flex items-center px-4 lg:px-6 border-b border-slate-800 shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden mr-3 text-slate-400">
            <Menu className="w-5 h-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.first_name?.[0] ?? "V"}
            </div>
            <span className="text-slate-300 text-sm hidden sm:block">{user?.first_name ?? "Vendor"}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
