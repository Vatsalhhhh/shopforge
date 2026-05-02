import { Link } from 'react-router-dom'
import { X, Minus, Plus, ShoppingBag, Trash2, ArrowRight } from 'lucide-react'
import { useCartStore } from '../../store/cartStore'

export default function CartDrawer() {
  const { items, isOpen, closeCart, removeItem, updateQuantity } = useCartStore()
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const shipping = subtotal >= 100 ? 0 : 9.99

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white shadow-2xl animate-slide-in-right flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Your Cart
              {items.length > 0 && (
                <span className="ml-2 text-sm text-gray-400 font-normal">
                  ({items.reduce((s, i) => s + i.quantity, 0)} items)
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
              <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center">
                <ShoppingBag className="w-10 h-10 text-brand-300" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-lg">Your cart is empty</p>
                <p className="text-gray-400 text-sm mt-1">Add some products to get started</p>
              </div>
              <button onClick={closeCart} className="btn-primary mt-2">
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="flex gap-4 animate-fade-in">
                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                  <p className="text-brand-600 font-bold mt-0.5">${item.price}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center bg-gray-100 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-sm font-semibold text-gray-900 min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-900 shrink-0">
                  ${(item.price * item.quantity).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-6 py-6 space-y-4">
            {shipping === 0 && (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl text-green-700 text-sm font-medium">
                <span>🎉</span> You qualify for free shipping!
              </div>
            )}
            {shipping > 0 && (
              <div className="text-sm text-gray-500">
                Add <span className="text-brand-600 font-semibold">${(100 - subtotal).toFixed(2)}</span> more for free shipping
              </div>
            )}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Shipping</span>
                <span>{shipping === 0 ? 'Free' : `$${shipping.toFixed(2)}`}</span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-gray-900 pt-2 border-t border-gray-100">
                <span>Total</span>
                <span>${(subtotal + shipping).toFixed(2)}</span>
              </div>
            </div>
            <Link
              to="/checkout"
              onClick={closeCart}
              className="btn-primary w-full text-center"
            >
              Checkout <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={closeCart}
              className="btn-secondary w-full"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}
