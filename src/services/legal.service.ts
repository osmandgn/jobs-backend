import { readFile } from 'fs/promises';
import { join } from 'path';
import logger from '../utils/logger';
import { cacheService } from './cache.service';
import { NotFoundError, ErrorCodes } from '../utils/AppError';

export type LegalDocumentType = 'terms' | 'privacy' | 'guidelines' | 'safety' | 'cookies';

interface LegalDocument {
  type: LegalDocumentType;
  title: string;
  content: string;
  version: string;
  effectiveDate: string;
  lastUpdated: string;
}

// Document metadata
const DOCUMENT_METADATA: Record<LegalDocumentType, { title: string; version: string; effectiveDate: string }> = {
  terms: {
    title: 'Terms of Service',
    version: '1.0.0',
    effectiveDate: '2024-01-01',
  },
  privacy: {
    title: 'Privacy Policy',
    version: '1.0.0',
    effectiveDate: '2024-01-01',
  },
  guidelines: {
    title: 'Community Guidelines',
    version: '1.0.0',
    effectiveDate: '2024-01-01',
  },
  safety: {
    title: 'Safety Tips',
    version: '1.0.0',
    effectiveDate: '2024-01-01',
  },
  cookies: {
    title: 'Cookie Policy',
    version: '1.0.0',
    effectiveDate: '2024-01-01',
  },
};

const CACHE_KEY_PREFIX = 'legal:doc:';
const CACHE_TTL = 60 * 60; // 1 hour

/**
 * Get legal document content
 */
export async function getDocument(type: LegalDocumentType): Promise<LegalDocument> {
  // Check cache
  const cacheKey = `${CACHE_KEY_PREFIX}${type}`;
  const cached = await cacheService.get<LegalDocument>(cacheKey);
  if (cached) {
    return cached;
  }

  // Get metadata
  const metadata = DOCUMENT_METADATA[type];
  if (!metadata) {
    throw new NotFoundError(`Document not found: ${type}`, ErrorCodes.NOT_FOUND);
  }

  // Read content from file
  const contentPath = join(__dirname, '..', 'content', `${type}.md`);
  let content: string;

  try {
    content = await readFile(contentPath, 'utf-8');
  } catch (error) {
    logger.error(`Failed to read legal document: ${type}`, { error });
    // Return placeholder content if file doesn't exist
    content = getPlaceholderContent(type);
  }

  const document: LegalDocument = {
    type,
    title: metadata.title,
    content,
    version: metadata.version,
    effectiveDate: metadata.effectiveDate,
    lastUpdated: new Date().toISOString(),
  };

  // Cache the document
  await cacheService.set(cacheKey, document, CACHE_TTL);

  return document;
}

/**
 * Get document version info
 */
export async function getDocumentVersion(type: LegalDocumentType): Promise<{
  type: LegalDocumentType;
  version: string;
  effectiveDate: string;
}> {
  const metadata = DOCUMENT_METADATA[type];
  if (!metadata) {
    throw new NotFoundError(`Document not found: ${type}`, ErrorCodes.NOT_FOUND);
  }

  return {
    type,
    version: metadata.version,
    effectiveDate: metadata.effectiveDate,
  };
}

/**
 * Get all document types with their versions
 */
export async function getAllDocumentVersions(): Promise<Array<{
  type: LegalDocumentType;
  title: string;
  version: string;
  effectiveDate: string;
}>> {
  return Object.entries(DOCUMENT_METADATA).map(([type, metadata]) => ({
    type: type as LegalDocumentType,
    title: metadata.title,
    version: metadata.version,
    effectiveDate: metadata.effectiveDate,
  }));
}

/**
 * Invalidate cached legal document
 */
export async function invalidateDocumentCache(type: LegalDocumentType): Promise<void> {
  await cacheService.del(`${CACHE_KEY_PREFIX}${type}`);
  logger.info(`Legal document cache invalidated: ${type}`);
}

/**
 * Get placeholder content when file doesn't exist
 */
