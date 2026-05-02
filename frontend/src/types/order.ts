export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export interface OrderItem {
  id: string;
  product_id?: string | null;
  sku: string;
  title: string;
  unit_price: number;
  quantity: number;
  variant?: Record<string, string> | null;
  image_url?: string | null;
  line_total: number;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  shipping_address: Record<string, string>;
  billing_address?: Record<string, string> | null;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  shipping_amount: number;
  total: number;
  coupon_code?: string | null;
  stripe_payment_intent_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  product: import("./product").Product;
  quantity: number;
  price_snapshot: number;
  line_total: number;
}

export interface Cart {
  id: string;
  user_id: string;
  items: CartItem[];
  subtotal: number;
}
