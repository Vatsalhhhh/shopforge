import { Link } from 'react-router-dom'
import { Sparkles, Instagram, Twitter, Facebook, Youtube, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-white">
                Luxe<span className="text-brand-400">Mart</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              Premium products curated for those who appreciate quality. Shop the finest selection with fast, reliable delivery.
            </p>
            <div className="flex items-center gap-3">
              {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
                <button
                  key={i}
                  className="w-9 h-9 bg-gray-800 hover:bg-brand-600 text-gray-400 hover:text-white rounded-lg flex items-center justify-center transition-all duration-200"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-white font-semibold mb-4">Shop</h3>
            <ul className="space-y-2.5 text-sm">
              {['All Products', 'Electronics', 'Fashion', 'Beauty', 'Home & Living', 'Sports'].map(item => (
                <li key={item}>
                  <Link
                    to={`/shop?cat=${item.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-')}`}
                    className="hover:text-brand-400 transition-colors duration-200"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2.5 text-sm">
              {['About Us', 'Careers', 'Press', 'Blog', 'Sustainability', 'Affiliate Program'].map(item => (
                <li key={item}>
                  <a href="#" className="hover:text-brand-400 transition-colors duration-200">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-brand-400 shrink-0" />
                <span>support@luxemart.com</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-0.5 text-brand-400 shrink-0" />
                <span>+1 (888) 123-4567</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 text-brand-400 shrink-0" />
                <span>123 Commerce Ave, San Francisco, CA 94105</span>
              </li>
            </ul>

            {/* Trust badges */}
            <div className="mt-6 flex flex-wrap gap-2">
              {['Free Returns', 'Secure Pay', '24/7 Support'].map(badge => (
                <span key={badge} className="px-2.5 py-1 bg-gray-800 rounded-lg text-xs text-gray-300">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p>&copy; {new Date().getFullYear()} LuxeMart. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {['Privacy Policy', 'Terms of Service', 'Cookie Settings'].map(link => (
              <a key={link} href="#" className="hover:text-brand-400 transition-colors duration-200">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
