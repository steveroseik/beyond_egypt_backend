import { ChargeItem } from './charge-item.payload';

// Define an interface for the payment payload
export interface PaymentPayload {
  merchantCode?: string;
  merchantRefNum: string;
  customerMobile: string;
  customerEmail: string;
  customerName: string;
  customerProfileId: string;
  paymentExpiry: string;
  language: string;
  chargeItems: ChargeItem[];
  returnUrl: string;
  signature?: string;
  authCaptureModePayment: boolean;
}

export interface PayAtFawryPayload {
  merchantCode?: string;
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  customerProfileId: string;
  merchantRefNum: string;
  amount: string;
  paymentExpiry: string;
  currencyCode: string;
  language: string;
  chargeItems: ChargeItem[];
  signature?: string;
  paymentMethod: string;
  description: string;
}

export interface FawryRefundPayload {
  fawryReferenceNumber: string;
  refundAmount: string;
  refundReason?: string;
}
