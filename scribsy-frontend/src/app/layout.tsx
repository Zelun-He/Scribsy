import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import { AuthProvider } from '@/lib/auth';
import { ThemeProvider } from '@/lib/theme-provider';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarFrame } from '@/components/layout/sidebar-frame';
import { ToastProvider } from '@/lib/toast';
import { CommandPalette } from '@/lib/command-palette';
import { Fab } from '@/components/ui/fab';

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scribsy - AI-Powered Clinical Note Generator",
  description: "Transform your clinical conversations into structured SOAP notes with AI-powered transcription and summarization.",
};

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
    >
      <AuthProvider>
        <ToastProvider>
          <SidebarProvider>
            <SidebarFrame>
              {children}
              <CommandPalette />
              <Fab />
            </SidebarFrame>
          </SidebarProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} antialiased`}>
        <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; connect-src *;" />
        {clerkPublishableKey ? (
          <ClerkProvider publishableKey={clerkPublishableKey}>
            <AppShell>{children}</AppShell>
          </ClerkProvider>
        ) : (
          <AppShell>{children}</AppShell>
        )}
      </body>
    </html>
  );
}
