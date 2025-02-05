import { Module } from '@nestjs/common';
import { ChildReportService } from './child-report.service';
import { ChildReportResolver } from './child-report.resolver';

@Module({
  providers: [ChildReportResolver, ChildReportService],
})
export class ChildReportModule {}
