import { Module } from '@nestjs/common';
import { CampVariantService } from './camp-variant.service';
import { CampVariantResolver } from './camp-variant.resolver';

@Module({
  providers: [CampVariantResolver, CampVariantService],
})
export class CampVariantModule {}
