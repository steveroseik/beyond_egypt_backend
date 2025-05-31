import { Module } from '@nestjs/common';
import { ChildReportHistoryService } from './child-report-history.service';
import { ChildReportHistoryResolver } from './child-report-history.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildReportHistory } from './entities/child-report-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChildReportHistory])],
  providers: [ChildReportHistoryResolver, ChildReportHistoryService],
  exports: [ChildReportHistoryService],
})
export class ChildReportHistoryModule {}
