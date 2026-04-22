import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "../styles/globals.scss";
import Providers from "./providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Qimela",
  description: "Sports pools platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
