import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Star, Heart, ShoppingCart, Truck, Shield, RefreshCw,
  ChevronLeft, Plus, Minus, Check, Share2, ChevronRight
} from 'lucide-react'
import { getProductById, products } from '../data/products'
import { useCartStore, useWishlistStore } from '../store/cartStore'
import ProductCard from '../components/ui/ProductCard'
import clsx from 'clsx'

export default function ProductDetail() {
  const { id } = useParams()
  const product = getProductById(id)
  const navigate = useNavigate()
  const { addItem, openCart } = useCartStore()
  const { toggle, has } = useWishlistStore()
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [added, setAdded] = useState(false)
  const wished = product ? has(product.id) : false

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Product not found</h2>
          <Link to="/shop" className="btn-primary">Back to Shop</Link>
        </div>
      </div>
    )
  }

  const related = products
    .filter(p => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  const handleAddToCart = () => {
    if (product.stock === 0) return
    addItem(product, quantity)
    openCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const savings = product.originalPrice - product.price

  return (
    <div className="min-h-screen bg-white pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-brand-600 transition-colors">Home</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to="/shop" className="hover:text-brand-600 transition-colors">Shop</Link>
          <ChevronRight className="w-4 h-4" />
          <Link to={`/shop?cat=${product.category}`} className="hover:text-brand-600 transition-colors capitalize">
            {product.category}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium truncate max-w-xs">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12 mb-20">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square bg-gray-100 rounded-3xl overflow-hidden relative group">
              <img
                src={product.images?.[selectedImage] || product.image}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {product.discount > 0 && (
                <div className="absolute top-4 left-4">
                  <span className="badge bg-brand-600 text-white text-sm px-3 py-1">
                    -{product.discount}% OFF
                  </span>
                </div>
              )}
            </div>
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={clsx(
                      'w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all duration-200',
                      selectedImage === i ? 'border-brand-600 shadow-md shadow-brand-200' : 'border-transparent hover:border-gray-300'
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={clsx('badge', product.badgeColor)}>{product.badge}</span>
                {product.isNew && <span className="badge bg-green-100 text-green-700">New Arrival</span>}
                {product.stock === 0 && <span className="badge bg-red-100 text-red-700">Out of Stock</span>}
                {product.stock > 0 && product.stock <= 10 && (
                  <span className="badge bg-orange-100 text-orange-700">Only {product.stock} left!</span>
                )}
              </div>

              <h1 className="font-display text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
                {product.name}
              </h1>

              {/* Rating */}
              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={clsx(
                        'w-5 h-5',
                        i < Math.floor(product.rating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-gray-200 fill-gray-200'
                      )}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-900">{product.rating}</span>
                <span className="text-sm text-gray-400">({product.reviews.toLocaleString()} reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-4">
              <span className="text-4xl font-bold text-gray-900 font-display">${product.price}</span>
              {product.originalPrice > product.price && (
                <>
                  <span className="text-xl text-gray-400 line-through">${product.originalPrice}</span>
                  <span className="text-green-600 font-semibold text-sm">
                    You save ${savings}
                  </span>
                </>
              )}
            </div>

            <p className="text-gray-600 leading-relaxed">{product.description}</p>

            {/* Features */}
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Key Features</h3>
              <div className="flex flex-wrap gap-2">
                {product.features.map(feature => (
                  <span
                    key={feature}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* Quantity */}
            {product.stock > 0 && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Quantity</span>
                <div className="flex items-center bg-gray-100 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-3 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-5 py-3 text-gray-900 font-semibold text-lg min-w-[3rem] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="px-4 py-3 text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-sm text-gray-400">{product.stock} in stock</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0}
                className={clsx(
                  'flex-1 py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all duration-200',
                  product.stock === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : added
                    ? 'bg-green-500 text-white'
                    : 'btn-primary'
                )}
              >
                {added ? <><Check className="w-5 h-5" /> Added to Cart!</> : <><ShoppingCart className="w-5 h-5" /> Add to Cart</>}
              </button>
              <button
                onClick={() => toggle(product)}
                className={clsx(
                  'w-14 h-14 rounded-xl border-2 flex items-center justify-center transition-all duration-200',
                  wished
                    ? 'bg-red-50 border-red-500 text-red-500'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-red-400 hover:text-red-400'
                )}
                aria-label="Add to wishlist"
              >
                <Heart className={clsx('w-5 h-5', wished && 'fill-current')} />
              </button>
              <button
                className="w-14 h-14 rounded-xl border-2 border-gray-200 text-gray-400 hover:border-gray-300 flex items-center justify-center transition-all duration-200"
                aria-label="Share"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
              {[
                { icon: Truck, text: 'Free Shipping', sub: 'Orders over $100' },
                { icon: Shield, text: 'Secure Pay', sub: '256-bit SSL' },
                { icon: RefreshCw, text: 'Easy Returns', sub: '30-day policy' },
              ].map(({ icon: Icon, text, sub }) => (
                <div key={text} className="flex flex-col items-center text-center gap-1.5 p-3 bg-gray-50 rounded-xl">
                  <Icon className="w-5 h-5 text-brand-600" />
                  <span className="text-xs font-semibold text-gray-900">{text}</span>
                  <span className="text-xs text-gray-400">{sub}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-8">
              <h2 className="section-title">You Might Also Like</h2>
              <Link to={`/shop?cat=${product.category}`} className="text-brand-600 hover:text-brand-700 font-medium text-sm flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {related.map(p => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
