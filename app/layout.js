import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

export const metadata = {
  title: 'Elegant Weddings — Digital Invitation Platform',
  description: 'Beautiful, elegant digital wedding invitations. Multi-tenant SaaS platform.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
