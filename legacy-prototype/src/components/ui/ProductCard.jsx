import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Star, Eye } from 'lucide-react'
import { useCartStore, useWishlistStore } from '../../store/cartStore'
import clsx from 'clsx'

export default function ProductCard({ product }) {
  const [added, setAdded] = useState(false)
  const { addItem, openCart } = useCartStore()
  const { toggle, has } = useWishlistStore()
  const wished = has(product.id)

  const handleAddToCart = (e) => {
    e.preventDefault()
    if (product.stock === 0) return
    addItem(product)
    openCart()
    setAdded(true)
    setTimeout(() => setAdded(false), 1500)
  }

  const handleWishlist = (e) => {
    e.preventDefault()
    toggle(product)
  }

  return (
    <Link to={`/product/${product.id}`} className="group block">
      <div className="card transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-visible">
        {/* Image */}
        <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-1.5">
            {product.badge && (
              <span className={clsx('badge', product.badgeColor)}>
                {product.badge}
              </span>
            )}
            {product.discount > 0 && (
              <span className="badge bg-brand-600 text-white">
                -{product.discount}%
              </span>
            )}
            {product.stock === 0 && (
              <span className="badge bg-gray-800 text-white">
                Sold Out
              </span>
            )}
          </div>

          {/* Overlay Actions */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
            <button
              onClick={handleWishlist}
              className={clsx(
                'w-9 h-9 rounded-lg flex items-center justify-center shadow-lg transition-all duration-200',
                wished
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-red-500 hover:text-white'
              )}
              aria-label="Add to wishlist"
            >
              <Heart className={clsx('w-4 h-4', wished && 'fill-current')} />
            </button>
            <Link
              to={`/product/${product.id}`}
              onClick={e => e.stopPropagation()}
              className="w-9 h-9 bg-white text-gray-600 hover:bg-brand-600 hover:text-white rounded-lg flex items-center justify-center shadow-lg transition-all duration-200"
              aria-label="Quick view"
            >
              <Eye className="w-4 h-4" />
            </Link>
          </div>

          {/* Add to Cart */}
          <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className={clsx(
                'w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200',
                product.stock === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : added
                  ? 'bg-green-500 text-white'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg'
              )}
            >
              <ShoppingCart className="w-4 h-4" />
              {product.stock === 0 ? 'Out of Stock' : added ? 'Added!' : 'Add to Cart'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1">
            {product.category}
          </p>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-brand-600 transition-colors line-clamp-2">
            {product.name}
          </h3>

          {/* Rating */}
          <div className="flex items-center gap-1.5 mt-2">
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={clsx(
                    'w-3 h-3',
                    i < Math.floor(product.rating)
                      ? 'text-amber-400 fill-amber-400'
                      : 'text-gray-200 fill-gray-200'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {product.rating} ({product.reviews.toLocaleString()})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-lg font-bold text-gray-900">${product.price}</span>
            {product.originalPrice > product.price && (
              <span className="text-sm text-gray-400 line-through">${product.originalPrice}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
