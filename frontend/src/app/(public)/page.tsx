import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Star, ChevronRight, ShoppingBag, Shield, RotateCcw, Headphones } from "lucide-react";
import { NewsletterForm } from "@/components/ui/NewsletterForm";

export const metadata: Metadata = {
  title: "ShopForge — Premium E-Commerce",
  description: "Discover premium products curated for the modern lifestyle.",
};

const COLLECTIONS = [
  {
    name: "Workspace",
    desc: "Precision tools for deep focus.",
    tag: "NEW ARRIVALS",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAFv4W0o7Cc7NT9jvRcohUiJ7CAt0PEww9vPGibQSPAFCpCJU3QYXIZc9igIOJz5zCD_Ohk7PZc-9a-bF2Ge5TtkhNjJSijUg4zhM36GndtFRIJV_gvvn93StrHSJ2RMlVfbuO0zyN1jHSMtRwShgivWs18uiEROogA0lovtHAuKyEWPoh26tHLcnpk2D81kHzBYR-9X8KQDqTTndxGLD9TnnY8k913xx-ANYNK9wkVIjmGEPmNXXMNPQ5kqn9xeKwsQHHcPHHzC_NT",
    href: "/products?category=workspace",
    span: "lg:col-span-2 lg:row-span-2",
  },
  {
    name: "Essentials",
    desc: "Built to last, made to move.",
    tag: "BEST SELLERS",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBkHui26knToH13ZQrb9bqHGvTqGj5ky9rzoJyIuUdpgo0HErWgkEuHkyNB-OZrEUFQ8CIPj3sR9x9YBNiOGGoCvDQ24Rl4AHp4bFDJpykWZi9yUAyixSDuFsVWtQQlNG93ImzOCYEh1yUQhV2HVjVvv1_-vkmcTzt2P9py7hZ_T8Z-0WLQyE4QOtm8Z5YztL4ZZc6I1r3oNFO-PWOJ03Q1xOgYkpEL1AGVyAbFGBQwivAeMPdH32S1-TpxHccHBgj_W6_Xy1N10vLR",
    href: "/products?category=essentials",
    span: "",
  },
  {
    name: "Travel",
    desc: "Engineer your journey.",
    tag: "FEATURED",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCa1Jgvx34IRlevFLaDaYY-bLvPt3Svt7Ism5gCUcUJ1RhpbaZ-aS4ull16xM6w9pnHk7sBbs1ygmWvA6zWARaCIGo5k63bEFT6K3rbdGyqSlT4KpqFPh1DlhvKGYHjpVvH3SaaUSNeqrOeU9yW4IciSMvXCDdjgJEbWHacJ4Zn0LJHLYlH1URTprA4ISWRcR5Pwx3x-dM1yZwiVQmqnQd8x4kTMtDZz9xTkodbhdxKIxhikzZJ348-Cleel69YzVOVD37VlcL37N0F",
    href: "/products?category=travel",
    span: "",
  },
];

const FEATURED = [
  {
    name: "Forge Jacket",
    price: "$220.00",
    tag: "NEW",
    slug: "forge-jacket",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDgl5YoBbO4CceyZx6IPh_3v5OOeX1XfvC5xVI0JASQVxu07f1WFkpkhNMBbHqK5lWvnNfWJc_r70aTS4RuDnOve6bcS4FsQeMUufpnKqZc8i2BDhxiMd9ROcWSHbEZtErtAV6Vox18Y2LCF5BEOzwuEEjEipkAhRoP47NgbxHP2IPdLZikWFRcm_602cmquK67ec4X-Chwjo7oQxbzHLgfUpvwTsFSxRwI7YRVCd9TbTf_Wb0-m7mJcu4NGqYCl6fPZyWRAlU54qmtb",
    rating: 4.8,
  },
  {
    name: "Slate Backpack",
    price: "$175.00",
    tag: "BEST SELLER",
    slug: "slate-backpack",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBeivLW_aUNZrYonYBnXNZiUfmwODPAueIXXEMZV27uL2VNdqR2LIZwCJCRI4XVpZy9EYu29sfTe4YogLe-SV93t7WhypBUy6FBnyY8yAImlgbRUAEB7sm1oi-YjoMH1i5MtM7_-jGSpItJGDT4LaNouuU-tgJJv1vROD4PO3J9JwO8dcuxFJ4_XwaPYPphLIE_ENXNTRboyfHmHaOUwgXWyWLUxCxth1oXSC9LSKUMs8sSdxItxhp45CWnSC9iiLOKh24EQLWDi8C1",
    rating: 4.9,
  },
  {
    name: "Titanium Watch",
    price: "$480.00",
    tag: "LIMITED",
    slug: "titanium-watch",
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCDmbeymgaukRbf5qaT1bk6y2Tg7P16LR1DxZyPOW3nlewQDiAgpQzOWJ38Cfa_KHJBG61wf1yWcWnjpwkfVS8Vtc3Wck-m6LBJDz9kNzuhJ3k7dH75Utln6TYlCvCWo2Xwk0Q99-UIepkXN7VbhPRuRKCgZPnF0NKoL5eD4i79lwLJzNLxDkjDCl68CmoHuQCVYbvyvs9NECjHBrww9fxR4bdTcwqycJyiCbhITN62CaINNNdP8FKSu-HAEAL8EPFIiNo1J6Rr_wT4",
    rating: 4.7,
  },
  {
    name: "Canvas Tote",
    price: "$95.00",
    tag: "CLASSIC",
    slug: "canvas-tote",
    img: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80",
    rating: 4.6,
  },
];

