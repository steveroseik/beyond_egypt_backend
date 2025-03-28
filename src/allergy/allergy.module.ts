import { Module } from '@nestjs/common';
import { AllergyService } from './allergy.service';
import { AllergyResolver } from './allergy.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Allergy } from './entities/allergy.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Allergy])],
  providers: [AllergyResolver, AllergyService],
  exports: [AllergyService],
})
export class AllergyModule {}
