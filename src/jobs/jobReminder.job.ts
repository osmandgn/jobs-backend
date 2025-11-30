/**
 * Job Reminder Job
 * Sends reminders for upcoming jobs
 */

import { prisma } from '../config/database';
import { sendAndSaveNotification } from '../services/pushNotification.service';
import logger from '../utils/logger';

/**
 * Send reminders for jobs happening soon
 * Run: Every hour
 */
export async function sendJobReminders(): Promise<number> {
  try {
    const now = new Date();
    const reminderWindow = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    // Find jobs happening in the next 24 hours that haven't been reminded
    const upcomingJobs = await prisma.job.findMany({
      where: {
        status: 'active',
        jobDate: {
          gte: now,
          lte: reminderWindow,
        },
      },
      include: {
        user: {
          select: { id: true, firstName: true },
        },
        applications: {
          where: { status: 'accepted' },
          include: {
            applicant: {
              select: { id: true, firstName: true },
            },
          },
        },
      },
    });

    let remindersSent = 0;

    for (const job of upcomingJobs) {
      const hoursUntilJob = Math.round(
        (job.jobDate.getTime() - now.getTime()) / (1000 * 60 * 60)
      );

      // Send reminder to job poster
      await sendAndSaveNotification(
        job.user.id,
        'job_reminder',
        {
          title: 'Job Reminder',
          body: `Your job "${job.title}" is starting in ${hoursUntilJob} hours`,
          data: {
            type: 'job_reminder',
            jobId: job.id,
            hoursUntil: String(hoursUntilJob),
          },
        },
        job.id
      );
      remindersSent++;

      // Send reminder to accepted applicants
      for (const application of job.applications) {
        await sendAndSaveNotification(
          application.applicant.id,
          'job_reminder',
          {
            title: 'Job Reminder',
            body: `"${job.title}" is starting in ${hoursUntilJob} hours`,
            data: {
              type: 'job_reminder',
              jobId: job.id,
              hoursUntil: String(hoursUntilJob),
            },
          },
          job.id
        );
        remindersSent++;
      }
    }

    if (remindersSent > 0) {
      logger.info(`Sent ${remindersSent} job reminders`);
    }

    return remindersSent;
  } catch (error) {
    logger.error('Failed to send job reminders', { error });
    throw error;
  }
}

export default sendJobReminders;
