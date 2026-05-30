import type { Metadata } from 'next';
import { Outfit, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
});

const jetbrainsMono = JetBrains_Mono({
  variable: '--font-jetbrains-mono',
  subsets: ['latin'],
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'Stellar SafePay | Decentralized Invoice & Payment Request Portal',
  description: 'A tamper-proof, on-chain invoicing and payment request protocol built on Soroban smart contracts and the Stellar Testnet.',
  keywords: 'Stellar, Soroban, Smart Contracts, Invoicing, Web3 Payments, Freighter Wallet, Freelance Payments, blockchain, XLM',
  authors: [{ name: 'Stellar SafePay Dev Team' }],
  viewport: 'width=device-width, initial-scale=1.0',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${jetbrainsMono.variable} dark antialiased scroll-smooth`}>
      <body className="flex flex-col min-h-screen">
        {children}
      </body>
    </html>
  );
}
