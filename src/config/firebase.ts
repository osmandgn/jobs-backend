import admin, { ServiceAccount } from 'firebase-admin';
import { config } from './index';
import logger from '../utils/logger';

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App | null {
  // Check if Firebase credentials are configured
  if (
    !config.firebase.projectId ||
    !config.firebase.privateKey ||
    !config.firebase.clientEmail
  ) {
    logger.warn('Firebase credentials not configured. Push notifications will be disabled.');
    return null;
  }

  try {
    // Check if already initialized
    if (firebaseApp) {
      return firebaseApp;
    }

    const serviceAccount: ServiceAccount = {
      projectId: config.firebase.projectId,
      privateKey: config.firebase.privateKey,
      clientEmail: config.firebase.clientEmail,
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    logger.info('Firebase Admin SDK initialized successfully');
    return firebaseApp;
  } catch (error) {
    logger.error('Failed to initialize Firebase Admin SDK', { error });
    return null;
  }
}

export function getFirebaseAdmin(): admin.app.App | null {
  if (!firebaseApp) {
    return initializeFirebase();
  }
  return firebaseApp;
}

export function getMessaging(): admin.messaging.Messaging | null {
  const app = getFirebaseAdmin();
  if (!app) {
    return null;
  }
  return admin.messaging(app);
}

export function isFirebaseConfigured(): boolean {
  return !!(
    config.firebase.projectId &&
    config.firebase.privateKey &&
    config.firebase.clientEmail
  );
}

export default {
  initializeFirebase,
  getFirebaseAdmin,
  getMessaging,
  isFirebaseConfigured,
};
