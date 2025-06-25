import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { EncryptionModule } from 'src/encryption/encryption.module';
import { MailResolver } from './mail.resolver';

@Module({
  imports: [EncryptionModule],
  providers: [MailService, MailResolver],
  exports: [MailService],
})
export class MailModule {}
