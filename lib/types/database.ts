/** Row shape for `customers` in shop.db */
export interface CustomerRow {
  customer_id: number;
  full_name: string;
  email: string;
  gender: string;
  birthdate: string;
  created_at: string;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  customer_segment: string | null;
  loyalty_tier: string | null;
  is_active: number;
}

/** Row shape for `orders` in shop.db */
export interface OrderRow {
  order_id: number;
  customer_id: number;
  order_datetime: string;
  billing_zip: string | null;
  shipping_zip: string | null;
  shipping_state: string | null;
  payment_method: string;
  device_type: string;
  ip_country: string;
  promo_used: number;
  promo_code: string | null;
  order_subtotal: number;
  shipping_fee: number;
  tax_amount: number;
  order_total: number;
  risk_score: number;
  is_fraud: number;
}

/** Same as OrderRow plus joined `customer_name` from list queries */
export interface OrderWithCustomerRow extends OrderRow {
  customer_name: string;
}

/** Request body for creating an order (API POST) */
export interface CreateOrderInput {
  customer_id: number;
  payment_method: string;
  device_type: string;
  ip_country: string;
  order_subtotal: number;
  shipping_fee?: number;
  tax_amount?: number;
  billing_zip?: string | null;
  shipping_zip?: string | null;
  shipping_state?: string | null;
  promo_used?: number;
  promo_code?: string | null;
}