function getPlaceholderContent(type: LegalDocumentType): string {
  switch (type) {
    case 'terms':
      return `# Terms of Service

## 1. Acceptance of Terms
By accessing and using GigHub UK, you agree to be bound by these Terms of Service.

## 2. Description of Service
GigHub UK is a platform that connects job seekers with employers for short-term work opportunities in the United Kingdom.

## 3. User Accounts
- You must be at least 18 years old to use this service
- You are responsible for maintaining the security of your account
- You must provide accurate and complete information

## 4. User Conduct
Users agree not to:
- Post false or misleading information
- Harass, abuse, or harm other users
- Use the platform for illegal activities
- Attempt to circumvent any security measures

## 5. Payment Disclaimer
GigHub UK is a job matching platform only. All payments for work are arranged directly between employers and workers.

## 6. Limitation of Liability
GigHub UK is not responsible for any disputes between users or the quality of work performed.

## 7. Changes to Terms
We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of new terms.

## 8. Contact
For questions about these terms, contact us at legal@gighub.uk`;

    case 'privacy':
      return `# Privacy Policy

## 1. Introduction
This Privacy Policy explains how GigHub UK ("we", "our", "us") collects, uses, and protects your personal information in accordance with the UK Data Protection Act 2018 and UK GDPR.

## 2. Information We Collect
- **Account Information**: Name, email, phone number, profile photo
- **Location Data**: Postcode and general location for job matching
- **Usage Data**: How you interact with our platform
- **Communications**: Messages between users

## 3. How We Use Your Information
- To provide and improve our services
- To match you with relevant job opportunities
- To facilitate communication between users
- To send notifications about jobs and applications

## 4. Data Sharing
We do not sell your personal data. We may share data with:
- Other users (as necessary for the service)
- Service providers who assist our operations
- Law enforcement when legally required

## 5. Your Rights (GDPR)
You have the right to:
- Access your personal data
- Correct inaccurate data
- Delete your data (right to be forgotten)
- Export your data (data portability)
- Restrict processing
- Object to processing

## 6. Data Retention
We retain your data for as long as your account is active. You can request deletion at any time.

## 7. Security
We implement appropriate technical and organizational measures to protect your data.

## 8. Contact
Data Protection Officer: dpo@gighub.uk`;

    case 'guidelines':
      return `# Community Guidelines

## Our Commitment
GigHub UK is committed to maintaining a safe, respectful, and professional environment for all users.

## Expected Behaviour

### For All Users
- Be honest and accurate in your profile and communications
- Treat others with respect and professionalism
- Respond to messages in a timely manner
- Honour your commitments

### For Employers
- Provide accurate job descriptions and pay information
- Pay workers as agreed
- Maintain a safe working environment
- Provide necessary equipment and instructions

### For Job Seekers
- Only apply for jobs you're qualified for and can attend
- Arrive on time and complete the work as agreed
- Communicate promptly if issues arise
- Respect the employer's property and instructions

## Prohibited Behaviour
- Harassment or discrimination of any kind
- Posting false or misleading information
- Requesting or offering payment outside the platform for illegal purposes
- Creating multiple accounts
- Spamming or excessive messaging

## Reporting Violations
If you encounter behaviour that violates these guidelines, please report it through the app. All reports are reviewed by our team.

## Consequences
Violations may result in:
- Warning
- Temporary suspension
- Permanent ban

We reserve the right to take action at our discretion to protect our community.`;

    case 'safety':
      return `# Safety Tips

## For Job Seekers

### Before Accepting a Job
- Research the employer and their reviews
- Verify the job details are clear and legitimate
- Trust your instincts - if something seems wrong, don't accept
- Let someone know where you'll be working

### Meeting Employers
- First meetings should be in public places when possible
- Share your location with a trusted friend or family member
- Keep your phone charged

### While Working
- Don't accept cash-only jobs for large amounts
- Document any injuries or incidents immediately
- Leave if you feel unsafe

## For Employers

### Posting Jobs
- Be accurate about the job requirements and pay
- Only request skills actually needed for the job
- Clearly communicate expectations

### Hiring Workers
- Check reviews and ratings
- Verify identity through the app
- Provide clear instructions and safety equipment

## General Safety

### Account Security
- Use a strong, unique password
- Enable two-factor authentication
- Don't share your login details

### Communication
- Keep communications through the app when possible
- Don't share personal financial information
- Report suspicious messages

### In Case of Emergency
- Contact emergency services immediately (999)
- Report incidents to us through the app
- Document everything

## Resources
- National Domestic Abuse Helpline: 0808 2000 247
- Citizens Advice: 0800 144 8848
- ACAS: 0300 123 1100`;

    case 'cookies':
      return `# Cookie Policy

## What Are Cookies?
Cookies are small text files stored on your device when you visit websites.

## How We Use Cookies

### Essential Cookies
These are necessary for the website to function properly.
- Authentication and security
- Session management
- Load balancing

### Analytics Cookies
Help us understand how visitors use our website.
- Page views and navigation patterns
- Performance metrics
- Error tracking

### Preference Cookies
Remember your settings and preferences.
- Language settings
- Theme preferences
- Notification settings

## Third-Party Cookies
We may use services that set their own cookies:
- Google Analytics (analytics)
- Firebase (push notifications)
- Sentry (error tracking)

## Managing Cookies
You can control cookies through your browser settings. Note that disabling certain cookies may affect functionality.

## Updates
This policy may be updated periodically. Check back for changes.

## Contact
For questions about our cookie policy, contact privacy@gighub.uk`;

    default:
      return `# Document Not Found

The requested document is not available.`;
  }
}

export const legalService = {
  getDocument,
  getDocumentVersion,
  getAllDocumentVersions,
  invalidateDocumentCache,
};

export default legalService;
