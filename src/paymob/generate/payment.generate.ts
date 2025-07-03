import axios from 'axios';
import * as dotenv from 'dotenv';
import {
  PaymobIntentionPayload,
  PaymobIntentionResponse,
  PaymobRefundPayload,
  PaymobRefundResponse,
  PaymobAuthResponse,
  PaymobTransactionResponse,
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

/**
 * Generates an access token for Paymob API authentication
 * @returns Promise with the authentication response
 */
export async function generatePaymobToken(): Promise<PaymobAuthResponse> {
  const endpoint = 'https://accept.paymob.com/api/auth/tokens';

  try {
    const response = await axios.post(endpoint, {
      api_key: process.env.PAYMOB_API_KEY,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Paymob authentication error:', error.response?.data || error.message);
    throw new Error(`Failed to authenticate with Paymob: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Gets transaction details from Paymob using the access token
 * @param transactionId The transaction ID to retrieve
 * @param accessToken The access token from authentication
 * @returns Promise with the transaction response
 */
export async function getPaymobTransaction(
  transactionId: string,
  accessToken: string,
): Promise<PaymobTransactionResponse> {
  const endpoint = `https://accept.paymob.com/api/acceptance/transactions/${transactionId}`;

  try {
    const response = await axios.get(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `${accessToken}`,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Paymob transaction retrieval error:', error.response?.data || error.message);
    throw new Error(`Failed to retrieve transaction from Paymob: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Validates a Paymob payment by checking the transaction status
 * @param transactionId The transaction ID to validate
 * @param expectedAmount The expected amount in cents
 * @param expectedOrderId The expected order ID (merchant_order_id)
 * @returns Promise with validation result
 */
export async function validatePaymobPayment(
  transactionId: string,
  expectedAmount: number,
  expectedOrderId: string,
): Promise<{ isValid: boolean; transaction: PaymobTransactionResponse }> {
  try {
    // First, get the access token
    const authResponse = await generatePaymobToken();
    
    if (!authResponse.token) {
      throw new Error('Failed to obtain access token from Paymob');
    }

    // Then, get the transaction details
    const transaction = await getPaymobTransaction(transactionId, authResponse.token);

    // Validate the transaction
    const isValid = 
      transaction.success === true &&
      transaction.pending === false &&
      transaction.amount_cents === expectedAmount &&
      transaction.order?.merchant_order_id === expectedOrderId &&
      transaction.order?.payment_status === 'PAID';

    return { isValid, transaction };
  } catch (error) {
    console.error('Paymob payment validation error:', error);
    throw error;
  }
} 