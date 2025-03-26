import ShortUniqueId from 'short-unique-id';

import * as dotenv from 'dotenv';
dotenv.config();

const shortId = new ShortUniqueId({ length: 12 });

const shorterId = new ShortUniqueId({ length: 16 });

export function genId(): string {
  return shortId.rnd();
}

export function generateMerchantRefNumber(paymentId: number): number {
  let envPrefix = process.env.ENV_REF_PREFIX;

  // Get last 4 digits of timestamp (milliseconds) for uniqueness
  const timestampSuffix = Date.now().toString().slice(-4);

  // Combine all parts to form the final reference number
  return parseInt(`${envPrefix}${paymentId}${timestampSuffix}`);
}
