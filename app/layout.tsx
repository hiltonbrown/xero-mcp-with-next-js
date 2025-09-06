// Root layout for Next.js app directory

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Xero MCP Integration',
  description: 'Xero accounting integration with MCP server',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}