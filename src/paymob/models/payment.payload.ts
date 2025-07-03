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
  paymob_date: string;
  value_date: string;
  updated_at: string;
  is_settled: string;
  bill_balanced: string;
  is_bill: string;
  is_reconciled: string;
  cogs: string;
  reconciliation_id: string;
  owner: string;
  parent_transaction: string;
  merchant_order_id: string;
}

export interface PaymobAuthResponse {
  profile: {
    id: number;
    user: {
      id: number;
      username: string;
      first_name: string;
      last_name: string;
      date_joined: string;
      email: string;
      is_active: boolean;
      is_staff: boolean;
      is_superuser: boolean;
      last_login: string | null;
      groups: any[];
      user_permissions: number[];
    };
    created_at: string;
    active: boolean;
    profile_type: string;
    phones: string[];
    company_emails: string[];
    company_name: string;
    state: string;
    country: string;
    city: string;
    postal_code: string;
    street: string;
    [key: string]: any; // For other profile fields
  };
  token: string;
}

export interface PaymobTransactionResponse {
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
  terminal_id: string | null;
  has_parent_transaction: boolean;
  order: {
    id: number;
    created_at: string;
    delivery_needed: boolean;
    merchant: {
      id: number;
      created_at: string;
      phones: string[];
      company_emails: string[];
      company_name: string;
      state: string;
      country: string;
      city: string;
      postal_code: string;
      street: string;
    };
    collector: any;
    amount_cents: number;
    shipping_data: {
      id: number;
      first_name: string;
      last_name: string;
      street: string;
      building: string;
      floor: string;
      apartment: string;
      city: string;
      state: string;
      country: string;
      email: string;
      phone_number: string;
      postal_code: string;
      extra_description: string;
      shipping_method: string;
      order_id: number;
      order: number;
    };
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
    items: Array<{
      name: string;
      description: string;
      amount_cents: number;
      quantity: number;
    }>;
    order_url: string;
    commission_fees: number;
    delivery_fees_cents: number;
    delivery_vat_cents: number;
    payment_method: string;
    merchant_staff_tag: any;
    api_source: string;
    data: {
      notification_url: string;
    };
    payment_status: string;
  };
  created_at: string;
  paid_at: string;
  currency: string;
  source_data: {
    pan: string;
    type: string;
    tenure: any;
    sub_type: string;
  };
  api_source: string;
  fees: string;
  vat: string;
  converted_gross_amount: string;
  data: {
    klass: string;
    amount: number;
    acs_eci: string;
    message: string;
    batch_no: number;
    card_num: string;
    currency: string;
    merchant: string;
    card_type: string;
    created_at: string;
    migs_order: {
      id: string;
      amount: number;
      status: string;
      currency: string;
      chargeback: {
        amount: number;
        currency: string;
      };
      description: string;
      creationTime: string;
      merchantAmount: number;
      lastUpdatedTime: string;
      merchantCurrency: string;
      acceptPartialAmount: boolean;
      totalCapturedAmount: number;
      totalRefundedAmount: number;
      authenticationStatus: string;
      merchantCategoryCode: string;
      totalAuthorizedAmount: number;
    };
    order_info: string;
    receipt_no: string;
    migs_result: string;
    secure_hash: string;
    authorize_id: string;
    transaction_no: string;
    avs_result_code: string;
    captured_amount: number;
    refunded_amount: number;
    merchant_txn_ref: string;
    migs_transaction: {
      id: string;
      stan: string;
      type: string;
      amount: number;
      source: string;
      receipt: string;
      acquirer: {
        id: string;
        date: string;
        batch: number;
        timeZone: string;
        merchantId: string;
        transactionId: string;
        settlementDate: string;
      };
      currency: string;
      terminal: string;
      authorizationCode: string;
      authenticationStatus: string;
    };
    acq_response_code: string;
    authorised_amount: number;
    txn_response_code: string;
    avs_acq_response_code: string;
    gateway_integration_pk: number;
  };
  is_cashout: boolean;
  wallet_transaction_type: any;
  is_upg: boolean;
  is_internal_refund: boolean;
  billing_data: {
    id: number;
    first_name: string;
    last_name: string;
    street: string;
    building: string;
    floor: string;
    apartment: string;
    city: string;
    state: string;
    country: string;
    email: string;
    phone_number: string;
    postal_code: string;
    ip_address: string;
    extra_description: string;
    transaction_id: number;
    created_at: string;
  };
  installment: any;
  integration_type: string;
  card_type: string;
  routing_bank: string;
  card_holder_bank: string;
  merchant_commission: number;
  extra_detail: any;
  discount_details: any[];
  caf_details: any[];
  show_caf_in_receipt: any;
  pre_conversion_currency: any;
  pre_conversion_amount_cents: any;
  is_host2host: boolean;
  installment_info: {
    items: any;
    administrative_fees: any;
    down_payment: any;
    tenure: any;
    finance_amount: any;
  };
  vf_loyalty_details: any;
  purchase_fees: number;
  original_amount: number;
  is_trx_bank_installment: boolean;
  payment_source: string;
  split_description: any[];
  is_void: boolean;
  is_refund: boolean;
  is_hidden: boolean;
  error_occured: boolean;
  is_live: boolean;
  other_endpoint_reference: any;
  refunded_amount_cents: number;
  source_id: number;
  is_captured: boolean;
  captured_amount: number;
  merchant_staff_tag: any;
  paymob_date: any;
  value_date: any;
  updated_at: string;
  is_settled: boolean;
  bill_balanced: boolean;
  is_bill: boolean;
  is_reconciled: boolean;
  cogs: number;
  reconciliation_id: any;
  owner: number;
  parent_transaction: any;
} 