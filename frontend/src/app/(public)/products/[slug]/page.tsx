"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Star, ShoppingCart, Heart, Share2,
  ChevronRight, Shield, RotateCcw, Truck, Check,
} from "lucide-react";
import api from "@/lib/api";

interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: string;
  compare_at_price?: string;
  category?: string;
  rating?: number;
  review_count?: number;
  images?: string[];
  colors?: string[];
  in_stock?: boolean;
}

const FALLBACK: Product = {
  id: "titanium-watch",
  name: "Titanium Watch",
  slug: "titanium-watch",
  description: "Precision-engineered with a brushed titanium case and sapphire crystal glass. Designed for those who value craftsmanship and understated luxury. Water-resistant to 100m, 5-day battery life.",
  price: "480.00",
  compare_at_price: "550.00",
  category: "Workspace",
  rating: 4.7,
  review_count: 124,
  in_stock: true,
  images: [
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCevfMZQ0Jdqsmp2OHWoSxexLqf3PPAX3mFaXfbt6fRa7Ql8SntpcGde_5kotkROnELB5bmgJRiAJHBKGx9R9n6nMLXFr9ZwCNbb7MnNzRP5zk2r0d3FCvekmCGoZpoP1-juDHcPbtKiB_Zzi9iEeEVOMmN9Yettpc1Uv4ALU9MgyzchWtd23qvzjzX9q1eEmrlbuhPqul2jTE5NsYF-QG22kDkGd9-GlJw5tiRT1QgJePinVnO4MwLyddrJ29jEm0WOAhbuSH-edoD",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuDDOWy8XW5w5t52eUV6V__AORRoD49mZ5dcywx-BfuN4V8IZVPXTZP5Nt4BXBGRcdJSOAW-WfxhIPile2HZfjb8ocjL9TLHsppdKz7uldL2gXvePOk02EVrUsR-jnJH77ZPe2NsRvk_qAzH2XwjuuFm0EEd6KrT72erME9t7eimZxNWHOX3Zqvx1b4vvwq5PH_4YWyeV0vPso3PdgMp9-r7kwYPq_oBvF4bm85YjEa-Qv408GQB_4Z8VuWrmq8YJLSgY5zAO9nWW4R_",
    "https://lh3.googleusercontent.com/aida-public/AB6AXuCDmbeymgaukRbf5qaT1bk6y2Tg7P16LR1DxZyPOW3nlewQDiAgpQzOWJ38Cfa_KHJBG61wf1yWcWnjpwkfVS8Vtc3Wck-m6LBJDz9kNzuhJ3k7dH75Utln6TYlCvCWo2Xwk0Q99-UIepkXN7VbhPRuRKCgZPnF0NKoL5eD4i79lwLJzNLxDkjDCl68CmoHuQCVYbvyvs9NECjHBrww9fxR4bdTcwqycJyiCbhITN62CaINNNdP8FKSu-HAEAL8EPFIiNo1J6Rr_wT4",
  ],
  colors: ["#091426", "#4f46e5", "#e5e7eb"],
};

const REVIEWS = [
  { name: "Marcus Chen",     rating: 5, date: "Apr 28, 2026", text: "The build quality is absolutely exceptional. The titanium case feels incredibly premium and the strap is comfortable even for all-day wear." },
  { name: "Elena Rodriguez", rating: 5, date: "Apr 15, 2026", text: "Bought this as a gift and the recipient was blown away. The packaging is as premium as the product itself. Highly recommend." },
  { name: "James Wilson",    rating: 4, date: "Mar 30, 2026", text: "Very impressed with the battery life and build quality. Docking one star only because the initial setup took a bit of time." },
];

