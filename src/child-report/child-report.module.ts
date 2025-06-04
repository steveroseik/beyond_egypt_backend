import { Module } from '@nestjs/common';
import { ChildReportService } from './child-report.service';
import { ChildReportResolver } from './child-report.resolver';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChildReport } from './entities/child-report.entity';
import { FileModule } from 'src/file/file.module';

@Module({
  imports: [TypeOrmModule.forFeature([ChildReport]), FileModule],
  providers: [ChildReportResolver, ChildReportService],
  exports: [ChildReportService],
})
export class ChildReportModule {}
