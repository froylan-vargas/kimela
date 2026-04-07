import { Button, Html, Text, Heading, Section } from '@react-email/components';
import * as React from 'react';
import { render } from '@react-email/render';

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
}

export function PasswordResetEmail({ name, resetUrl }: PasswordResetEmailProps) {
  return (
    <Html>
      <Section>
        <Heading>¡Hola {name}!</Heading>
        <Text>Recibimos una solicitud para restablecer tu contraseña en Kimela.</Text>
        <Button href={resetUrl}>Restablecer contraseña</Button>
        <Text>Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.</Text>
      </Section>
    </Html>
  );
}

export const renderPasswordResetEmail = (props: PasswordResetEmailProps): Promise<string> =>
  render(<PasswordResetEmail {...props} />);
