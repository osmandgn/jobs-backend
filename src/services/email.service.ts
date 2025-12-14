import { config } from '../config';
import logger from '../utils/logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface ResendResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class EmailService {
  private apiKey: string;
  private fromEmail: string;
  private fromName: string;
  private baseUrl = 'https://api.resend.com/emails';

  constructor() {
    this.apiKey = config.resend.apiKey;
    this.fromEmail = config.resend.fromEmail;
    this.fromName = config.resend.fromName;
  }

  private async send(options: EmailOptions): Promise<ResendResponse> {
    if (!this.apiKey) {
      logger.warn('Resend API key not configured, email not sent');
      // In development, log the email content
      if (config.env === 'development') {
        logger.debug('Email content:', {
          to: options.to,
          subject: options.subject,
          html: options.html.substring(0, 200) + '...',
        });
      }
      return { success: true, messageId: 'dev-mode' };
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${this.fromName} <${this.fromEmail}>`,
          to: [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text || options.subject,
        }),
      });

      const data = await response.json() as { id?: string; message?: string };

      if (response.ok) {
        logger.info(`Email sent to ${options.to}, messageId: ${data.id}`);
        return { success: true, messageId: data.id };
      } else {
        logger.error(`Failed to send email to ${options.to}:`, data);
        return { success: false, error: data.message || JSON.stringify(data) };
      }
    } catch (error) {
      logger.error('Email send error:', error);
      return { success: false, error: String(error) };
    }
  }

  async sendVerificationEmail(to: string, code: string, firstName: string): Promise<boolean> {
    // Log verification code in development for testing
    if (config.env === 'development') {
      logger.info(`📧 VERIFICATION CODE for ${to}: ${code}`);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; padding: 20px; letter-spacing: 8px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>GigHub UK</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Thank you for registering with GigHub UK! Please use the following code to verify your email address:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't create an account with GigHub UK, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GigHub UK. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.send({
      to,
      subject: 'Verify your GigHub UK account',
      html,
      text: `Hi ${firstName}, Your verification code is: ${code}. This code will expire in 15 minutes.`,
    });

    return result.success;
  }

  async sendWelcomeEmail(to: string, firstName: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to GigHub UK!</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>Welcome to GigHub UK! Your email has been verified and your account is now active.</p>
            <p>You can now:</p>
            <ul>
              <li>Browse and apply for short-term jobs in your area</li>
              <li>Post jobs if you need help with tasks</li>
              <li>Set up your profile to showcase your skills</li>
              <li>Enable notifications to get alerts for new opportunities</li>
            </ul>
            <p>Get started by completing your profile and setting your preferences.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GigHub UK. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.send({
      to,
      subject: 'Welcome to GigHub UK!',
      html,
      text: `Hi ${firstName}, Welcome to GigHub UK! Your account is now active.`,
    });

    return result.success;
  }

  async sendPasswordResetEmail(to: string, code: string, firstName: string): Promise<boolean> {
    // Log password reset code in development for testing
    if (config.env === 'development') {
      logger.info(`📧 PASSWORD RESET CODE for ${to}: ${code}`);
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .code { font-size: 32px; font-weight: bold; color: #4F46E5; text-align: center; padding: 20px; letter-spacing: 8px; }
          .warning { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 10px; margin: 10px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <p>Hi ${firstName},</p>
            <p>We received a request to reset your password. Use the following code to reset it:</p>
            <div class="code">${code}</div>
            <p>This code will expire in 1 hour.</p>
            <div class="warning">
              <strong>Didn't request this?</strong><br>
              If you didn't request a password reset, please ignore this email or contact support if you're concerned.
            </div>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GigHub UK. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.send({
      to,
      subject: 'Reset your GigHub UK password',
      html,
      text: `Hi ${firstName}, Your password reset code is: ${code}. This code will expire in 1 hour.`,
    });

    return result.success;
  }

  async sendApplicationReceivedEmail(
    to: string,
    employerName: string,
    jobTitle: string,
    applicantName: string
  ): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .highlight { background: #EEF2FF; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Application Received</h1>
          </div>
          <div class="content">
            <p>Hi ${employerName},</p>
            <p>You've received a new application for your job:</p>
            <div class="highlight">
              <strong>${jobTitle}</strong><br>
              Applicant: ${applicantName}
            </div>
            <p>Log in to GigHub UK to review the application and respond to the applicant.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GigHub UK. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.send({
      to,
      subject: `New application for: ${jobTitle}`,
      html,
      text: `Hi ${employerName}, You've received a new application from ${applicantName} for: ${jobTitle}`,
    });

    return result.success;
  }

  async sendApplicationStatusEmail(
    to: string,
    applicantName: string,
    jobTitle: string,
    status: 'accepted' | 'rejected'
  ): Promise<boolean> {
    const statusMessage =
      status === 'accepted'
        ? 'Congratulations! Your application has been accepted.'
        : 'Unfortunately, your application was not successful this time.';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${status === 'accepted' ? '#10B981' : '#4F46E5'}; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .highlight { background: #EEF2FF; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Application ${status === 'accepted' ? 'Accepted' : 'Update'}</h1>
          </div>
          <div class="content">
            <p>Hi ${applicantName},</p>
            <div class="highlight">
              <strong>${jobTitle}</strong>
            </div>
            <p>${statusMessage}</p>
            ${status === 'accepted' ? '<p>The employer will be in touch with you shortly with more details.</p>' : '<p>Don\'t be discouraged! There are plenty more opportunities on GigHub UK.</p>'}
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GigHub UK. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.send({
      to,
      subject: `Application ${status}: ${jobTitle}`,
      html,
      text: `Hi ${applicantName}, ${statusMessage} Job: ${jobTitle}`,
    });

    return result.success;
  }

  async sendNewReviewEmail(
    to: string,
    userName: string,
    reviewerName: string,
    rating: number,
    jobTitle: string
  ): Promise<boolean> {
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .stars { font-size: 24px; color: #F59E0B; text-align: center; margin: 15px 0; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Review Received</h1>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>You've received a new review from ${reviewerName} for:</p>
            <p><strong>${jobTitle}</strong></p>
            <div class="stars">${stars}</div>
            <p>Log in to GigHub UK to see the full review.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} GigHub UK. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.send({
      to,
      subject: `New ${rating}-star review from ${reviewerName}`,
      html,
      text: `Hi ${userName}, You've received a ${rating}-star review from ${reviewerName} for: ${jobTitle}`,
    });

    return result.success;
  }

  async sendDailyDigestEmail(
    to: string,
    firstName: string,
    jobsByCategory: Record<string, Array<{
      id: string;
      title: string;
      description: string;
      locationCity: string | null;
      payAmount: string;
      payType: string;
    }>>
  ): Promise<boolean> {
    const totalJobs = Object.values(jobsByCategory).flat().length;

    let jobsHtml = '';
    for (const [category, jobs] of Object.entries(jobsByCategory)) {
      jobsHtml += `<h3 style="color: #4F46E5; margin-top: 20px;">${category}</h3>`;
      for (const job of jobs) {
        jobsHtml += `
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <h4 style="margin: 0 0 8px 0;">${job.title}</h4>
            <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${job.description}</p>
            <p style="margin: 0; font-size: 14px;">
              <strong>Konum:</strong> ${job.locationCity || 'Belirtilmemiş'} |
              <strong>Ücret:</strong> £${job.payAmount}/${job.payType}
            </p>
          </div>
        `;
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f3f4f6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>GigHub UK</h1>
            <p>Günlük İş Özeti</p>
          </div>
          <div class="content">
            <p>Merhaba ${firstName},</p>
            <p>Son 24 saatte size uygun <strong>${totalJobs} yeni iş ilanı</strong> bulundu:</p>
            ${jobsHtml}
            <p style="margin-top: 20px;">
              <a href="https://gighub.uk/jobs" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Tüm İlanları Gör
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Bu e-postayı almak istemiyorsanız, bildirim tercihlerinizi güncelleyebilirsiniz.</p>
            <p>© ${new Date().getFullYear()} GigHub UK. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.send({
      to,
      subject: `${totalJobs} yeni iş ilanı - GigHub UK Günlük Özet`,
      html,
      text: `Merhaba ${firstName}, Son 24 saatte ${totalJobs} yeni iş ilanı bulundu.`,
    });

    return result.success;
  }

  async sendWeeklyDigestEmail(
    to: string,
    firstName: string,
    jobsByCategory: Record<string, Array<{
      id: string;
      title: string;
      description: string;
      locationCity: string | null;
      payAmount: string;
      payType: string;
    }>>
  ): Promise<boolean> {
    const totalJobs = Object.values(jobsByCategory).flat().length;

    let jobsHtml = '';
    for (const [category, jobs] of Object.entries(jobsByCategory)) {
      jobsHtml += `<h3 style="color: #4F46E5; margin-top: 20px;">${category}</h3>`;
      for (const job of jobs.slice(0, 5)) { // Max 5 jobs per category for weekly
        jobsHtml += `
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
            <h4 style="margin: 0 0 8px 0;">${job.title}</h4>
            <p style="margin: 0 0 8px 0; color: #666; font-size: 14px;">${job.description}</p>
            <p style="margin: 0; font-size: 14px;">
              <strong>Konum:</strong> ${job.locationCity || 'Belirtilmemiş'} |
              <strong>Ücret:</strong> £${job.payAmount}/${job.payType}
            </p>
          </div>
        `;
      }
      if (jobs.length > 5) {
        jobsHtml += `<p style="color: #666; font-size: 14px;">... ve ${jobs.length - 5} iş ilanı daha</p>`;
      }
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f3f4f6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>GigHub UK</h1>
            <p>Haftalık İş Özeti</p>
          </div>
          <div class="content">
            <p>Merhaba ${firstName},</p>
            <p>Bu hafta size uygun <strong>${totalJobs} yeni iş ilanı</strong> bulundu:</p>
            ${jobsHtml}
            <p style="margin-top: 20px;">
              <a href="https://gighub.uk/jobs" style="background: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Tüm İlanları Gör
              </a>
            </p>
          </div>
          <div class="footer">
            <p>Bu e-postayı almak istemiyorsanız, bildirim tercihlerinizi güncelleyebilirsiniz.</p>
            <p>© ${new Date().getFullYear()} GigHub UK. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const result = await this.send({
      to,
      subject: `${totalJobs} yeni iş ilanı - GigHub UK Haftalık Özet`,
      html,
      text: `Merhaba ${firstName}, Bu hafta ${totalJobs} yeni iş ilanı bulundu.`,
    });

    return result.success;
  }
}

export const emailService = new EmailService();
export default emailService;
