import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import Script from "next/script";
import "../styles/globals.scss";
import Providers from "./providers";
import Header from "@/components/Header/Header";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kimela",
  description: "Sports pools platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <head>
        <Script
          src="https://unpkg.com/@phosphor-icons/web"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
