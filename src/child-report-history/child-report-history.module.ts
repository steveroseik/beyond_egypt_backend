import { Module } from '@nestjs/common';
import { ChildReportHistoryService } from './child-report-history.service';
import { ChildReportHistoryResolver } from './child-report-history.resolver';

@Module({
  providers: [ChildReportHistoryResolver, ChildReportHistoryService],
})
export class ChildReportHistoryModule {}
