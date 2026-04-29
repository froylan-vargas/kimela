import { Button, Html, Text, Heading, Section } from "@react-email/components";
import * as React from "react";
import { render } from "@react-email/render";

interface VerificationEmailProps {
  name: string;
  confirmUrl: string;
}

export function VerificationEmail({
  name,
  confirmUrl,
}: VerificationEmailProps) {
  return (
    <Html>
      <Section>
        <Heading>¡Hola {name}!</Heading>
        <Text>
          Confirma tu correo electrónico para acceder a todas las funciones de
          qimela.
        </Text>
        <Button href={confirmUrl}>Confirmar correo</Button>
        <Text>Este enlace expira en 24 horas.</Text>
      </Section>
    </Html>
  );
}

export const renderVerificationEmail = (
  props: VerificationEmailProps,
): Promise<string> => render(<VerificationEmail {...props} />);
