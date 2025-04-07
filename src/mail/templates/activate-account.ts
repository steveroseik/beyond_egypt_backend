import * as dotenv from 'dotenv';
import { User } from 'src/user/entities/user.entity';
import { UserType } from 'support/enums';
dotenv.config();

export function generateWelcomeActivationEmail({
  user,
}: {
  user: User;
}): string {
  const parentBaseUrl = process.env.FRONTEND_URL;
  const adminBaseUrl = process.env.FRONTEND_ADMIN_URL;
  const isParent = user.type === UserType.parent;
  const baseUrl = isParent ? parentBaseUrl : adminBaseUrl;
  const activationUrl = `${baseUrl}/activate?ref=${user.id}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          font-family: Arial, sans-serif;
          background-color: #f9fafc;
          padding: 20px;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: auto;
          background: #fff;
          padding: 30px;
          border-radius: 10px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
        h1 {
          color: #2c3e50;
        }
        p {
          font-size: 16px;
          line-height: 1.5;
        }
        .btn {
          display: inline-block;
          margin-top: 25px;
          padding: 12px 24px;
          background-color: #3f51b5;
          color: #ffffff !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: bold;
        }
        .footer {
          margin-top: 40px;
          font-size: 13px;
          color: #777;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Welcome, ${user.name}</h1>
        <p>We're excited to have you on board. Your account has been created successfully.</p>
        <p>To activate your account and set your password, click the button below:</p>

        <a class="btn" href="${activationUrl}" target="_blank">Activate My Account</a>

        <div class="footer">
          <p>Didn’t sign up? You can safely ignore this message. No action will be taken unless you click the activation link.</p>
          <p>Need help? Contact us anytime at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
