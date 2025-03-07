import { Module } from '@nestjs/common';
import { CampVariantService } from './camp-variant.service';
import { CampVariantResolver } from './camp-variant.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampVariant } from './entities/camp-variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CampVariant])],
  providers: [CampVariantResolver, CampVariantService],
  exports: [CampVariantService],
})
export class CampVariantModule {}
