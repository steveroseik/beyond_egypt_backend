import { Module } from '@nestjs/common';
import { EventFileService } from './event-file.service';
import { EventFileResolver } from './event-file.resolver';

@Module({
  providers: [EventFileResolver, EventFileService],
})
export class EventFileModule {}
