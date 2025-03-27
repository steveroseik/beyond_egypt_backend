import { Module } from '@nestjs/common';
import { ChildService } from './child.service';
import { ChildResolver } from './child.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Child } from './entities/child.entity';
import { FileModule } from 'src/file/file.module';

@Module({
  imports: [TypeOrmModule.forFeature([Child]), FileModule],
  providers: [ChildResolver, ChildService],
  exports: [ChildService],
})
export class ChildModule {}
