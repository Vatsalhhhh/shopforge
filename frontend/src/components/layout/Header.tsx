"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ShoppingBag, Search, Heart, Menu, X, Sparkles, User, LogOut, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { useUIStore } from "@/store/uiStore";

const NAV_LINKS = [
  { href: "/",               label: "Home" },
  { href: "/products",       label: "Shop" },
  { href: "/products?category=electronics", label: "Electronics" },
  { href: "/products?category=fashion",     label: "Fashion" },
  { href: "/products?category=beauty",      label: "Beauty" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const { isAuthenticated, user, logout } = useAuthStore();
  const { guestItemCount, openCart } = useCartStore();
  const { mobileNavOpen, toggleMobileNav, closeMobileNav, openSearch } = useUIStore();

  const itemCount = guestItemCount();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { closeMobileNav(); setUserMenuOpen(false); }, [pathname]);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    router.push("/");
  };

  const isHome = pathname === "/";

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled || !isHome
            ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100"
            : "bg-transparent"
        )}
      >
        <div className="page-container">
          <div className="flex items-center justify-between h-16 lg:h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center shadow-md group-hover:shadow-brand-300 transition-all">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className={cn(
                "text-xl font-display font-bold transition-colors",
                scrolled || !isHome ? "text-gray-900" : "text-white"
              )}>
                Shop<span className="text-gradient">Forge</span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    pathname === href
                      ? "text-brand-600 bg-brand-50"
                      : scrolled || !isHome
                      ? "text-gray-600 hover:text-brand-600 hover:bg-brand-50"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  )}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <button
                onClick={openSearch}
                aria-label="Search"
                className={cn(
                  "p-2 rounded-lg transition-all",
                  scrolled || !isHome
                    ? "text-gray-600 hover:bg-gray-100 hover:text-brand-600"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                aria-label="Wishlist"
                className={cn(
                  "p-2 rounded-lg transition-all",
                  scrolled || !isHome
                    ? "text-gray-600 hover:bg-gray-100 hover:text-brand-600"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <Heart className="w-5 h-5" />
              </Link>

              {/* Cart */}
              <button
                onClick={openCart}
                aria-label="Cart"
                className={cn(
                  "p-2 rounded-lg transition-all relative",
                  scrolled || !isHome
                    ? "text-gray-600 hover:bg-gray-100 hover:text-brand-600"
                    : "text-white/80 hover:text-white hover:bg-white/10"
                )}
              >
                <ShoppingBag className="w-5 h-5" />
                {itemCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-fade-in">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </button>

              {/* User menu */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className={cn(
                      "p-2 rounded-lg transition-all",
                      scrolled || !isHome
                        ? "text-gray-600 hover:bg-gray-100"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    )}
                    aria-label="User menu"
                  >
                    <div className="w-5 h-5 bg-brand-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {user?.first_name?.[0]?.toUpperCase() ?? "U"}
                    </div>
                  </button>
                  {userMenuOpen && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-slide-up">
                      <div className="px-4 py-2 border-b border-gray-50">
                        <p className="text-xs text-gray-400">Signed in as</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{user?.email}</p>
                      </div>
                      <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <User className="w-4 h-4" /> Profile
                      </Link>
                      <Link href="/orders" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                        <ShoppingBag className="w-4 h-4" /> Orders
                      </Link>
                      {user?.role === "admin" && (
                        <Link href="/admin/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-brand-600 hover:bg-brand-50 transition-colors">
                          <Settings className="w-4 h-4" /> Admin
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100" />
                      <button onClick={handleLogout} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors">
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  className="hidden sm:inline-flex btn btn-sm btn-primary ml-2"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile menu button */}
              <button
                onClick={toggleMobileNav}
                className={cn(
                  "lg:hidden p-2 rounded-lg transition-all ml-1",
                  scrolled || !isHome ? "text-gray-600 hover:bg-gray-100" : "text-white/80 hover:bg-white/10"
                )}
                aria-label="Menu"
              >
                {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileNavOpen && (
          <div className="lg:hidden bg-white border-t border-gray-100 shadow-lg animate-slide-up">
            <nav className="page-container py-4 flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} className="px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:text-brand-600 hover:bg-brand-50 transition-all">
                  {label}
                </Link>
              ))}
              {!isAuthenticated && (
                <Link href="/auth/login" className="mt-2 btn btn-md btn-primary w-full justify-center">
                  Sign In
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Overlay to close user menu */}
      {userMenuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
      )}
    </>
  );
}
