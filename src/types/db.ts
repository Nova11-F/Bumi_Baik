export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "customer" | "admin";

export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "completed"
  | "cancelled"
  | "expired";

export type PaymentStatus = "initiated" | "paid" | "failed" | "expired";

export type Category = {
  id: number;
  slug: string;
  name: string;
};

export type ProductSpec = {
  label: string;
  value: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_id: number;
  price_idr: number;
  stock: number;
  co2e_avoided_kg: number;
  plastic_avoided_g: number;
  impact_note: string | null;
  sdg_goals: number[];
  specs: ProductSpec[];
  images: string[];
  is_active: boolean;
  is_featured: boolean;
  weight_g: number;
  created_at: string;
};

export type ProductWithCategory = Product & {
  categories: Pick<Category, "slug" | "name"> | null;
};

export type ProductListItem = Pick<
  Product,
  | "id"
  | "slug"
  | "name"
  | "price_idr"
  | "stock"
  | "co2e_avoided_kg"
  | "plastic_avoided_g"
  | "sdg_goals"
  | "images"
> & {
  categories: Pick<Category, "slug" | "name"> | null;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
};

export type Address = {
  id: string;
  user_id: string;
  recipient: string;
  phone: string;
  street: string;
  city: string;
  province: string;
  postal_code: string;
  is_default: boolean;
  created_at: string;
};

export type CartItem = {
  user_id: string;
  product_id: string;
  quantity: number;
  updated_at: string;
};

export type Order = {
  id: string;
  order_number: string;
  user_id: string;
  status: OrderStatus;
  subtotal_idr: number;
  shipping_idr: number;
  total_idr: number;
  total_co2e_kg: number;
  shipping_address: Json;
  shipping_method: string;
  tracking_number: string | null;
  idempotency_key: string | null;
  expires_at: string;
  created_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  unit_price_idr: number;
  quantity: number;
  co2e_avoided_kg: number;
};

export type Payment = {
  id: string;
  order_id: string;
  provider: string;
  provider_ref: string | null;
  status: PaymentStatus;
  amount_idr: number;
  payment_url: string | null;
  raw_payload: Json | null;
  created_at: string;
  paid_at: string | null;
};

export type WebhookEvent = {
  id: string;
  provider: string;
  event_id: string;
  payload: Json;
  received_at: string;
};
