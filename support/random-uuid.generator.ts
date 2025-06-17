import ShortUniqueId from 'short-unique-id';

import * as dotenv from 'dotenv';
dotenv.config();

export const shortIdLength = 12; // Length of the unique ID

const shortId = new ShortUniqueId({ length: shortIdLength });

export function genId(): string {
  return shortId.rnd();
}

export function generateMerchantRefNumber(paymentId: number): string {
  let envPrefix = process.env.ENV_REF_PREFIX;

  // Get last 4 digits of timestamp (milliseconds) for uniqueness
  const timestampSuffix = Date.now().toString().slice(-4);

  // Combine all parts to form the final reference number
  return `${envPrefix}${paymentId}${timestampSuffix}`;
}
