export const EMAIL_SERVICE = Symbol('EMAIL_SERVICE');

export interface EmailService {
  sendVerificationEmail(to: string, name: string, confirmUrl: string): Promise<void>;
  sendPasswordResetEmail(to: string, name: string, resetUrl: string): Promise<void>;
}
