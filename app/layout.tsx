import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Berkan Akin — Développeur Full Stack & Product Owner",
  description: "Étudiant en BUT Informatique à l'IUT Annecy. Développeur fullstack (.NET, Laravel, Next.js), Product Owner et créateur de Kulpryt. Disponible pour stages.",
  keywords: ["développeur", "fullstack", "product owner", "BUT informatique", "Next.js", ".NET", "Laravel", "stage Annecy"],
  openGraph: {
    title: "Berkan Akin — Portfolio",
    description: "Développeur fullstack & fondateur de Kulpryt.",
    url: "https://berkan.kulpryt.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
