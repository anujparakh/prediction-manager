import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stock Prediction Manager',
  description: 'Manage stock predictions based on custom rules',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        elements: {
          card: 'bg-gray-900 shadow-xl',
          userButtonAvatarBox: 'w-10 h-10',
          userButtonPopoverCard: 'bg-gray-900',
          userButtonPopoverActionButton: 'hover:bg-gray-800',
        },
      }}
    >
      <html lang="en" className="dark">
        <body className="antialiased">
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
