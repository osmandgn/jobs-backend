import { config } from '../config';
import logger from '../utils/logger';

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private accountSid: string;
  private authToken: string;
  private fromNumber: string;
  private baseUrl: string;

  constructor() {
    this.accountSid = config.twilio.accountSid;
    this.authToken = config.twilio.authToken;
    this.fromNumber = config.twilio.phoneNumber;
    this.baseUrl = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
  }

  async sendSMS(to: string, body: string): Promise<SMSResult> {
    if (!this.accountSid || !this.authToken || !this.fromNumber) {
      logger.warn('Twilio not configured, SMS not sent');
      if (config.env === 'development') {
        logger.debug('SMS content:', { to, body });
      }
      return { success: true, messageId: 'dev-mode' };
    }

    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: this.fromNumber,
          Body: body,
        }),
      });

      const data = (await response.json()) as { sid?: string; message?: string };

      if (response.ok && data.sid) {
        logger.info(`SMS sent to ${to}, messageId: ${data.sid}`);
        return { success: true, messageId: data.sid };
      } else {
        logger.error(`Failed to send SMS to ${to}:`, data);
        return { success: false, error: data.message || 'Unknown error' };
      }
    } catch (error) {
      logger.error('SMS send error:', error);
      return { success: false, error: String(error) };
    }
  }

  async sendVerificationCode(to: string, code: string): Promise<boolean> {
    const message = `Your GigHub UK verification code is: ${code}. This code expires in 10 minutes.`;
    const result = await this.sendSMS(to, message);
    return result.success;
  }
}

export const smsService = new SMSService();
export default smsService;
