import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { tokenService } from '../services/token.service';
import { sendSuccess, sendCreated } from '../utils/response';
import type {
  RegisterInput,
  VerifyEmailInput,
  ResendVerificationInput,
  SendPhoneCodeInput,
  VerifyPhoneInput,
  LoginInput,
  RefreshTokenInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  ChangePasswordInput,
  AppleAuthInput,
  GoogleAuthInput,
} from '../validators/auth.validator';
import { appleAuthService } from '../services/apple-auth.service';
import { googleAuthService } from '../services/google-auth.service';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = req.body as RegisterInput;
      const { userId, email } = await authService.register(data);

      // Generate tokens so user can verify email while logged in
      const tokens = await tokenService.generateTokens(userId, email, 'user');

      // Get user profile
      const user = await authService.getUserById(userId);

      sendCreated(res, {
        user,
        ...tokens,
      }, 'Registration successful. Please check your email to verify your account.');
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.body as VerifyEmailInput;
      const userId = req.user?.userId;

      if (!userId) {
        // For unauthenticated verification, we need email
        // This should be handled differently - user sends email + code
        throw new Error('User ID required');
      }

      await authService.verifyEmail(userId, code);
      sendSuccess(res, { verified: true }, 'Email verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as ResendVerificationInput;
      await authService.resendVerification(email);

      // Always return success to prevent email enumeration
      sendSuccess(res, null, 'If the email exists, a verification code has been sent');
    } catch (error) {
      next(error);
    }
  }

  async sendPhoneCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phone } = req.body as SendPhoneCodeInput;
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error('Authentication required');
      }

      await authService.sendPhoneVerification(userId, phone);
      sendSuccess(res, null, 'Verification code sent to your phone');
    } catch (error) {
      next(error);
    }
  }

  async verifyPhone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code } = req.body as VerifyPhoneInput;
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error('Authentication required');
      }

      await authService.verifyPhone(userId, code);
      sendSuccess(res, { verified: true }, 'Phone verified successfully');
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body as LoginInput;

      // Validate credentials
      const { userId, role } = await authService.validateCredentials(email, password);

      // Generate tokens
      const tokens = await tokenService.generateTokens(userId, email, role);

      // Get user info
      const user = await authService.getUserById(userId);

      sendSuccess(res, {
        user,
        ...tokens,
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;
      const tokens = await tokenService.refreshAccessToken(refreshToken);

      sendSuccess(res, tokens);
    } catch (error) {
      next(error);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body as RefreshTokenInput;

      // Revoke refresh token
      await tokenService.revokeToken(refreshToken);

      // Blacklist current access token
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const accessToken = authHeader.split(' ')[1];
        if (accessToken) {
          await tokenService.blacklistAccessToken(accessToken);
        }
      }

      sendSuccess(res, null, 'Logged out successfully');
    } catch (error) {
      next(error);
    }
  }

  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error('Authentication required');
      }

      // Revoke all refresh tokens
      await tokenService.revokeAllUserTokens(userId);

      // Blacklist current access token
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const accessToken = authHeader.split(' ')[1];
        if (accessToken) {
          await tokenService.blacklistAccessToken(accessToken);
        }
      }

      sendSuccess(res, null, 'Logged out from all devices');
    } catch (error) {
      next(error);
    }
  }

  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body as ForgotPasswordInput;
      await authService.forgotPassword(email);

      // Always return success to prevent email enumeration
      sendSuccess(res, null, 'If the email exists, a password reset code has been sent');
    } catch (error) {
      next(error);
    }
  }

  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { code, newPassword } = req.body as ResetPasswordInput;
      await authService.resetPassword(code, newPassword);

      sendSuccess(res, null, 'Password reset successfully. Please log in with your new password.');
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { currentPassword, newPassword } = req.body as ChangePasswordInput;
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error('Authentication required');
      }

      await authService.changePassword(userId, currentPassword, newPassword);
      sendSuccess(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  async me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;

      if (!userId) {
        throw new Error('Authentication required');
      }

      const user = await authService.getUserById(userId);
      sendSuccess(res, user);
    } catch (error) {
      next(error);
    }
  }

  async appleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { identityToken, firstName, lastName } = req.body as AppleAuthInput;

      // Verify Apple identity token
      const appleInfo = await appleAuthService.verifyIdentityToken(identityToken);

      // Find or create user
      const { user, isNewUser } = await appleAuthService.findOrCreateUser(
        appleInfo,
        firstName,
        lastName
      );

      // Generate tokens
      const tokens = await tokenService.generateTokens(user.id, user.email, user.role);

      // Get user profile
      const userProfile = await authService.getUserById(user.id);

      sendSuccess(
        res,
        {
          user: userProfile,
          ...tokens,
          isNewUser,
        },
        isNewUser ? 'Account created successfully' : 'Logged in successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  async googleAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { idToken } = req.body as GoogleAuthInput;

      // Verify Google ID token
      const googleInfo = await googleAuthService.verifyIdToken(idToken);

      // Find or create user
      const { user, isNewUser } = await googleAuthService.findOrCreateUser(googleInfo);

      // Generate tokens
      const tokens = await tokenService.generateTokens(user.id, user.email, user.role);

      // Get user profile
      const userProfile = await authService.getUserById(user.id);

      sendSuccess(
        res,
        {
          user: userProfile,
          ...tokens,
          isNewUser,
        },
        isNewUser ? 'Account created successfully' : 'Logged in successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
export default authController;
