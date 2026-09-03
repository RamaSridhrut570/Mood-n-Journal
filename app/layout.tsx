import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'Reflective Journal',
  description: 'A secure, user-authenticated journaling app with AI-powered reflections and summaries using Gemini and Firebase.',
  openGraph: {
    title: 'Reflective Journal',
    description: 'A secure, user-authenticated journaling app with AI-powered reflections and summaries using Gemini and Firebase.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Reflective Journal',
    description: 'A secure, user-authenticated journaling app with AI-powered reflections and summaries using Gemini and Firebase.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
