import axios from 'axios';
import * as dotenv from 'dotenv';
import {
  PaymobIntentionPayload,
  PaymobIntentionResponse,
  PaymobRefundPayload,
  PaymobRefundResponse,
} from '../models/payment.payload';

dotenv.config();

/**
 * Creates a payment intention with Paymob
 * @param payload The payment intention payload
 * @returns Promise with the intention response
 */
export async function createPaymobIntention(
  payload: PaymobIntentionPayload,
): Promise<PaymobIntentionResponse> {
  const endpoint = 'https://accept.paymob.com/v1/intention/';

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${process.env.PAYMOB_SECRET_KEY}`,
      },
    });

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Paymob API error details:', error.response.data);
      throw new Error(
        `Failure in creating intention: ${
          error.response.data.description ||
          error.response.statusText ||
          error.message
        }`,
      );
    }
    throw new Error(`Failure in creating intention: ${error.message}`);
  }
}

/**
 * Generates the Paymob checkout URL
 * @param publicKey The public key
 * @param clientSecret The client secret from intention response
 * @returns The checkout URL
 */
export function generatePaymobCheckoutUrl(
  publicKey: string,
  clientSecret: string,
): string {
  return `https://accept.paymob.com/unifiedcheckout/?publicKey=${publicKey}&clientSecret=${clientSecret}`;
}

/**
 * Requests a refund from Paymob
 * @param payload The refund payload
 * @returns Promise with the refund response
 */
export async function requestPaymobRefund(
  payload: PaymobRefundPayload,
): Promise<PaymobRefundResponse> {
  const endpoint = 'https://accept.paymob.com/api/acceptance/void_refund/refund';

  try {
    const response = await axios.post(endpoint, payload, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${process.env.PAYMOB_SECRET_KEY}`,
      },
    });

    return response.data;
  } catch (error: any) {
    if (axios.isAxiosError(error) && error.response) {
      console.error('Paymob API error details:', error.response.data);
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