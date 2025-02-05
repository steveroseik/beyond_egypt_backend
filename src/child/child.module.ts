import { Module } from '@nestjs/common';
import { ChildService } from './child.service';
import { ChildResolver } from './child.resolver';

@Module({
  providers: [ChildResolver, ChildService],
})
export class ChildModule {}
