import { Module } from '@nestjs/common';
import { CampService } from './camp.service';
import { CampResolver } from './camp.resolver';

@Module({
  providers: [CampResolver, CampService],
})
export class CampModule {}
