import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { useWishlistStore, useCartStore } from '../store/cartStore'

export default function Wishlist() {
  const { items, toggle } = useWishlistStore()
  const { addItem, openCart } = useCartStore()

  const handleAddToCart = (product) => {
    addItem(product)
    openCart()
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="section-title flex items-center gap-3">
            <Heart className="w-8 h-8 text-brand-600" />
            My Wishlist
          </h1>
          <p className="text-gray-500 mt-2">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 bg-brand-50 rounded-full flex items-center justify-center mb-6">
              <Heart className="w-12 h-12 text-brand-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Your wishlist is empty</h3>
            <p className="text-gray-400 mt-2">Save items you love by tapping the heart icon</p>
            <Link to="/shop" className="btn-primary mt-8">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map(product => (
              <div key={product.id} className="card group animate-fade-in">
                <Link to={`/product/${product.id}`} className="block aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </Link>
                <div className="p-4">
                  <Link to={`/product/${product.id}`}>
                    <h3 className="font-semibold text-gray-900 hover:text-brand-600 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                  </Link>
                  <p className="text-lg font-bold text-gray-900 mt-2">${product.price}</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={product.stock === 0}
                      className="flex-1 btn-primary text-sm py-2.5 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button
                      onClick={() => toggle(product)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-red-400 hover:bg-red-50 hover:border-red-200 transition-all"
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
