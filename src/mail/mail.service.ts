// mail.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { CampRegistration } from 'src/camp-registration/entities/camp-registration.entity';
import { generateCampRegistrationEmail } from './templates/camp-registration-confirmation';
import { User } from 'src/user/entities/user.entity';
import { generateWelcomeActivationEmail } from './templates/activate-account';
dotenv.config();

@Injectable()
export class MailService {
  constructor(private dataSource: DataSource) {}

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

    const data = await generateCampRegistrationEmail({
      registration: campRegistration,
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
}
