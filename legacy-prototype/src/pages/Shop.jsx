import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X, ChevronDown, Search } from 'lucide-react'
import ProductCard from '../components/ui/ProductCard'
import { products, categories } from '../data/products'
import clsx from 'clsx'

const sortOptions = [
  { value: 'featured', label: 'Featured' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
]

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState([0, 500])
  const [sortBy, setSortBy] = useState('featured')

  const activeCategory = searchParams.get('cat') || 'all'
  const searchQuery = searchParams.get('q') || ''

  const setCategory = (cat) => {
    const params = new URLSearchParams(searchParams)
    if (cat === 'all') params.delete('cat')
    else params.set('cat', cat)
    params.delete('q')
    setSearchParams(params)
  }

  const filtered = useMemo(() => {
    let result = products

    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory)
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      )
    }

    result = result.filter(p => p.price >= priceRange[0] && p.price <= priceRange[1])

    return [...result].sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price
      if (sortBy === 'price-desc') return b.price - a.price
      if (sortBy === 'rating') return b.rating - a.rating
      if (sortBy === 'newest') return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0)
      return 0
    })
  }, [activeCategory, searchQuery, priceRange, sortBy])

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="section-title">
            {searchQuery ? `Search: "${searchQuery}"` : activeCategory !== 'all'
              ? categories.find(c => c.id === activeCategory)?.name || 'Products'
              : 'All Products'}
          </h1>
          <p className="text-gray-500 mt-2">
            {filtered.length} product{filtered.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Filters - Desktop */}
          <aside className="hidden lg:block w-64 shrink-0 space-y-6">
            {/* Categories */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-1">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 text-left',
                      activeCategory === cat.id
                        ? 'bg-brand-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    )}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span className={clsx(
                      'ml-auto text-xs',
                      activeCategory === cat.id ? 'text-brand-200' : 'text-gray-400'
                    )}>
                      {cat.id === 'all'
                        ? products.length
                        : products.filter(p => p.category === cat.id).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Price Range</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={500}
                  step={10}
                  value={priceRange[1]}
                  onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="w-full accent-brand-600"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    max={priceRange[1]}
                    value={priceRange[0]}
                    onChange={e => setPriceRange([Number(e.target.value), priceRange[1]])}
                    className="input text-sm py-2 px-3"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    min={priceRange[0]}
                    max={500}
                    value={priceRange[1]}
                    onChange={e => setPriceRange([priceRange[0], Number(e.target.value)])}
                    className="input text-sm py-2 px-3"
                    placeholder="Max"
                  />
                </div>
              </div>
            </div>

            {/* Rating filter */}
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Customer Rating</h3>
              <div className="space-y-2">
                {[4, 3, 2, 1].map(r => (
                  <label key={r} className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="accent-brand-600 w-4 h-4 rounded" />
                    <span className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className={i < r ? 'text-amber-400' : 'text-gray-200'}>★</span>
                      ))}
                    </span>
                    <span className="text-sm text-gray-500 group-hover:text-gray-700">& above</span>
                  </label>
                ))}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Top bar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden btn-secondary gap-2 text-sm"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>

              <div className="flex items-center gap-3 ml-auto">
                <span className="text-sm text-gray-500 hidden sm:inline">Sort by:</span>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="appearance-none input py-2 px-4 pr-8 text-sm w-auto cursor-pointer"
                  >
                    {sortOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Mobile Filters */}
            {showFilters && (
              <div className="lg:hidden mb-6 card p-5 animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Filters</h3>
                  <button onClick={() => setShowFilters(false)}>
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setCategory(cat.id); setShowFilters(false) }}
                      className={clsx(
                        'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        activeCategory === cat.id
                          ? 'bg-brand-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {cat.icon} {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Products Grid */}
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Search className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900">No products found</h3>
                <p className="text-gray-500 mt-2">Try adjusting your filters or search term</p>
                <button
                  onClick={() => { setCategory('all'); setPriceRange([0, 500]) }}
                  className="btn-primary mt-6"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filtered.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
