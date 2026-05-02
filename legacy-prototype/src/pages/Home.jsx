import { Link } from 'react-router-dom'
import { ArrowRight, Shield, Truck, RefreshCw, Headphones, Star, ChevronRight } from 'lucide-react'
import ProductCard from '../components/ui/ProductCard'
import { products, categories } from '../data/products'

const heroStats = [
  { value: '50K+', label: 'Happy Customers' },
  { value: '2K+', label: 'Products' },
  { value: '4.9', label: 'Avg Rating' },
  { value: '99%', label: 'Satisfaction' },
]

const perks = [
  { icon: Truck, title: 'Free Shipping', desc: 'On orders over $100' },
  { icon: RefreshCw, title: 'Easy Returns', desc: '30-day hassle-free returns' },
  { icon: Shield, title: 'Secure Payment', desc: '256-bit SSL encryption' },
  { icon: Headphones, title: '24/7 Support', desc: 'Always here to help' },
]

const testimonials = [
  {
    name: 'Sarah K.',
    avatar: 'https://i.pravatar.cc/40?img=1',
    rating: 5,
    text: 'Absolutely love LuxeMart! The quality is unmatched and shipping was incredibly fast. Will definitely be a repeat customer.',
  },
  {
    name: 'James T.',
    avatar: 'https://i.pravatar.cc/40?img=3',
    rating: 5,
    text: 'Found exactly what I was looking for. The product descriptions are accurate and the packaging was beautiful.',
  },
  {
    name: 'Priya M.',
    avatar: 'https://i.pravatar.cc/40?img=5',
    rating: 5,
    text: 'Customer service went above and beyond when I had a question. This is how online shopping should feel.',
  },
]

export default function Home() {
  const featured = products.slice(0, 8)
  const newArrivals = products.filter(p => p.isNew)

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-gray-950 via-dark-100 to-dark-200">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-brand-400/10 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-24 pb-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left */}
            <div className="animate-slide-up space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600/20 border border-brand-500/30 rounded-full text-brand-300 text-sm font-medium">
                <span className="w-2 h-2 bg-brand-400 rounded-full animate-pulse" />
                New Collection 2026 — Now Live
              </div>

              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight">
                Shop the{' '}
                <span className="text-gradient">Future</span>
                {' '}of Luxury
              </h1>

              <p className="text-gray-300 text-lg md:text-xl leading-relaxed max-w-lg">
                Discover premium products curated for the modern lifestyle. From cutting-edge electronics to timeless fashion — all in one place.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link to="/shop" className="btn-primary text-base px-8 py-4">
                  Shop Now <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/shop?cat=electronics" className="btn-secondary text-base px-8 py-4 bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Explore Categories
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4 pt-4 border-t border-white/10">
                {heroStats.map(stat => (
                  <div key={stat.label}>
                    <p className="text-2xl font-bold text-white font-display">{stat.value}</p>
                    <p className="text-gray-400 text-xs mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Hero product showcase */}
            <div className="relative hidden lg:block">
              <div className="relative">
                {/* Main product */}
                <div className="aspect-square max-w-md mx-auto relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-500/30 to-brand-900/50 rounded-3xl" />
                  <img
                    src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80"
                    alt="Featured product"
                    className="w-full h-full object-cover rounded-3xl mix-blend-luminosity opacity-90"
                  />

                  {/* Floating card 1 */}
                  <div className="absolute -left-8 top-1/4 bg-white rounded-2xl p-4 shadow-2xl animate-fade-in min-w-[160px]">
                    <div className="flex items-center gap-2 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-xs font-semibold text-gray-900">Editor's Pick</p>
                    <p className="text-xs text-gray-400 mt-0.5">Noise-Cancelling Headphones</p>
                  </div>

                  {/* Floating card 2 */}
                  <div className="absolute -right-4 bottom-1/4 bg-white rounded-2xl p-4 shadow-2xl animate-fade-in">
                    <p className="text-2xl font-bold text-brand-600 font-display">$299</p>
                    <p className="text-xs text-gray-400 line-through">$399</p>
                    <p className="text-xs font-semibold text-green-600 mt-1">Save 25%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 80H1440V40C1200 80 720 0 0 40V80Z" fill="white"/>
          </svg>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="section-title">Shop by Category</h2>
              <p className="section-subtitle">Find exactly what you're looking for</p>
            </div>
            <Link to="/shop" className="hidden sm:flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium text-sm">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {categories.filter(c => c.id !== 'all').map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?cat=${cat.id}`}
                className="group flex flex-col items-center gap-3 p-4 md:p-6 bg-gray-50 hover:bg-brand-50 border border-gray-100 hover:border-brand-200 rounded-2xl transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
              >
                <span className="text-3xl md:text-4xl">{cat.icon}</span>
                <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-600 text-center">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="section-title">Featured Products</h2>
              <p className="section-subtitle">Hand-picked just for you</p>
            </div>
            <Link to="/shop" className="hidden sm:flex items-center gap-1 text-brand-600 hover:text-brand-700 font-medium text-sm">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Banner */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 p-8 md:p-12">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '30px 30px'
              }} />
            </div>
            <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <p className="text-brand-200 font-semibold uppercase tracking-wider text-sm mb-2">Limited Time Offer</p>
                <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
                  Up to <span className="text-brand-200">50% Off</span>
                </h2>
                <p className="text-brand-100 text-lg mt-3 max-w-md">
                  Summer sale on select items. Don't miss out on these incredible deals!
                </p>
              </div>
              <Link
                to="/shop"
                className="shrink-0 inline-flex items-center gap-2 px-8 py-4 bg-white text-brand-700 hover:bg-brand-50 font-bold rounded-xl transition-all duration-200 shadow-xl hover:shadow-2xl text-lg"
              >
                Shop the Sale <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="section-title">New Arrivals</h2>
                <p className="section-subtitle">Fresh in — be the first to shop</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {newArrivals.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Perks */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {perks.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col items-center text-center gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-brand-200 hover:bg-brand-50 transition-all duration-200 group"
              >
                <div className="w-12 h-12 bg-brand-100 group-hover:bg-brand-200 rounded-xl flex items-center justify-center transition-colors duration-200">
                  <Icon className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{title}</p>
                  <p className="text-sm text-gray-500 mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white">
              What Our Customers Say
            </h2>
            <p className="text-gray-400 text-lg mt-3">Trusted by thousands of happy shoppers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map(t => (
              <div key={t.name} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 hover:border-brand-600/50 transition-all duration-200">
                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3 pt-4 border-t border-gray-800">
                  <img src={t.avatar} alt={t.name} className="w-9 h-9 rounded-full" />
                  <span className="text-white font-semibold text-sm">{t.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-16 bg-white">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="section-title">Stay in the Loop</h2>
          <p className="section-subtitle mx-auto">
            Get exclusive deals, new arrivals, and style tips straight to your inbox. No spam, ever.
          </p>
          <form
            className="mt-8 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            onSubmit={e => { e.preventDefault(); e.target.reset() }}
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              className="input flex-1"
            />
            <button type="submit" className="btn-primary shrink-0">
              Subscribe
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-4">
            By subscribing you agree to our Privacy Policy. Unsubscribe anytime.
          </p>
        </div>
      </section>
    </div>
  )
}
