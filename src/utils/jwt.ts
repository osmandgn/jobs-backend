import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload, RefreshTokenPayload } from '../types';

export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiry as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt.secret, options);
}

export function generateRefreshToken(payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>): string {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiry as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, config.jwt.refreshSecret, options);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiry(token: string): number | null {
  const decoded = decodeToken(token);
  return decoded?.exp || null;
}

export function getTokenRemainingTime(token: string): number {
  const exp = getTokenExpiry(token);
  if (!exp) return 0;

  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, exp - now);
}

export default {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  getTokenExpiry,
  getTokenRemainingTime,
};
