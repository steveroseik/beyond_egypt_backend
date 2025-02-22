import { Module } from '@nestjs/common';
import { ChildService } from './child.service';
import { ChildResolver } from './child.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Child } from './entities/child.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Child])],
  providers: [ChildResolver, ChildService],
  exports: [ChildService],
})
export class ChildModule {}
