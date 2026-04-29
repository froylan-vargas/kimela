import { Injectable } from "@nestjs/common";
import { Resend } from "resend";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { EmailService } from "../../application/services/email.service";
import { renderVerificationEmail } from "./templates/verification-email";
import { renderPasswordResetEmail } from "./templates/password-reset-email";

@Injectable()
export class ResendEmailService implements EmailService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

  constructor(
    @InjectPinoLogger(ResendEmailService.name)
    private readonly logger: PinoLogger,
  ) {}

  async sendVerificationEmail(
    to: string,
    name: string,
    confirmUrl: string,
  ): Promise<void> {
    const html = await renderVerificationEmail({ name, confirmUrl });
    this.logger.info(`Sending verification email to: ${to}`);
    console.log("process.env.NODE_ENV", process.env.NODE_ENV);
    await this.resend.emails.send({
      from: "qimela <noreply@qimela.com>",
      to,
      subject: "Confirma tu correo — qimela",
      html,
    });
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetUrl: string,
  ): Promise<void> {
    const html = await renderPasswordResetEmail({ name, resetUrl });
    this.logger.info(`Sending password reset email to: ${to}`);
    await this.resend.emails.send({
      from: "qimela <noreply@qimela.com>",
      to,
      subject: "Restablece tu contraseña — qimela",
      html,
    });
  }
}
