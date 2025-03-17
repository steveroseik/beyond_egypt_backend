import * as crypto from 'crypto';
import { PaymentPayload } from '../models/payment.payload';
import * as dotenv from 'dotenv';
import axios from 'axios';
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
    merchantRefNum +
    process.env.FAWRY_MERCHANT_ID +
    process.env.FAWRY_SECURE_KEY;
  const signature = crypto
    .createHash('sha256')
    .update(dataToSign)
    .digest('hex');
  return signature;
}
