export type UserRole = "customer" | "admin" | "seller" | "vendor";

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface Address {
  id: string;
  user_id: string;
  label: string;
  full_name: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone?: string | null;
  is_default: boolean;
  address_type: "shipping" | "billing";
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: User;
}
