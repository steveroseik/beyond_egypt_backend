import { PaymentMethod } from 'support/enums';
import { Decimal } from 'support/scalars';

export interface RefundPayload {
  campRegistrationId: number;
  amountToBeRefunded: Decimal;
  refundOptions: RefundOption[];
  nonce: string;
  iat: Date;
}

export interface RefundOption {
  amount: Decimal;
  paymentId: number;
  fawryReferenceNumber?: string;
  paymentMethod: PaymentMethod;
}

export function parseRefundPayload(raw: any): RefundPayload {
  return {
    campRegistrationId: Number(raw.campRegistrationId),
    amountToBeRefunded: new Decimal(raw.amountToBeRefunded ?? '0'),
    refundOptions: (raw.refundOptions || []).map((opt: any) => ({
      paymentId: opt.paymentId != null ? Number(opt.paymentId) : undefined,
      paymentMethod: opt.paymentMethod,
      referenceNumber: opt.referenceNumber,
      amount: new Decimal(opt.amount ?? '0'),
    })),
    nonce: raw.nonce ? String(raw.nonce) : null,
    iat: raw.iat ? new Date(raw.iat) : null,
  };
}
