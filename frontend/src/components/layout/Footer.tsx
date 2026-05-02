import Link from "next/link";
import { Sparkles, Mail, Phone, MapPin } from "lucide-react";

const SHOP_LINKS = ["Electronics", "Fashion", "Beauty", "Home & Living", "Sports"];
const COMPANY_LINKS = ["About Us", "Blog", "Careers", "Press", "Sustainability"];

export function Footer() {
  return (
    <footer className="bg-gray-950 text-gray-400 pt-16 pb-8">
      <div className="page-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-display font-bold text-white">
                Shop<span className="text-brand-400">Forge</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed">
              Premium products curated for the modern lifestyle. Fast delivery, easy returns, and 24/7 support.
            </p>
            <div className="flex gap-2">
              {["Free Returns", "Secure Pay", "24/7 Support"].map((b) => (
                <span key={b} className="px-2 py-1 bg-gray-800 rounded-lg text-xs text-gray-300">{b}</span>
              ))}
            </div>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-white font-semibold mb-4">Shop</h3>
            <ul className="space-y-2.5 text-sm">
              {SHOP_LINKS.map((item) => (
                <li key={item}>
                  <Link
                    href={`/products?category=${item.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-")}`}
                    className="hover:text-brand-400 transition-colors"
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
              {COMPANY_LINKS.map((item) => (
                <li key={item}>
                  <Link href={`/${item.toLowerCase().replace(/ /g, "-")}`} className="hover:text-brand-400 transition-colors">
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3 text-sm">
              {[
                { icon: Mail,    text: "support@shopforge.com" },
                { icon: Phone,   text: "+1 (888) 123-4567" },
                { icon: MapPin,  text: "123 Commerce Ave, San Francisco CA 94105" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 mt-0.5 text-brand-400 shrink-0" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p>&copy; {new Date().getFullYear()} ShopForge. All rights reserved.</p>
          <div className="flex items-center gap-6">
            {["Privacy Policy", "Terms of Service", "Cookie Settings"].map((link) => (
              <Link key={link} href={`/${link.toLowerCase().replace(/ /g, "-")}`} className="hover:text-brand-400 transition-colors">
                {link}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
