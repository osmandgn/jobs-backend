# GigHub UK - Backend API

A comprehensive Node.js/Express backend API for a UK-based gig economy marketplace, enabling users to post and find local jobs.

## Features

### Authentication & Security
- **Email/Password Authentication** with secure bcrypt hashing
- **Social Login** support (Apple, Google)
- **JWT-based Authorization** with access/refresh token rotation
- **Email Verification** with 6-digit codes
- **Phone Verification** via SMS
- **Password Reset** flow with secure tokens
- **Rate Limiting** to prevent abuse
- **CORS** configured for mobile app access

### User Management
- Complete user profiles with photos, bio, location
- Skills and categories selection
- Work experience history
- Portfolio with images
- Privacy settings (show phone, allow messages)
- Account deletion with GDPR compliance

### Job System
- **Job Posting** with rich details:
  - Title, description, category
  - Location with postcode and coordinates
  - Date and time scheduling
  - Pay amount and type (hourly/fixed)
  - Experience level requirements
  - Required skills
  - Multiple photo uploads
- **Job Search** with filters:
  - Category filtering
  - Location-based search with radius
  - Pay range filtering
  - Date range filtering
  - Experience level filtering
  - Full-text search
- **Job Status Management**: draft, active, filled, completed, cancelled, expired
- **Saved Jobs** functionality

### Applications
- Apply to jobs with cover message
- Application status tracking (pending, accepted, rejected, withdrawn)
- View applicants for job owners
- Accept/reject applications
- Automatic notifications on status changes

### Messaging
- Real-time conversations between employers and applicants
- Message read status tracking
- Conversation history
- Delete conversations

### Reviews & Ratings
- Two-way review system (employer ↔ worker)
- Overall rating with sub-ratings:
  - Punctuality
  - Quality
  - Communication
- Review comments
- Average rating calculation

### Notifications
- Push notifications via Firebase
- Email notifications
- Notification preferences per type:
  - New job matches
  - Application updates
  - Messages
  - Reviews
- Email digest frequency settings (instant, daily, weekly)

### Admin Features
- Admin dashboard with statistics
- User management (suspend, ban, delete)
- Job moderation (approve, reject)
- Report handling
- System settings management
- Admin action logging

### GDPR Compliance
- Data export (JSON/CSV)
- Account deletion with 30-day grace period
- Consent management
- Marketing preferences

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express** | Web framework |
| **TypeScript** | Type safety |
| **PostgreSQL** | Primary database |
| **Prisma** | ORM & migrations |
| **Redis** | Caching & rate limiting |
| **JWT** | Authentication tokens |
| **Zod** | Request validation |
| **Firebase Admin** | Push notifications |
| **Nodemailer** | Email sending |
| **Docker** | Containerization |

## Project Structure

```
backend/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── migrations/        # Database migrations
│   └── seed.ts            # Seed data
├── src/
│   ├── config/            # Configuration files
│   │   ├── database.ts    # Prisma client
│   │   ├── redis.ts       # Redis client
│   │   ├── firebase.ts    # Firebase setup
│   │   └── swagger.ts     # API documentation
│   ├── controllers/       # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── job.controller.ts
│   │   ├── application.controller.ts
│   │   ├── message.controller.ts
│   │   ├── user.controller.ts
│   │   └── admin/         # Admin controllers
│   ├── services/          # Business logic
│   │   ├── auth.service.ts
│   │   ├── job.service.ts
│   │   ├── application.service.ts
│   │   ├── message.service.ts
│   │   ├── user.service.ts
│   │   ├── cache.service.ts
│   │   ├── email.service.ts
│   │   └── pushNotification.service.ts
│   ├── routes/            # API routes
│   │   ├── auth.routes.ts
│   │   ├── job.routes.ts
│   │   ├── application.routes.ts
│   │   └── admin/         # Admin routes
│   ├── middlewares/       # Express middlewares
│   │   ├── auth.middleware.ts
│   │   ├── rateLimiter.ts
│   │   ├── validate.ts
│   │   └── errorHandler.ts
│   ├── validators/        # Zod schemas
│   ├── utils/             # Helper functions
│   ├── types/             # TypeScript types
│   ├── jobs/              # Scheduled jobs
│   ├── workers/           # Background workers
│   ├── app.ts             # Express app setup
│   └── server.ts          # Server entry point
├── docker-compose.yml     # Docker services
├── Dockerfile             # API container
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/osmandgn/jobs-backend.git
cd jobs-backend
```

2. **Create environment file**
```bash
cp .env.example .env
```

3. **Configure environment variables**
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/gighub"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT Secrets (generate secure random strings)
JWT_ACCESS_SECRET="your-access-secret-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"

# Email (SMTP)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
EMAIL_FROM="GigHub UK <noreply@gighub.uk>"

# Firebase (for push notifications)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"

# Optional: Social Login
GOOGLE_CLIENT_ID="your-google-client-id"
APPLE_CLIENT_ID="your-apple-client-id"
```

4. **Start with Docker**
```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- Redis on port 6379
- API on port 3000

5. **Run database migrations**
```bash
docker exec gighub-api npx prisma migrate deploy
```

6. **Seed initial data (optional)**
```bash
docker exec gighub-api npx prisma db seed
```

### Development

**Start development server with hot reload:**
```bash
docker exec gighub-api npm run dev
```

**View logs:**
```bash
docker logs -f gighub-api
```

**Access database:**
```bash
docker exec -it gighub-postgres psql -U postgres -d gighub
```

**Clear Redis cache:**
```bash
docker exec gighub-redis redis-cli FLUSHALL
```

## API Documentation