const RELATED = [
  { name: "Forge Jacket",   price: "$220.00", slug: "forge-jacket",   img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDgl5YoBbO4CceyZx6IPh_3v5OOeX1XfvC5xVI0JASQVxu07f1WFkpkhNMBbHqK5lWvnNfWJc_r70aTS4RuDnOve6bcS4FsQeMUufpnKqZc8i2BDhxiMd9ROcWSHbEZtErtAV6Vox18Y2LCF5BEOzwuEEjEipkAhRoP47NgbxHP2IPdLZikWFRcm_602cmquK67ec4X-Chwjo7oQxbzHLgfUpvwTsFSxRwI7YRVCd9TbTf_Wb0-m7mJcu4NGqYCl6fPZyWRAlU54qmtb" },
  { name: "Slate Backpack",  price: "$175.00", slug: "slate-backpack",  img: "https://lh3.googleusercontent.com/aida-public/AB6AXuBeivLW_aUNZrYonYBnXNZiUfmwODPAueIXXEMZV27uL2VNdqR2LIZwCJCRI4XVpZy9EYu29sfTe4YogLe-SV93t7WhypBUy6FBnyY8yAImlgbRUAEB7sm1oi-YjoMH1i5MtM7_-jGSpItJGDT4LaNouuU-tgJJv1vROD4PO3J9JwO8dcuxFJ4_XwaPYPphLIE_ENXNTRboyfHmHaOUwgXWyWLUxCxth1oXSC9LSKUMs8sSdxItxhp45CWnSC9iiLOKh24EQLWDi8C1" },
  { name: "Desk Lamp Pro",   price: "$135.00", slug: "desk-lamp-pro",   img: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&auto=format&fit=crop&q=80" },
  { name: "Leather Wallet",  price: "$85.00",  slug: "leather-wallet",  img: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&auto=format&fit=crop&q=80" },
];

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [activeImg, setActiveImg] = useState(0);
  const [selectedColor, setSelectedColor] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);

  const { data: product } = useQuery<Product>({
    queryKey: ["product", slug],
    queryFn: () => api.get(`/products/${slug}`).then((r) => r.data),
    retry: false,
  });

  const p = product ?? FALLBACK;
  const images = p.images ?? [FALLBACK.images![0]];
  const discount = p.compare_at_price
    ? Math.round((1 - parseFloat(p.price) / parseFloat(p.compare_at_price)) * 100)
    : null;

  const handleAddToCart = () => {
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2500);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-3 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/products" className="hover:text-gray-600">Products</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-700 font-medium">{p.name}</span>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-10">
        {/* Main product section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Image gallery */}
          <div className="flex gap-4">
            {/* Thumbnails */}
            <div className="hidden sm:flex flex-col gap-3">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors shrink-0 ${
                    activeImg === i ? "border-brand-600" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            {/* Main image */}
            <div className="flex-1 aspect-square rounded-2xl overflow-hidden bg-gray-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={images[activeImg] ?? images[0]}
                alt={p.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Product info */}
          <div className="space-y-5">
            {p.category && (
              <p className="text-xs font-label font-semibold text-brand-600 uppercase tracking-widest">{p.category}</p>
            )}
            <h1 className="text-3xl font-bold text-gray-900">{p.name}</h1>

            {/* Rating */}
            {p.rating && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.floor(p.rating!) ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-600 font-medium">{p.rating}</span>
                <span className="text-sm text-gray-400">({p.review_count} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-gray-900">${p.price}</span>
              {p.compare_at_price && (
                <>
                  <span className="text-lg text-gray-400 line-through">${p.compare_at_price}</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-label font-semibold rounded-full">
                    SAVE {discount}%
                  </span>
                </>
              )}
            </div>

            <p className="text-gray-500 text-sm leading-relaxed">{p.description}</p>

            {/* Color selector */}
            {p.colors && p.colors.length > 0 && (
              <div>
                <p className="text-xs font-label font-semibold text-gray-400 uppercase tracking-wide mb-2">Color</p>
                <div className="flex gap-2">
                  {p.colors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedColor(i)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        selectedColor === i ? "border-brand-600 scale-110" : "border-transparent hover:border-gray-300"
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Qty + CTA */}
            <div className="flex items-center gap-3 pt-2">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg font-medium"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-semibold text-gray-900">{qty}</span>
                <button
                  onClick={() => setQty(qty + 1)}
                  className="w-10 h-11 flex items-center justify-center text-gray-500 hover:bg-gray-50 text-lg font-medium"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAddToCart}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
                  addedToCart
                    ? "bg-emerald-600 text-white"
                    : "bg-brand-600 hover:bg-brand-700 text-white"
                }`}
              >
                {addedToCart ? (
                  <><Check className="w-4 h-4" /> Added to Cart</>
                ) : (
                  <><ShoppingCart className="w-4 h-4" /> Add to Cart</>
                )}
              </button>
              <button className="w-11 h-11 flex items-center justify-center border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-colors">
                <Heart className="w-4 h-4" />
              </button>
              <button className="w-11 h-11 flex items-center justify-center border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500 transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
              {[
                { icon: Truck,     label: "Free Shipping", sub: "Over $100" },
                { icon: RotateCcw, label: "30-Day Returns", sub: "Hassle-free" },
                { icon: Shield,    label: "2-Year Warranty", sub: "Included" },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="flex flex-col items-center text-center gap-1.5 p-3 bg-gray-50 rounded-xl">
                  <Icon className="w-4 h-4 text-brand-600" />
                  <p className="text-xs font-semibold text-gray-700">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Customer Reviews</h2>
              <p className="text-sm text-gray-400 mt-0.5">Based on {p.review_count ?? 124} verified purchases</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <span className="font-bold text-gray-900">{p.rating ?? 4.7}</span>
            </div>
          </div>

          <div className="space-y-4">
            {REVIEWS.map((r) => (
              <div key={r.name} className="border border-gray-100 rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
                      {r.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-400">{r.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[...Array(r.rating)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Related products */}
        <div className="mt-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Complete Your Setup</h2>
            <Link href="/products" className="text-brand-600 text-sm font-semibold hover:text-brand-700">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {RELATED.map((item) => (
              <Link key={item.slug} href={`/products/${item.slug}`}
                className="group border border-gray-100 hover:border-brand-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all">
                <div className="aspect-square overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.img}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <p className="text-brand-600 font-bold text-sm mt-1">{item.price}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
