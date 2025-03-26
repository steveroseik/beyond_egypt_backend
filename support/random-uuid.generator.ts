import ShortUniqueId from 'short-unique-id';

const shortId = new ShortUniqueId({ length: 12 });

const shorterId = new ShortUniqueId({ length: 16 });

export function genId(): string {
  return shortId.rnd();
}

export function generatePaymentReference(): string {
  return shorterId.rnd();
}