When the server is running, access Swagger UI at:
```
http://localhost:3000/api-docs
```

### API Endpoints Overview

#### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login with email/password |
| POST | `/api/v1/auth/logout` | Logout (revoke tokens) |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/forgot-password` | Request password reset |
| POST | `/api/v1/auth/reset-password` | Reset password with code |
| POST | `/api/v1/auth/verify-email` | Verify email address |
| POST | `/api/v1/auth/google` | Google sign in |
| POST | `/api/v1/auth/apple` | Apple sign in |

#### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/jobs` | Search/list jobs |
| GET | `/api/v1/jobs/:id` | Get job details |
| POST | `/api/v1/jobs` | Create new job |
| PUT | `/api/v1/jobs/:id` | Update job |
| DELETE | `/api/v1/jobs/:id` | Delete job |
| GET | `/api/v1/jobs/my-jobs` | Get user's posted jobs |
| POST | `/api/v1/jobs/:id/save` | Save job |
| DELETE | `/api/v1/jobs/:id/save` | Unsave job |
| GET | `/api/v1/jobs/saved` | Get saved jobs |

#### Applications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/applications/:jobId` | Apply to job |
| GET | `/api/v1/applications/my` | Get my applications |
| GET | `/api/v1/applications/job/:jobId` | Get job applications (owner) |
| PUT | `/api/v1/applications/:id/status` | Update application status |
| DELETE | `/api/v1/applications/:id` | Withdraw application |

#### Messages
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/messages/conversations` | Get conversations |
| GET | `/api/v1/messages/conversations/:id` | Get conversation messages |
| POST | `/api/v1/messages/conversations/:id` | Send message |
| PUT | `/api/v1/messages/conversations/:id/read` | Mark as read |

#### Users & Profiles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users/me` | Get current user |
| PUT | `/api/v1/users/me` | Update profile |
| GET | `/api/v1/users/:id` | Get public profile |
| POST | `/api/v1/users/:id/block` | Block user |
| DELETE | `/api/v1/users/:id/block` | Unblock user |

#### Reviews
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/reviews` | Create review |
| GET | `/api/v1/reviews/user/:id` | Get user reviews |
| GET | `/api/v1/reviews/job/:id` | Get job reviews |

#### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/notifications` | Get notifications |
| PUT | `/api/v1/notifications/:id/read` | Mark as read |
| PUT | `/api/v1/notifications/read-all` | Mark all as read |
| GET | `/api/v1/notifications/preferences` | Get preferences |
| PUT | `/api/v1/notifications/preferences` | Update preferences |

## Database Schema

### Core Models

```
User
├── id, email, passwordHash
├── firstName, lastName, phone
├── profilePhotoUrl, bio
├── location (city, postcode, lat, lng)
├── isJobSeeker, isEmployer, isActivelyLooking
├── status (active, suspended, banned)
└── Relations: skills, categories, experiences, portfolio

Job
├── id, userId, categoryId
├── title, description
├── location (address, postcode, city, lat, lng)
├── jobDate, startTime, endTime
├── payAmount, payType, experienceLevel
├── status, viewsCount, applicationsCount
└── Relations: images, requiredSkills, applications

Application
├── id, jobId, applicantId
├── message, status
└── Relations: job, applicant

Conversation
├── id, jobId, employerId, applicantId
└── Relations: messages

Review
├── id, jobId, reviewerId, revieweeId
├── rating, punctualityRating, qualityRating
├── communicationRating, comment
└── Relations: job, reviewer, reviewee
```

## Validation Rules

All inputs are validated using Zod schemas:

| Field | Format | Example |
|-------|--------|---------|
| Email | Valid email | `user@example.com` |
| Password | Min 8 chars, 1 upper, 1 lower, 1 number | `Password123` |
| UK Postcode | Valid UK format | `SW1A 1AA` |
| Phone | UK format | `+447123456789` |
| Date | ISO format | `2024-12-25` |
| Time | 24-hour | `14:30` |
| UUID | Valid UUID v4 | `550e8400-e29b-41d4-a716-446655440000` |

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "message": "Error description",
  "error": "ERROR_CODE",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing/invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

## Caching Strategy

Redis is used for caching with the following TTLs:

| Data | TTL | Key Pattern |
|------|-----|-------------|
| Job details | 5 min | `job:{id}` |
| Job search | 2 min | `jobs:search:{hash}` |
| User profile | 5 min | `user:{id}` |
| Categories | 1 hour | `categories:all` |
| Skills | 1 hour | `skills:all` |

Cache invalidation happens automatically on data updates.

## Background Jobs

Scheduled tasks using node-cron:

| Job | Schedule | Description |
|-----|----------|-------------|
| Expire jobs | Daily 00:00 | Mark old jobs as expired |
| Cleanup tokens | Daily 01:00 | Remove expired refresh tokens |
| Job reminders | Daily 08:00 | Send reminder notifications |
| Notification digest | Daily 09:00 | Send email digests |

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --grep "auth"
```

## Deployment

### Docker Production Build

```bash
# Build production image
docker build -t gighub-api:latest .

# Run with production env
docker run -d \
  --name gighub-api \
  -p 3000:3000 \
  --env-file .env.production \
  gighub-api:latest
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000

# Use connection pooling for database
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20"

# Use Redis cluster/sentinel for HA
REDIS_URL="redis://user:pass@host:6379"

# Strong secrets
JWT_ACCESS_SECRET="<64-char-random-string>"
JWT_REFRESH_SECRET="<64-char-random-string>"
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and feature requests, please use the [GitHub Issues](https://github.com/osmandgn/jobs-backend/issues) page.
