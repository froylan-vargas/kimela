# Resend Email Setup Guide

## 1. Setting up your Resend Account

1. Go to [Resend.com](https://resend.com) and click **Get Started** to create a free account.
2. Once logged in, navigate to the **API Keys** section in the dashboard sidebar.
3. Click **Create API Key**. Give it a descriptive name (e.g., `qimela-dev`) and keep the default permissions (Full Access).
4. **Copy the API key immediately** and store it safely in your password manager. It will begin with `re_` and you won't be able to see it again.
5. *(Optional for Dev, Required for Prod)* Navigate to the **Domains** section.
6. Click **Add Domain** and enter the domain you want to send emails from (e.g., `qimela.app`).
7. Resend will provide you with several DNS records (SPF, DKIM, Return-Path).
8. Log in to your domain registrar's DNS settings (e.g., Vercel, Cloudflare, GoDaddy) and add these exact records.
9. Click **Verify** in Resend. This process can take anywhere from a few minutes to up to 48 hours to propagate.

> **Testing without a Domain:** By default, Resend allows you to test out the service without verifying a custom domain, but **only** if you send emails to the exact email address you used to register your Resend account. 

## 2. Environment Variables

To integrate the new email confirmation and password reset features defined in `docs/features/login/auth-extras.md`, you need to add the following variables to the backend's environment file (`apps/api/.env`):

```env
# Resend API Key for sending transactional emails
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxx

# Frontend URL (Used by the backend to construct the confirmation/reset links)
# Production:
# FRONTEND_URL=https://qimela.app
# Development:
FRONTEND_URL=http://localhost:3001
```

## 3. Creating Email Templates with React Email

The best way to craft beautiful, responsive emails with Resend in a modern Node.js application is by using [React Email](https://react.email/). This lets you build the email design using standard React components and inline styles.

### 3a. Installation

Since this library will be used by the backend service to generate HTML strings, install it in the API application:

```bash
pnpm --filter @qimela/api add @react-email/components @react-email/render
```

### 3b. Example: Verification Email Template

Create a new folder for your templates, such as `apps/api/src/modules/auth/infrastructure/email/templates/`, and add `verification-email.tsx`:

```tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface VerificationEmailProps {
  name: string;
  confirmUrl: string;
}

export const VerificationEmail = ({ name, confirmUrl }: VerificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Confirma tu correo electrónico en Qimela</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>¡Hola {name}!</Heading>
          <Text style={text}>
            Gracias por registrarte en Qimela. Por favor, confirma tu correo electrónico haciendo clic en el siguiente botón:
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={confirmUrl}>
              Confirmar correo
            </Button>
          </Section>
          <Text style={text}>
            Este enlace expirará en 24 horas. Si no creaste una cuenta, puedes ignorar este correo con total tranquilidad.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// --- Inline Styles ---
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '40px 20px',
  borderRadius: '8px',
  maxWidth: '600px',
};

const h1 = {
  color: '#0a0a0a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '1.2',
  margin: '0 0 20px',
};

const text = {
  color: '#333333',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 24px',
};

const btnContainer = {
  textAlign: 'center' as const,
  margin: '24px 0',
};

const button = {
  backgroundColor: '#FFD100', // Qimela Gold
  borderRadius: '4px',
  color: '#0a0a0a',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  display: 'inline-block',
  padding: '12px 24px',
};
```

### 3c. How to Use React Email with Resend

In your `ResendEmailService`, all you have to do is use the `render()` function to compile your React component down to standard HTML, and pass that to Resend:

```ts
import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { VerificationEmail } from './templates/verification-email';
import { EmailService } from '../../application/services/email.service';

@Injectable()
export class ResendEmailService implements EmailService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY!);

  async sendVerificationEmail(to: string, name: string, confirmUrl: string): Promise<void> {
    
    // 1. Render the React component to an HTML string
    const htmlBody = await render(
        VerificationEmail({ name, confirmUrl })
    );

    // 2. Send via Resend
    await this.resend.emails.send({
      from: 'Qimela <noreply@qimela.app>',
      to,
      subject: 'Confirma tu correo — Qimela',
      html: htmlBody,
    });
  }
}
```

This fully integrates Resend and provides an unopinionated, modern workflow for designing scalable transactional emails locally for Qimela!
