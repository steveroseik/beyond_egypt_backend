import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { EncryptionModule } from 'src/encryption/encryption.module';

@Module({
  imports: [EncryptionModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
