"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, Star, ChevronLeft, ChevronRight, X } from "lucide-react";
import api from "@/lib/api";

interface Product {
  id: string;
  name: string;
  slug: string;
  price: string;
  compare_at_price?: string;
  category?: string;
  rating?: number;
  review_count?: number;
  image_url?: string;
}

const CATEGORIES = ["All", "Workspace", "Apparel", "Travel", "Essentials", "Electronics"];
const SORT_OPTIONS = [
  { label: "Featured",      value: "featured" },
  { label: "Newest",        value: "newest" },
  { label: "Price: Low–High", value: "price_asc" },
  { label: "Price: High–Low", value: "price_desc" },
  { label: "Top Rated",     value: "rating" },
];

const FALLBACK_PRODUCTS: Product[] = [
  { id: "1", name: "Forge Jacket",       slug: "forge-jacket",      price: "220.00", compare_at_price: "280.00", category: "Apparel",    rating: 4.8, review_count: 142, image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuDgl5YoBbO4CceyZx6IPh_3v5OOeX1XfvC5xVI0JASQVxu07f1WFkpkhNMBbHqK5lWvnNfWJc_r70aTS4RuDnOve6bcS4FsQeMUufpnKqZc8i2BDhxiMd9ROcWSHbEZtErtAV6Vox18Y2LCF5BEOzwuEEjEipkAhRoP47NgbxHP2IPdLZikWFRcm_602cmquK67ec4X-Chwjo7oQxbzHLgfUpvwTsFSxRwI7YRVCd9TbTf_Wb0-m7mJcu4NGqYCl6fPZyWRAlU54qmtb" },
  { id: "2", name: "Slate Backpack",     slug: "slate-backpack",    price: "175.00", category: "Travel",      rating: 4.9, review_count: 98,  image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuBeivLW_aUNZrYonYBnXNZiUfmwODPAueIXXEMZV27uL2VNdqR2LIZwCJCRI4XVpZy9EYu29sfTe4YogLe-SV93t7WhypBUy6FBnyY8yAImlgbRUAEB7sm1oi-YjoMH1i5MtM7_-jGSpItJGDT4LaNouuU-tgJJv1vROD4PO3J9JwO8dcuxFJ4_XwaPYPphLIE_ENXNTRboyfHmHaOUwgXWyWLUxCxth1oXSC9LSKUMs8sSdxItxhp45CWnSC9iiLOKh24EQLWDi8C1" },
  { id: "3", name: "Titanium Watch",     slug: "titanium-watch",    price: "480.00", compare_at_price: "550.00", category: "Workspace",   rating: 4.7, review_count: 63,  image_url: "https://lh3.googleusercontent.com/aida-public/AB6AXuCDmbeymgaukRbf5qaT1bk6y2Tg7P16LR1DxZyPOW3nlewQDiAgpQzOWJ38Cfa_KHJBG61wf1yWcWnjpwkfVS8Vtc3Wck-m6LBJDz9kNzuhJ3k7dH75Utln6TYlCvCWo2Xwk0Q99-UIepkXN7VbhPRuRKCgZPnF0NKoL5eD4i79lwLJzNLxDkjDCl68CmoHuQCVYbvyvs9NECjHBrww9fxR4bdTcwqycJyiCbhITN62CaINNNdP8FKSu-HAEAL8EPFIiNo1J6Rr_wT4" },
  { id: "4", name: "Canvas Tote",        slug: "canvas-tote",       price: "95.00",  category: "Essentials",  rating: 4.6, review_count: 211, image_url: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80" },
  { id: "5", name: "Desk Lamp Pro",      slug: "desk-lamp-pro",     price: "135.00", category: "Workspace",   rating: 4.5, review_count: 87,  image_url: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&auto=format&fit=crop&q=80" },
  { id: "6", name: "Merino Crew",        slug: "merino-crew",       price: "120.00", compare_at_price: "150.00", category: "Apparel",    rating: 4.8, review_count: 175, image_url: "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=400&auto=format&fit=crop&q=80" },
  { id: "7", name: "Leather Wallet",     slug: "leather-wallet",    price: "85.00",  category: "Essentials",  rating: 4.4, review_count: 320, image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=400&auto=format&fit=crop&q=80" },
  { id: "8", name: "Wireless Earbuds",  slug: "wireless-earbuds",  price: "199.00", compare_at_price: "249.00", category: "Electronics", rating: 4.7, review_count: 504, image_url: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&auto=format&fit=crop&q=80" },
  { id: "9", name: "Laptop Stand",       slug: "laptop-stand",      price: "79.00",  category: "Workspace",   rating: 4.6, review_count: 138, image_url: "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&auto=format&fit=crop&q=80" },
];

export default function ProductsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: apiProducts } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: () => api.get("/products").then((r) => r.data),
    retry: false,
  });

  const products = apiProducts ?? FALLBACK_PRODUCTS;

  const filtered = products
    .filter((p) => {
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (category !== "All" && p.category !== category) return false;
      if (p.rating && p.rating < minRating) return false;
      if (parseFloat(p.price) > maxPrice) return false;
      return true;
    })
    .sort((a, b) => {
      if (sort === "price_asc") return parseFloat(a.price) - parseFloat(b.price);
      if (sort === "price_desc") return parseFloat(b.price) - parseFloat(a.price);
      if (sort === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return 0;
    });

  const FilterPanel = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <p className="text-xs font-label font-semibold text-gray-400 uppercase tracking-widest mb-3">Category</p>
        <div className="space-y-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                category === c
                  ? "bg-brand-50 text-brand-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <p className="text-xs font-label font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Max Price <span className="text-gray-700 normal-case">${maxPrice}</span>
        </p>
        <input
          type="range"
          min={0}
          max={1000}
          step={25}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>$0</span><span>$1000</span>
        </div>
      </div>

      {/* Min rating */}
      <div>
        <p className="text-xs font-label font-semibold text-gray-400 uppercase tracking-widest mb-3">Min Rating</p>
        <div className="flex gap-2 flex-wrap">
          {[0, 3, 4, 4.5].map((r) => (
            <button
              key={r}
              onClick={() => setMinRating(r)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                minRating === r
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-gray-200 text-gray-600 hover:border-brand-300"
              }`}
            >
              {r === 0 ? "All" : <><Star className="w-3 h-3 fill-current" />{r}+</>}
            </button>
          ))}
        </div>
      </div>

      {/* Reset */}
      {(category !== "All" || minRating > 0 || maxPrice < 1000) && (
        <button
          onClick={() => { setCategory("All"); setMinRating(0); setMaxPrice(1000); }}
          className="text-xs text-red-500 hover:text-red-600 font-semibold flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear filters
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Breadcrumb */}
      <div className="border-b border-gray-100">
        <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-3 flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-gray-600">Home</Link>
          <span>/</span>
          <span className="text-gray-700 font-medium">Products</span>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 lg:px-10 py-8">
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center gap-3 ml-auto">
            <p className="text-sm text-gray-500 hidden sm:block">
              Showing <span className="font-semibold text-gray-900">{filtered.length}</span> products
            </p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="lg:hidden flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-700"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
          </div>
        </div>

        <div className="flex gap-8">
          {/* Sidebar — desktop */}
          <aside className="hidden lg:block w-52 shrink-0">
            <FilterPanel />
          </aside>

          {/* Mobile filter drawer */}
          {filtersOpen && (
            <div className="lg:hidden fixed inset-0 z-40 flex">
              <div className="absolute inset-0 bg-black/40" onClick={() => setFiltersOpen(false)} />
              <div className="relative z-50 ml-auto w-72 bg-white h-full p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <p className="font-semibold text-gray-900">Filters</p>
                  <button onClick={() => setFiltersOpen(false)}><X className="w-5 h-5 text-gray-500" /></button>
                </div>
                <FilterPanel />
              </div>
            </div>
          )}

          {/* Product grid */}
          <div className="flex-1">
            {filtered.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-gray-400 text-sm">No products match your filters.</p>
                <button
                  onClick={() => { setSearch(""); setCategory("All"); setMinRating(0); setMaxPrice(1000); }}
                  className="mt-3 text-brand-600 text-sm font-semibold"
                >
                  Clear all
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((p) => (
                  <Link
                    key={p.id}
                    href={`/products/${p.slug}`}
                    className="group bg-white rounded-2xl border border-gray-100 hover:border-brand-200 hover:shadow-lg transition-all duration-200 overflow-hidden"
                  >
                    <div className="relative aspect-square overflow-hidden bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.image_url ?? `https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&auto=format&fit=crop&q=80`}
                        alt={p.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      {p.compare_at_price && (
                        <span className="absolute top-3 left-3 px-2 py-0.5 bg-red-500 text-white text-xs font-label font-semibold rounded-full">
                          SALE
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      {p.category && (
                        <p className="text-xs font-label font-semibold text-gray-400 uppercase tracking-wide mb-1">{p.category}</p>
                      )}
                      <p className="font-semibold text-gray-900 text-sm leading-snug">{p.name}</p>
                      <div className="flex items-center gap-1.5 mt-1.5">
                        {p.rating && (
                          <>
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs text-gray-500">{p.rating}</span>
                            {p.review_count && <span className="text-xs text-gray-400">({p.review_count})</span>}
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-brand-600 font-bold text-sm">${p.price}</span>
                        {p.compare_at_price && (
                          <span className="text-xs text-gray-400 line-through">${p.compare_at_price}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Pagination stub */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400">{filtered.length} results</p>
              <div className="flex items-center gap-1">
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button className="px-3.5 py-2 bg-brand-600 text-white text-xs font-semibold rounded-lg">1</button>
                <button className="px-3.5 py-2 text-gray-500 text-xs hover:bg-gray-100 rounded-lg">2</button>
                <button className="px-3.5 py-2 text-gray-500 text-xs hover:bg-gray-100 rounded-lg">3</button>
                <button className="p-2 rounded-lg hover:bg-gray-100 text-gray-400">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
