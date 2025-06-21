// mail.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { generateCampRegistrationEmail } from './templates/camp-registration-confirmation';
import { User } from 'src/user/entities/user.entity';
import { generateWelcomeActivationEmail } from './templates/activate-account';
import { EncryptionService } from 'src/encryption/encryption.service';
import { ChildReport } from 'src/child-report/entities/child-report.entity';
import { ChildReportHistory } from 'src/child-report-history/entities/child-report-history.entity';
import { Child } from 'src/child/entities/child.entity';
import { Camp } from 'src/camp/entities/camp.entity';
import { generateReportEmail } from './templates/child-report.template';
import { EmailAttachment } from './interface/attachment.interface';
import { CampVariant } from 'src/camp-variant/entities/camp-variant.entity';
dotenv.config();

@Injectable()
export class MailService {
  constructor(
    private dataSource: DataSource,
    private encryption: EncryptionService,
  ) {}

  private transporter = nodemailer.createTransport({
    host: 'smtppro.zoho.com',
    port: 465,
    secure: true, // true for port 465
    auth: {
      user: 'support@beyond-egypt.com',
      pass: process.env.MAIL_PASSWORD,
    },
  });

  async sendMail({
    to,
    subject,
    text,
    html,
    attachments,
    senderName = 'Beyond Egypt',
  }: {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    senderName?: string;
    attachments?: any[];
  }) {
    try {
      const info = await this.transporter.sendMail({
        from: `"${senderName}" <support@beyond-egypt.com>`,
        to,
        subject,
        text,
        html,
        attachments,
      });

      console.log('Message sent: %s', info.messageId);
      return info;
    } catch (e) {
      console.log(e);
      return null;
    }
  }

  async sendCampRegistrationConfirmation(id: number) {
    const campRegistration = await this.dataSource.manager.findOne(
      CampRegistration,
      {
        where: { id },
        relations: [
          'camp',
          'campVariantRegistrations',
          'parent',
          'campVariantRegistrations.child',
          'campVariantRegistrations.campVariant',
        ],
      },
    );

    if (!campRegistration) return;

    const regCode = this.encryption.encrypt({
      campRegistrationId: campRegistration.id,
      parentId: campRegistration.parentId,
    });

    const data = await generateCampRegistrationEmail({
      registration: campRegistration,
      code: regCode,
    });

    const response = await this.sendMail({
      to: campRegistration.parent.email,
      subject: 'New Camp Registration',
      html: data.content,
      attachments: [data.attachment],
    });

    return response;
  }

  async sendActivationEmail(id: string) {
    const user = await this.dataSource.manager.findOne(User, { where: { id } });
    if (!user) return;

    const content = generateWelcomeActivationEmail({ user: user });

    const response = await this.sendMail({
      to: user.email,
      subject: 'Activate Your Account',
      html: content,
    });

    return response;
  }

  async sendReportEmail({
    childReport,
    latestHistory,
    child,
    parent,
    camp,
  }: {
    childReport: ChildReport;
    latestHistory: ChildReportHistory;
    child?: Child;
    parent?: User;
    camp?: Camp;
  }) {
    const baseUrl = process.env.BASE_URL || 'https://beyond-egypt.com';

    const reportViewUrl = `${baseUrl}/child-reports/view/${childReport.id}`;
    let childName = child?.name;
    let parentName = parent?.name;
    let campName = camp?.name;

    if (!childName) {
      const child = await this.dataSource.manager.findOne(Child, {
        where: { id: childReport.childId },
        ...(!parent && { relations: ['user'] }),
      });

      if (!child) {
        console.error(
          'Child not found for report:',
          childReport.id,
          ' skipping email.',
        );
        return;
      }
      childName = child.name;
      parentName = child.user.name;
    }

    if (!parentName) {
      const parentUser = await this.dataSource.manager.findOne(User, {
        where: { id: childReport.child.parentId },
      });

      if (parentUser) {
        parentName = parentUser.name;
      } else {
        console.error(
          'Parent not found for report:',
          childReport.id,
          ' skipping email.',
        );
        return;
      }
    }

    if (!campName) {
      const campVariant = await this.dataSource.manager.findOne(CampVariant, {
        where: { id: childReport.campVariantId },
        relations: ['camp'],
      });

      if (campVariant) {
        campName = campVariant.camp.name;
      } else {
        console.error(
          'Camp not found for report:',
          childReport.id,
          ' skipping email.',
        );
        return;
      }
    }

    const genTemplate = generateReportEmail({
      childReport,
      latestHistory,
      parentName,
      childName,
      campName,
      reportViewUrl,
    });

    const response = await this.sendMail({
      to: childReport.child.user.email,
      subject: `Child Report for ${childName}`,
      html: genTemplate.htmlContent,
    });

    return response;
  }
}
