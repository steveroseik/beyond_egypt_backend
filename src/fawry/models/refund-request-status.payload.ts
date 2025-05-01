export interface RefundRequestStatus {
  type: string;
  statusCode: number;
  statusDescription: string;
  basketPayment: boolean;
}
