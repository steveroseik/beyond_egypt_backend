import { Module } from '@nestjs/common';
import { FawryService } from './fawry.service';
import { FawryController } from './fawry.controller';

@Module({
  controllers: [FawryController],
  providers: [FawryService],
})
export class FawryModule {}
