export interface PaymobIntentionPayload {
  amount: number; // amount in cents
  currency: string;
  payment_methods: number[]; // integration IDs
  items: PaymobItem[];
  billing_data: PaymobBillingData;
  extras?: Record<string, any>;
  special_reference: string; // merchant_order_id
  notification_url?: string;
  redirection_url?: string;
}

export interface PaymobItem {
  name: string;
  amount: number; // amount in cents
  description: string;
  quantity: number;
}

export interface PaymobBillingData {
  apartment: string;
  first_name: string;
  last_name: string;
  street: string;
  building: string;
  phone_number: string;
  city: string;
  country: string;
  email: string;
  floor: string;
  state: string;
}

export interface PaymobIntentionResponse {
  id: number;
  client_secret: string;
  // Add other response fields as needed
}

export interface PaymobRefundPayload {
  transaction_id: string;
  amount_cents: string; // amount to be refunded
}

export interface PaymobRefundResponse {
  id: number;
  pending: boolean;
  amount_cents: number;
  success: boolean;
  is_auth: boolean;
  is_capture: boolean;
  is_standalone_payment: boolean;
  is_voided: boolean;
  is_refunded: boolean;
  is_3d_secure: boolean;
  integration_id: number;
  profile_id: number;
  has_parent_transaction: boolean;
  order: PaymobOrder;
  created_at: string;
  transaction_processed_callback_responses: any[];
  currency: string;
  source_data: any;
  api_source: string;
  terminal_id: any;
  merchant_commission: number;
  installment: any;
  discount_details: any[];
  is_void: boolean;
  is_refund: boolean;
  data: any;
  is_hidden: boolean;
  payment_key_claims: any;
  error_occured: boolean;
  is_live: boolean;
  other_endpoint_reference: any;
  refunded_amount_cents: number;
  source_id: number;
  is_captured: boolean;
  captured_amount: number;
  merchant_staff_tag: any;
  updated_at: string;
  is_settled: boolean;
  bill_balanced: boolean;
  is_bill: boolean;
  owner: number;
  parent_transaction: number;
}

export interface PaymobOrder {
  id: number;
  created_at: string;
  delivery_needed: boolean;
  merchant: any;
  collector: any;
  amount_cents: number;
  shipping_data: any;
  currency: string;
  is_payment_locked: boolean;
  is_return: boolean;
  is_cancel: boolean;
  is_returned: boolean;
  is_canceled: boolean;
  merchant_order_id: string;
  wallet_notification: any;
  paid_amount_cents: number;
  notify_user_with_email: boolean;
  items: PaymobItem[];
  order_url: string;
  commission_fees: number;
  delivery_fees_cents: number;
  delivery_vat_cents: number;
  payment_method: string;
  merchant_staff_tag: any;
  api_source: string;
  data: any;
  payment_status: string;
}

export interface PaymobReturnDto {
  id: string;
  pending: string;
  amount_cents: string;
  success: string;
  is_auth: string;
  is_capture: string;
  is_standalone_payment: string;
  is_voided: string;
  is_refunded: string;
  is_3d_secure: string;
  integration_id: string;
  profile_id: string;
  has_parent_transaction: string;
  order_id: string;
  created_at: string;
  currency: string;
  api_source: string;
  terminal_id: string;
  merchant_commission: string;
  installment: string;
  discount_details: string;
  is_void: string;
  is_refund: string;
  data: string;
  is_hidden: string;
  payment_key_claims: string;
  error_occured: string;
  is_live: string;
  other_endpoint_reference: string;
  refunded_amount_cents: string;
  source_id: string;
  is_captured: string;
  captured_amount: string;
  merchant_staff_tag: string;
  updated_at: string;
  is_settled: string;
  bill_balanced: string;
  is_bill: string;
  owner: string;
  parent_transaction: string;
  hmac: string;
  merchant_order_id: string;
} 