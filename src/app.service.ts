import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { MailService } from './mail/mail.service';
import { ChildReport } from './child-report/entities/child-report.entity';
import { response } from 'express';
import { ChildReportHistory } from './child-report-history/entities/child-report-history.entity';
import { generateReportEmail } from './mail/templates/child-report.template';

@Injectable()
export class AppService {
  constructor(
    private dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  getHello(): string {
    return 'Hello World!';
  }

  async test() {
    const childReport = (
      await this.dataSource.manager.find(ChildReport, {
        relations: ['child', 'child.user', 'campVariant', 'campVariant.camp'],
        order: {
          id: 'ASC',
        },
        take: 1,
      })
    )[0];

    if (!childReport) {
      return response.json({
        code: 404,
        message: 'Child report not found',
      });
    }

    const latestHistory = await this.dataSource.manager.findOne(
      ChildReportHistory,
      {
        where: {
          childReportId: childReport.id,
        },
        order: {
          reportTime: 'DESC',
        },
      },
    );

    if (!latestHistory) {
      return response.json({
        code: 404,
        message: 'Child report history not found',
      });
    }

    const genTemplate = generateReportEmail({
      childReport,
      latestHistory,
      parentName: childReport.child.user.name,
      childName: childReport.child.name,
      campName: childReport.campVariant.camp.name,
      reportViewUrl: `https://beyond-egypt.com/child-report/${childReport.id}`,
    });

    return genTemplate.textContent;
  }
}
