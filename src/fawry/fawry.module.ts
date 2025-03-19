import { Module } from '@nestjs/common';
import { FawryService } from './fawry.service';
import { FawryController } from './fawry.controller';
import { PaymentExpiryService } from './payment-expiry.service';

@Module({
  controllers: [FawryController],
  providers: [FawryService, PaymentExpiryService],
})
export class FawryModule {}
