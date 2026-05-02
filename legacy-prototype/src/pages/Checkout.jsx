import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronRight, Lock, CreditCard, Truck, Check } from 'lucide-react'
import { useCartStore } from '../store/cartStore'

const STEPS = ['Cart', 'Shipping', 'Payment', 'Confirm']

const inputCls = 'input'

export default function Checkout() {
  const { items, clearCart } = useCartStore()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [placing, setPlacing] = useState(false)
  const [orderDone, setOrderDone] = useState(false)

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const shipping = subtotal >= 100 ? 0 : 9.99
  const tax = subtotal * 0.08
  const total = subtotal + shipping + tax

  const [shipping_form, setShippingForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '', country: 'US',
  })

  const [payment_form, setPaymentForm] = useState({
    cardName: '', cardNumber: '', expiry: '', cvv: '',
  })

  const handleShippingChange = (e) => {
    setShippingForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handlePaymentChange = (e) => {
    let value = e.target.value
    if (e.target.name === 'cardNumber') {
      value = value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
    }
    if (e.target.name === 'expiry') {
      value = value.replace(/\D/g, '').slice(0, 4)
      if (value.length >= 2) value = value.slice(0, 2) + '/' + value.slice(2)
    }
    if (e.target.name === 'cvv') {
      value = value.replace(/\D/g, '').slice(0, 4)
    }
    setPaymentForm(prev => ({ ...prev, [e.target.name]: value }))
  }

  const placeOrder = async () => {
    setPlacing(true)
    await new Promise(r => setTimeout(r, 2000))
    clearCart()
    setOrderDone(true)
    setPlacing(false)
  }

  if (items.length === 0 && !orderDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h2>
          <Link to="/shop" className="btn-primary">Browse Products</Link>
        </div>
      </div>
    )
  }

  if (orderDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-20 px-4">
        <div className="max-w-md w-full text-center animate-slide-up">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-3">Order Confirmed!</h1>
          <p className="text-gray-500 mb-2">Thank you for shopping with LuxeMart.</p>
          <p className="text-gray-500 mb-8">
            A confirmation email has been sent to <strong>{shipping_form.email || 'your email'}</strong>.
          </p>
          <div className="card p-5 text-left mb-8">
            <p className="font-semibold text-gray-900 mb-3">Order Summary</p>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Order #</span>
                <span className="font-mono font-semibold text-gray-900">
                  LM-{Math.random().toString(36).slice(2, 10).toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-bold text-gray-900">${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Delivery</span>
                <span className="font-semibold text-gray-900">3-5 Business Days</span>
              </div>
            </div>
          </div>
          <Link to="/" className="btn-primary w-full justify-center">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="section-title mb-8">Checkout</h1>

        {/* Progress */}
        <div className="flex items-center justify-center mb-10">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`flex flex-col items-center ${i > 0 ? 'hidden sm:flex' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  i < step ? 'bg-brand-600 text-white' :
                  i === step ? 'bg-brand-600 text-white ring-4 ring-brand-100' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {i < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${i <= step ? 'text-brand-600' : 'text-gray-400'}`}>
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-16 sm:w-24 mx-2 hidden sm:block transition-all ${i < step ? 'bg-brand-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            {step === 1 && (
              <div className="card p-6 animate-fade-in">
                <h2 className="font-semibold text-gray-900 text-lg mb-6 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-brand-600" /> Shipping Information
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                    <input name="firstName" value={shipping_form.firstName} onChange={handleShippingChange} className={inputCls} placeholder="John" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                    <input name="lastName" value={shipping_form.lastName} onChange={handleShippingChange} className={inputCls} placeholder="Doe" required />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input name="email" type="email" value={shipping_form.email} onChange={handleShippingChange} className={inputCls} placeholder="john@example.com" required />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                    <input name="phone" type="tel" value={shipping_form.phone} onChange={handleShippingChange} className={inputCls} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                    <input name="address" value={shipping_form.address} onChange={handleShippingChange} className={inputCls} placeholder="123 Main Street, Apt 4B" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                    <input name="city" value={shipping_form.city} onChange={handleShippingChange} className={inputCls} placeholder="New York" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                    <input name="state" value={shipping_form.state} onChange={handleShippingChange} className={inputCls} placeholder="NY" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ZIP Code</label>
                    <input name="zip" value={shipping_form.zip} onChange={handleShippingChange} className={inputCls} placeholder="10001" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                    <select name="country" value={shipping_form.country} onChange={handleShippingChange} className={inputCls}>
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="IN">India</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => setStep(2)}
                  className="btn-primary w-full mt-8 justify-center py-4"
                >
                  Continue to Payment <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="card p-6 animate-fade-in">
                <h2 className="font-semibold text-gray-900 text-lg mb-6 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-brand-600" /> Payment Details
                </h2>
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6 text-sm text-blue-700 flex items-start gap-2">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>Your payment information is encrypted and secure. We never store your card details.</span>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Cardholder Name</label>
                    <input name="cardName" value={payment_form.cardName} onChange={handlePaymentChange} className={inputCls} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Number</label>
                    <input name="cardNumber" value={payment_form.cardNumber} onChange={handlePaymentChange} className={`${inputCls} font-mono`} placeholder="1234 5678 9012 3456" maxLength={19} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Expiry Date</label>
                      <input name="expiry" value={payment_form.expiry} onChange={handlePaymentChange} className={`${inputCls} font-mono`} placeholder="MM/YY" maxLength={5} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">CVV</label>
                      <input name="cvv" value={payment_form.cvv} onChange={handlePaymentChange} className={`${inputCls} font-mono`} placeholder="123" maxLength={4} />
                    </div>
                  </div>
                </div>

                {/* Card logos */}
                <div className="flex items-center gap-3 mt-4">
                  {['VISA', 'MC', 'AMEX', 'PAYPAL'].map(card => (
                    <div key={card} className="px-3 py-1.5 bg-gray-100 rounded text-xs font-bold text-gray-500">
                      {card}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 mt-8">
                  <button onClick={() => setStep(1)} className="btn-secondary flex-1 justify-center">
                    Back
                  </button>
                  <button onClick={() => setStep(3)} className="btn-primary flex-1 justify-center">
                    Review Order <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="card p-6 animate-fade-in space-y-6">
                <h2 className="font-semibold text-gray-900 text-lg">Review & Confirm</h2>

                <div className="p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
                  <p className="font-semibold text-gray-900 mb-3">Shipping to:</p>
                  <p className="text-gray-600">{shipping_form.firstName} {shipping_form.lastName}</p>
                  <p className="text-gray-600">{shipping_form.address}</p>
                  <p className="text-gray-600">{shipping_form.city}, {shipping_form.state} {shipping_form.zip}</p>
                  <p className="text-gray-600">{shipping_form.email}</p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl text-sm">
                  <p className="font-semibold text-gray-900 mb-3">Payment:</p>
                  <p className="text-gray-600 font-mono">
                    **** **** **** {payment_form.cardNumber.replace(/\s/g, '').slice(-4) || '****'}
                  </p>
                </div>

                <div className="space-y-3">
                  {items.map(item => (
                    <div key={item.id} className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">{item.name}</p>
                        <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button onClick={() => setStep(2)} className="btn-secondary flex-1 justify-center">
                    Back
                  </button>
                  <button
                    onClick={placeOrder}
                    disabled={placing}
                    className="btn-primary flex-1 justify-center"
                  >
                    {placing ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Placing Order...
                      </span>
                    ) : (
                      <><Lock className="w-4 h-4" /> Place Order</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="space-y-4">
            <div className="card p-5 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0 relative">
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.name}</p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-2 mt-5 pt-4 border-t border-gray-100 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? <span className="text-green-600">Free</span> : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Tax (8%)</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-900 text-base pt-2 border-t border-gray-100">
                  <span>Total</span>
                  <span>${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                <Lock className="w-3.5 h-3.5" />
                <span>256-bit SSL secure checkout</span>
              </div>
            </div>

            {/* Promo code */}
            <div className="card p-5">
              <p className="text-sm font-medium text-gray-700 mb-3">Promo Code</p>
              <div className="flex gap-2">
                <input type="text" placeholder="Enter code" className="input text-sm py-2.5 flex-1" />
                <button className="btn-secondary text-sm px-4 py-2.5">Apply</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
