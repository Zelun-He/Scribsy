import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme';

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scribsy - AI-Powered Clinical Note Generator",
  description: "Transform your clinical conversations into structured SOAP notes with AI-powered transcription and summarization.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}