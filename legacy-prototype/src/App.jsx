import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/layout/Header'
import Footer from './components/layout/Footer'
import CartDrawer from './components/ui/CartDrawer'
import Home from './pages/Home'
import Shop from './pages/Shop'
import ProductDetail from './pages/ProductDetail'
import Wishlist from './pages/Wishlist'
import Checkout from './pages/Checkout'

function ScrollToTop() {
  const { pathname } = window.location
  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Header />
        <CartDrawer />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center pt-20">
                <div className="text-center">
                  <p className="text-8xl font-display font-bold text-gray-100 mb-4">404</p>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
                  <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
                  <a href="/" className="btn-primary">Go Home</a>
                </div>
              </div>
            } />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  )
}
