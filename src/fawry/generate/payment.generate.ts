import * as crypto from 'crypto';
import {
  FawryRefundPayload,
  PayAtFawryPayload,
  PaymentPayload,
} from '../models/payment.payload';
import * as dotenv from 'dotenv';
import axios from 'axios';
import { PaymentStatusResponse } from '../models/payment-status.payload';
import { generateQueryParams } from 'support/query-params.generator';
import { RefundRequestStatus } from '../models/refund-request-status.payload';
import { CancelOrderResponse } from '../models/cancel-order.response';
dotenv.config();

/**
 * Generates a SHA256 signature by concatenating:
 * merchantCode + merchantRefNum + customerProfileId (or empty string) +
 * returnUrl + itemId + quantity + price (formatted as two decimals) +
 * secureHashKey.
 *
 * @param payload PaymentPayload containing the required fields.
 * @param secureHashKey The secret key to be appended.
 * @returns The signature as a hex string.
 */
function generateSignature(payload: PaymentPayload): string {
  const {
    merchantCode,
    merchantRefNum,
    customerProfileId,
    returnUrl,
    chargeItems,
  } = payload;

  // For this example we assume only the first charge item is used for signing.
  if (!chargeItems || chargeItems.length === 0) {
    throw new Error(
      'At least one charge item is required for signature generation.',
    );
  }
  const item = chargeItems[0];

  // Use an empty string if customerProfileId is not provided.
  const profileIdPart = customerProfileId ? customerProfileId : '';

  console.log('SECURE TOKEN', process.env.FAWRY_SECURE_KEY);
  console.log('MRCH TOKEN', merchantCode);

  // Concatenate the required fields.
  const dataToSign =
    merchantCode +
    merchantRefNum +
    profileIdPart +
    returnUrl +
    item.itemId +
    item.quantity +
    item.price +
    process.env.FAWRY_SECURE_KEY;

  // Hash the concatenated string using SHA256.
  const signature = crypto
    .createHash('sha256')
    .update(dataToSign)
    .digest('hex');
  return signature;
}

function generatePayAtFawrySignature(payload: PayAtFawryPayload): string {
  const {
    merchantCode,
    merchantRefNum,
    customerProfileId,
    paymentMethod,
    amount,
  } = payload;

  console.log(
    'Content to sign',
    merchantCode +
      merchantRefNum +
      customerProfileId +
      paymentMethod +
      amount +
      process.env.FAWRY_SECURE_KEY,
  );

  // Concatenate the required fields.
  const dataToSign =
    merchantCode +
    merchantRefNum +
    customerProfileId +
    paymentMethod +
    amount +
    process.env.FAWRY_SECURE_KEY;

  // Hash the concatenated string using SHA256.
  const signature = crypto
    .createHash('sha256')
    .update(dataToSign)
    .digest('hex');
  return signature;
}

/**
 * Builds the final payment payload by adding the generated signature.
 *
 * @param payload The payment payload data (without signature).
 * @param secureHashKey The secret key for generating the signature.
 * @returns The complete payload with the signature.
 */
export function securePaymentPayload(payload: PaymentPayload): PaymentPayload {
  payload.merchantCode = process.env.FAWRY_MERCHANT_ID;
  const signature = generateSignature(payload);

  return {
    ...payload,
    signature,
  };
}

export function securePayAtAFawryPaymentPayload(
  payload: PayAtFawryPayload,
): PayAtFawryPayload {
  payload.merchantCode = process.env.FAWRY_MERCHANT_ID;
  const signature = generatePayAtFawrySignature(payload);

  return {
    ...payload,
    signature,
  };
}

export async function generatePayAtAFawryPaymentUrl(
  payload: PayAtFawryPayload,
) {
  payload = securePayAtAFawryPaymentPayload(payload);

  console.log('PayAtFawry Payload', payload);

  const url =
    'https://atfawry.fawrystaging.com/ECommerceWeb/Fawry/payments/charge';

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;

    if (data) {
      return data;
    }
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Fawry API error details:', error.response.data);
      throw new Error(
        `Failure in url generation: ${
          error.response.data.description ||
          error.response.statusText ||
          error.message
        }`,
      );
    }
    throw new Error(`Failure in url generation: ${error.message}`);
  }
}

/**
 * Calls the Fawry API to create a payment URL.
 *
 * The API response is expected to either return an object with a "link" property
 * or an "error" property.
 *
 * @param payload The base payment payload.
 * @param secureHashKey The secure hash key to generate the signature.
 * @returns A Promise that resolves to the payment URL if successful.
 */
