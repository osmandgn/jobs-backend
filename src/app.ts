import express, { Application, Request } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';

import { config } from './config';
import { setupSwagger } from './config/swagger';
import { requestIdMiddleware } from './middlewares/requestId';
import { generalLimiter } from './middlewares/rateLimiter';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import logger from './utils/logger';

import healthRoutes from './routes/health.routes';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import profileRoutes from './routes/profile.routes';
import uploadRoutes from './routes/upload.routes';
import categoryRoutes from './routes/category.routes';
import skillRoutes from './routes/skill.routes';
import jobRoutes from './routes/job.routes';
import applicationRoutes from './routes/application.routes';
import locationRoutes from './routes/location.routes';
import conversationRoutes from './routes/message.routes';
import messagesRoutes from './routes/messages.routes';
import reviewRoutes from './routes/review.routes';
import reportRoutes from './routes/report.routes';
import deviceRoutes from './routes/device.routes';
import notificationRoutes from './routes/notification.routes';
import adminRoutes from './routes/admin';
import legalRoutes from './routes/legal.routes';
import gdprRoutes from './routes/gdpr.routes';

const app: Application = express();

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middlewares
app.use(helmet());
app.use(hpp());

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      if (config.cors.origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  })
);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Compression
app.use(compression());

// Request ID for tracing
app.use(requestIdMiddleware);

// Swagger documentation (only in development)
if (config.env !== 'production') {
  setupSwagger(app);
}

// Rate limiting
app.use(`/api/${config.apiVersion}`, generalLimiter);

// Request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      requestId: req.requestId,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
});

// API Routes
app.use(`/api/${config.apiVersion}/health`, healthRoutes);
app.use(`/api/${config.apiVersion}/auth`, authRoutes);
app.use(`/api/${config.apiVersion}/users`, userRoutes);
app.use(`/api/${config.apiVersion}/profile`, profileRoutes);
app.use(`/api/${config.apiVersion}/upload`, uploadRoutes);
app.use(`/api/${config.apiVersion}/categories`, categoryRoutes);
app.use(`/api/${config.apiVersion}/skills`, skillRoutes);
app.use(`/api/${config.apiVersion}/jobs`, jobRoutes);
app.use(`/api/${config.apiVersion}/applications`, applicationRoutes);
app.use(`/api/${config.apiVersion}/locations`, locationRoutes);
app.use(`/api/${config.apiVersion}/conversations`, conversationRoutes);
app.use(`/api/${config.apiVersion}/messages`, messagesRoutes);
app.use(`/api/${config.apiVersion}/reviews`, reviewRoutes);
app.use(`/api/${config.apiVersion}/reports`, reportRoutes);
app.use(`/api/${config.apiVersion}/devices`, deviceRoutes);
app.use(`/api/${config.apiVersion}/notifications`, notificationRoutes);
app.use(`/api/${config.apiVersion}/admin`, adminRoutes);
app.use(`/api/${config.apiVersion}/legal`, legalRoutes);
app.use(`/api/${config.apiVersion}/gdpr`, gdprRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
