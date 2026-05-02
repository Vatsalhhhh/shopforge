export type ProductStatus = "draft" | "active" | "archived";

export interface ProductImage {
  url: string;
  alt?: string;
  is_primary?: boolean;
}

export interface ProductVariants {
  [key: string]: string[];   // e.g. { size: ["S","M","L"], color: ["Red","Blue"] }
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  sku: string;
  description?: string | null;
  price: number;
  discount_price?: number | null;
  effective_price: number;
  stock: number;
  available_stock: number;
  is_in_stock: boolean;
  brand?: string | null;
  status: ProductStatus;
  is_featured: boolean;
  images: ProductImage[];
  variants: ProductVariants;
  category_id?: string | null;
  category?: Category | null;
  primary_image_url?: string | null;
  average_rating?: number;
  review_count?: number;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  parent_id?: string | null;
  children?: Category[];
  product_count?: number;
}

export interface ProductFilters {
  category?: string;
  q?: string;
  min_price?: number;
  max_price?: number;
  sort?: "price_asc" | "price_desc" | "rating" | "newest" | "featured";
  page?: number;
  limit?: number;
}
