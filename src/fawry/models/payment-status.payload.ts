export interface OrderItem {
  itemCode: string;
  price: number;
  quantity: number;
}

export interface PaymentStatusResponse {
  requestId: string;
  fawryRefNumber: string;
  merchantRefNumber: string;
  customerName: string;
  customerMobile: string;
  customerMail: string;
  customerMerchantId: string;
  paymentAmount: number;
  orderAmount: number;
  fawryFees: number;
  orderStatus: string;
  paymentMethod: string;
  paymentTime: number;
  messageSignature: string;
  paymentRefrenceNumber: string;
  orderExpiryDate: number;
  orderItems: OrderItem[];
}