const PERKS = [
  { icon: ShoppingBag,  title: "Free Shipping",  desc: "On all orders over $100" },
  { icon: RotateCcw,    title: "Easy Returns",   desc: "30-day hassle-free policy" },
  { icon: Shield,       title: "Secure Payment", desc: "256-bit SSL encryption" },
  { icon: Headphones,   title: "24/7 Support",   desc: "Always here to help" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-surface-bright" style={{ background: "#fbf8fa" }}>
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-20 lg:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Copy */}
            <div className="space-y-6">
              <p className="text-xs font-label font-semibold text-brand-600 uppercase tracking-widest">
                New Collection — Spring 2026
              </p>
              <h1 className="font-display text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Craft your<br />
                <span className="text-brand-600">perfect</span> space.
              </h1>
              <p className="text-gray-500 text-lg leading-relaxed max-w-md">
                Precision-curated products for the modern workspace and home. Built for speed, designed for clarity.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link href="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl text-sm transition-colors">
                  Shop Now <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/products?category=workspace"
                  className="inline-flex items-center gap-2 px-6 py-3 border border-gray-200 text-gray-700 hover:border-brand-300 hover:text-brand-600 font-semibold rounded-xl text-sm transition-colors">
                  Explore Collections
                </Link>
              </div>
              {/* Trust strip */}
              <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                {[["50K+","Customers"], ["4.9★","Avg Rating"], ["Free","Shipping"]].map(([v, l]) => (
                  <div key={l}>
                    <p className="text-sm font-bold text-gray-900">{v}</p>
                    <p className="text-xs text-gray-400">{l}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero image */}
            <div className="relative hidden lg:block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=700&auto=format&fit=crop&q=80"
                alt="Premium lifestyle"
                className="w-full h-[520px] object-cover rounded-3xl"
              />
              {/* Floating card */}
              <div className="absolute bottom-8 left-8 bg-white rounded-2xl px-4 py-3 shadow-xl flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center text-brand-600">
                  <Star className="w-5 h-5 fill-brand-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-label">EDITOR&apos;S PICK</p>
                  <p className="text-sm font-bold text-gray-900">Forge Jacket — $220</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Collections grid ─────────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-6 lg:px-10 py-20">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs font-label font-semibold text-gray-400 uppercase tracking-widest mb-1">Curated For You</p>
            <h2 className="text-2xl font-bold text-gray-900">Shop Collections</h2>
          </div>
          <Link href="/products" className="hidden sm:flex items-center gap-1 text-brand-600 hover:text-brand-700 text-sm font-semibold">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {COLLECTIONS.map((col, i) => (
            <Link
              key={col.name}
              href={col.href}
              className={`group relative overflow-hidden rounded-2xl ${i === 0 ? "md:row-span-2 md:col-span-1" : ""}`}
              style={{ minHeight: i === 0 ? "480px" : "220px" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={col.img}
                alt={col.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-0 left-0 p-6">
                <span className="text-xs font-label font-semibold text-brand-300 uppercase tracking-widest">{col.tag}</span>
                <h3 className="text-xl font-bold text-white mt-1">{col.name}</h3>
                <p className="text-gray-300 text-sm mt-1">{col.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured Products ─────────────────────────────────── */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs font-label font-semibold text-gray-400 uppercase tracking-widest mb-1">Hand-Picked</p>
              <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
            </div>
            <Link href="/products" className="hidden sm:flex items-center gap-1 text-brand-600 text-sm font-semibold">
              See all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURED.map((p) => (
              <Link key={p.slug} href={`/products/${p.slug}`} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-200">
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.img}
                    alt={p.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <span className="absolute top-3 left-3 px-2 py-0.5 bg-brand-600 text-white text-xs font-label font-semibold rounded-full">
                    {p.tag}
                  </span>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-brand-600 font-bold">{p.price}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-xs text-gray-500">{p.rating}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Brand CTA ─────────────────────────────────────────── */}
      <section className="bg-gray-900 py-20">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 text-center">
          <p className="text-xs font-label font-semibold text-brand-400 uppercase tracking-widest mb-4">ShopForge Promise</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">Precision curated.<br />Built for clarity.</h2>
          <p className="text-gray-400 text-base max-w-xl mx-auto mb-8">
            Every product is vetted by our team for quality, durability, and design. No compromises.
          </p>
          <Link href="/products"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-gray-900 hover:bg-gray-100 font-bold rounded-xl text-sm transition-colors">
            Browse All Products <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Perks ────────────────────────────────────────────── */}
      <section className="py-16 bg-white border-t border-gray-100">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {PERKS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Newsletter ───────────────────────────────────────── */}
      <section className="py-20 bg-brand-600">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <p className="text-xs font-label font-semibold text-brand-200 uppercase tracking-widest mb-3">Stay In The Loop</p>
          <h2 className="text-3xl font-bold text-white mb-3">Get exclusive drops first.</h2>
          <p className="text-brand-200 text-sm mb-8">Join 50,000+ subscribers for curated deals, new arrivals, and insider tips.</p>
          <NewsletterForm dark />
        </div>
      </section>
    </div>
  );
}
