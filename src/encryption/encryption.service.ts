// refund-encryption.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    // hex-encoded 32 bytes (256 bits)
    this.key = Buffer.from(
      this.config.get<string>('payments_encryption_secret'),
      'hex',
    );
  }

  encrypt(payload: object): string {
    const iv = randomBytes(12); // 96-bit nonce for GCM
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const plaintext = Buffer.from(JSON.stringify(payload), 'utf8');
    const ciphertext = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    // We concatenate hex-encoded parts with colons
    return [
      iv.toString('hex'),
      tag.toString('hex'),
      ciphertext.toString('hex'),
    ].join(':');
  }

  decrypt(token: string): any {
    const [ivHex, tagHex, ctHex] = token.split(':');
    if (!ivHex || !tagHex || !ctHex) throw new Error('Malformed refund token');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ciphertext = Buffer.from(ctHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return JSON.parse(plaintext.toString('utf8'));
  }
}
