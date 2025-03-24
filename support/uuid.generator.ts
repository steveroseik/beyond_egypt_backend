import ShortUniqueId from 'short-unique-id';

const shortId = new ShortUniqueId({ length: 7 });

export function genId(): string {
  return shortId.rnd();
}
