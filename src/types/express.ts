/* eslint-disable @typescript-eslint/no-namespace */
import { JwtPayload } from './index';

declare global {
  namespace Express {
    export interface Request {
      user?: JwtPayload;
      requestId?: string;
    }
  }
}

export {};