export async function generateFawryPaymentUrl(
  payload: PaymentPayload,
): Promise<string> {
  payload = securePaymentPayload(payload);

  // Replace with your actual Fawry endpoint URL.
  const endpoint =
    'https://atfawry.fawrystaging.com/fawrypay-api/api/payments/init';

  console.log('generated payload', payload);

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = response.data;
    console.log('DATAAAAA', data);

    // If the response is a string, assume it is the URL.
    if (typeof data === 'string') {
      return data;
    }
    // If the response is an object, assume it's an error and return the description.
    else if (typeof data === 'object') {
      throw new Error(data.description ?? 'Unexpected error from Fawry API');
    } else {
      throw new Error('Unexpected response format from Fawry API');
    }
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Fawry API error details:', error.response.data);
      throw new Error(
        `Failure in url generation: ${
          error.response.data.description ||
          error.response.statusText ||
          error.message
        }`,
      );
    }
    throw new Error(`Failure in url generation: ${error.message}`);
  }
}

export function generateStatusQuerySignature(merchantRefNum: number): string {
  const dataToSign =
    process.env.FAWRY_MERCHANT_ID +
    merchantRefNum +
    process.env.FAWRY_SECURE_KEY;
  const signature = crypto
    .createHash('sha256')
    .update(dataToSign)
    .digest('hex');
  return signature;
}

export async function requestPaymentStatus(
  merchantRefNum: number,
): Promise<PaymentStatusResponse | null> {
  try {
    const signature = generateStatusQuerySignature(merchantRefNum);

    const params = {
      merchantCode: process.env.FAWRY_MERCHANT_ID,
      merchantRefNumber: merchantRefNum,
      signature,
    };
    const endpoint = `https://atfawry.fawrystaging.com/ECommerceWeb/Fawry/payments/status/v2?${generateQueryParams(params)}`;

    const response = await axios.get(endpoint);

    const data = response.data;

    return data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Fawry API error details:', error.response.data);
      throw new Error(
        `Failure in requesting payment status: ${
          error.response.data.description ||
          error.response.statusText ||
          error.message
        }`,
      );
    }
    throw new Error(`Failure in requesting payment status: ${error.message}`);
  }
}

export function generateRefundSignature(payload: FawryRefundPayload): string {
  const { fawryReferenceNumber, refundAmount, refundReason } = payload;
  const dataToSign =
    process.env.FAWRY_MERCHANT_ID +
    fawryReferenceNumber +
    refundAmount +
    (refundReason ? refundReason : '') +
    process.env.FAWRY_SECURE_KEY;

  const signature = crypto
    .createHash('sha256')
    .update(dataToSign)
    .digest('hex');
  return signature;
}

export async function requestRefund(
  payload: FawryRefundPayload,
): Promise<RefundRequestStatus> {
  const signature = generateRefundSignature(payload);

  const params = {
    merchantCode: process.env.FAWRY_MERCHANT_ID,
    referenceNumber: payload.fawryReferenceNumber,
    refundAmount: payload.refundAmount,
    reason: payload.refundReason,
    signature,
  };

  const endpoint = `https://atfawry.fawrystaging.com/ECommerceWeb/Fawry/payments/refund`;

  try {
    const response = await axios.post(endpoint, params, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Fawry API error details:', error.response.data);
      throw new Error(
        `Failure in requesting refund: ${
          error.response.data.description ||
          error.response.statusText ||
          error.message
        }`,
      );
    }
    throw new Error(`Failure in requesting refund: ${error.message}`);
  }
}

export async function cancelPayment(
  orderRefNo: string,
  lang: 'ar-eg' | 'en-gb' = 'en-gb',
): Promise<CancelOrderResponse | null> {
  const merchantAccount = process.env.FAWRY_MERCHANT_ID;

  const dataToSign =
    orderRefNo + merchantAccount + lang + process.env.FAWRY_SECURE_KEY;

  const signature = crypto
    .createHash('sha256')
    .update(dataToSign)
    .digest('hex');

  const payload = {
    merchantAccount,
    orderRefNo,
    lang,
    signature,
  };

  const endpoint =
    'https://atfawry.fawrystaging.com/ECommerceWeb/api/orders/cancel-unpaid-order';

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.log(error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('Fawry API error details:', error.response.data);
      return {
        code: `${error.response.status}`,
        description: error.response.data.description || 'Error occurred',
        reason: error.message || error.response.statusText || 'Unknown error',
      };
    }
    console.error('Error in cancelPayment:', error.message);
    return {
      code: '500',
      description: 'Internal Server Error',
      reason: error.message || 'Unknown error',
    };
  }
}
