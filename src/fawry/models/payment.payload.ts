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
