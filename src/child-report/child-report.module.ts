import { Module } from '@nestjs/common';
import { ChildReportService } from './child-report.service';
import { ChildReportResolver } from './child-report.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildReport } from './entities/child-report.entity';
import { FileModule } from 'src/file/file.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChildReport]), FileModule, MailModule],
  providers: [ChildReportResolver, ChildReportService],
  exports: [ChildReportService],
})
export class ChildReportModule {}
