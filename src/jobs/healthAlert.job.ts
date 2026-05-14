import { systemMetricsService, apiMetricsService } from '../services/monitoring';
import { getRedisClient } from '../config/redis';
import { config } from '../config';
import logger from '../utils/logger';

const ALERT_COOLDOWN_KEY = 'monitoring:alert:cooldown';
const ALERT_COOLDOWN_SECONDS = 1800;
const ERROR_RATE_THRESHOLD = 10;

interface HealthIssue {
  service: string;
  status: string;
  detail?: string;
}

async function isAlertOnCooldown(): Promise<boolean> {
  try {
    const redis = getRedisClient();
    return (await redis.exists(ALERT_COOLDOWN_KEY)) === 1;
  } catch {
    return false;
  }
}

async function setAlertCooldown(): Promise<void> {
  try {
    const redis = getRedisClient();
    await redis.setex(ALERT_COOLDOWN_KEY, ALERT_COOLDOWN_SECONDS, '1');
  } catch {
    // continue
  }
}

async function sendAlertEmail(issues: HealthIssue[], errorRate?: number): Promise<void> {
  const alertEmail = process.env.ALERT_EMAIL;
  if (!alertEmail || !config.resend.apiKey) {
    logger.warn('ALERT_EMAIL or RESEND_API_KEY not configured, skipping alert');
    return;
  }

  const issueRows = issues
    .map((i) => `<tr><td style="padding:8px;border:1px solid #e5e7eb;font-weight:bold;">${i.service}</td><td style="padding:8px;border:1px solid #e5e7eb;color:#DC2626;">${i.status}</td><td style="padding:8px;border:1px solid #e5e7eb;">${i.detail || '-'}</td></tr>`)
    .join('');

  const errorRateSection = errorRate !== undefined && errorRate > ERROR_RATE_THRESHOLD
    ? `<p style="margin-top:16px;"><strong>Error Rate:</strong> <span style="color:#DC2626;font-size:18px;">${errorRate.toFixed(1)}%</span> (threshold: ${ERROR_RATE_THRESHOLD}%)</p>`
    : '';

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#DC2626;color:white;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
      <h1 style="margin:0;">GigHub UK - Health Alert</h1>
    </div>
    <div style="padding:20px;background:#FEF2F2;border:1px solid #FECACA;">
      <p>One or more services are experiencing issues:</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;">
        <tr style="background:#F3F4F6;">
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Service</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Status</th>
          <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Detail</th>
        </tr>
        ${issueRows}
      </table>
      ${errorRateSection}
      <p style="margin-top:16px;font-size:13px;color:#666;">
        Environment: ${config.env} | Time: ${new Date().toISOString()}
      </p>
      <p style="margin-top:8px;">
        <a href="https://admin.digen.space/monitoring" style="background:#4F46E5;color:white;padding:10px 20px;text-decoration:none;border-radius:6px;display:inline-block;">View Monitoring Dashboard</a>
      </p>
    </div>
  </div>
</body></html>`;

  const issueNames = issues.map((i) => i.service).join(', ');

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resend.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${config.resend.fromName} <${config.resend.fromEmail}>`,
        to: [alertEmail],
        subject: `[ALERT] GigHub UK - ${issueNames}`,
        html,
      }),
    });

    if (response.ok) {
      logger.warn(`Health alert sent to ${alertEmail}: ${issueNames}`);
    } else {
      const data = await response.json();
      logger.error('Failed to send health alert:', data);
    }
  } catch (error) {
    logger.error('Failed to send health alert email:', error);
  }
}

export async function runHealthCheck(): Promise<void> {
  const issues: HealthIssue[] = [];

  const dbStatus = await systemMetricsService.getDatabaseStatus();
  if (dbStatus.status === 'disconnected') {
    issues.push({ service: 'PostgreSQL', status: 'DOWN', detail: 'Connection failed' });
  } else if (dbStatus.responseTime && dbStatus.responseTime > 5000) {
    issues.push({ service: 'PostgreSQL', status: 'SLOW', detail: `${dbStatus.responseTime}ms response` });
  }

  const redisStatus = await systemMetricsService.getRedisStatus();
  if (redisStatus.status === 'disconnected') {
    issues.push({ service: 'Redis', status: 'DOWN', detail: 'Connection failed' });
  }

  let errorRate: number | undefined;
  try {
    const metrics = await apiMetricsService.getApiMetrics();
    if (metrics.totalRequests > 50) {
      errorRate = metrics.errorRate;
      if (errorRate > ERROR_RATE_THRESHOLD) {
        issues.push({
          service: 'API Error Rate',
          status: 'HIGH',
          detail: `${errorRate.toFixed(1)}% (${metrics.errorCount}/${metrics.totalRequests})`,
        });
      }
    }
  } catch {
    // metrics unavailable
  }

  try {
    const overview = await systemMetricsService.getSystemOverview();
    if (overview.memory.percentage > 90) {
      issues.push({ service: 'Memory', status: 'CRITICAL', detail: `${overview.memory.percentage}% used` });
    }
  } catch {
    // system metrics unavailable
  }

  if (issues.length === 0) return;

  if (await isAlertOnCooldown()) {
    logger.debug('Health alert suppressed (cooldown active)');
    return;
  }

  await sendAlertEmail(issues, errorRate);
  await setAlertCooldown();
}
