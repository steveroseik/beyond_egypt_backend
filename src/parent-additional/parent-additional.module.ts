import { Module } from '@nestjs/common';
import { ParentAdditionalService } from './parent-additional.service';
import { ParentAdditionalResolver } from './parent-additional.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ParentAdditional } from './entities/parent-additional.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ParentAdditional])],
  providers: [ParentAdditionalResolver, ParentAdditionalService],
  exports: [ParentAdditionalService],
})
export class ParentAdditionalModule {}
