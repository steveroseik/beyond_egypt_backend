// mail.service.ts
import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
dotenv.config();

@Injectable()
export class MailService {
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
    senderName = 'Beyond Egypt',
  }: {
    to: string;
    subject: string;
    text: string;
    html?: string;
    senderName?: string;
  }) {
    try {
      const info = await this.transporter.sendMail({
        from: `"${senderName}" <support@beyond-egypt.com>`,
        to,
        subject,
        text,
        html,
      });

      console.log('Message sent: %s', info.messageId);
      return info;
    } catch (e) {
      console.log(e);
      return null;
    }
  }
}
