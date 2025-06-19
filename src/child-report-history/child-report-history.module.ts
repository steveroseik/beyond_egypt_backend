import { Module } from '@nestjs/common';
import { ChildReportHistoryService } from './child-report-history.service';
import { ChildReportHistoryResolver } from './child-report-history.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildReportHistory } from './entities/child-report-history.entity';
import { FileModule } from 'src/file/file.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ChildReportHistory]),
    FileModule,
    MailModule,
  ],
  providers: [ChildReportHistoryResolver, ChildReportHistoryService],
  exports: [ChildReportHistoryService],
})
export class ChildReportHistoryModule {}
