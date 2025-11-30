/**
 * Email Worker
 * Processes email sending jobs
 */

import { Job } from 'bull';
import { emailQueue, EmailJobData } from '../queues';
import { emailService } from '../services/email.service';
import logger from '../utils/logger';

/**
 * Process email job
 */
async function processEmailJob(job: Job<EmailJobData>): Promise<void> {
  const { to, template, subject, data } = job.data;

  logger.debug(`Processing email job ${job.id}`, { to, template });

  try {
    // Send email based on template type
    switch (template) {
      case 'verification':
        await emailService.sendVerificationEmail(to, data.code as string, data.firstName as string);
        break;
      case 'welcome':
        await emailService.sendWelcomeEmail(to, data.firstName as string);
        break;
      case 'password-reset':
        await emailService.sendPasswordResetEmail(to, data.code as string, data.firstName as string);
        break;
      case 'application-received':
        await emailService.sendApplicationReceivedEmail(
          to,
          data.employerName as string,
          data.jobTitle as string,
          data.applicantName as string
        );
        break;
      case 'application-status':
        await emailService.sendApplicationStatusEmail(
          to,
          data.applicantName as string,
          data.jobTitle as string,
          data.status as 'accepted' | 'rejected'
        );
        break;
      case 'new-review':
        await emailService.sendNewReviewEmail(
          to,
          data.userName as string,
          data.reviewerName as string,
          data.rating as number,
          data.jobTitle as string
        );
        break;
      default:
        // Generic email with custom subject and template
        logger.warn(`Unknown email template: ${template}`, { to });
        break;
    }

    logger.debug(`Email job ${job.id} completed`, { to, template });
  } catch (error) {
    logger.error(`Email job ${job.id} failed`, {
      to,
      template,
      error: error instanceof Error ? error.message : error,
    });
    throw error;
  }
}

/**
 * Start the email worker
 */
export function startEmailWorker(concurrency: number = 3): void {
  const queue = emailQueue();

  queue.process(concurrency, processEmailJob);

  logger.info(`Email worker started with concurrency ${concurrency}`);
}

export default { startEmailWorker };
