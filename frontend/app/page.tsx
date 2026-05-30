'use client';

import React, { useState } from 'react';
import WalletConnect from '../components/WalletConnect';
import MainFeature from '../components/MainFeature';
import { CreditCard, Shield, Zap, Sparkles, HelpCircle } from 'lucide-react';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  return (
    <div className="flex flex-col min-h-screen">
      
      {/* 1. Header Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-black/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 p-0.5 shadow-lg shadow-blue-500/20">
              <div className="h-full w-full rounded-[10px] bg-gray-950 flex items-center justify-center">
                <CreditCard className="h-4.5 w-4.5 text-blue-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-white leading-tight">SafePay</span>
              <span className="text-[10px] font-bold text-blue-400/80 tracking-widest uppercase">Stellar Ledger</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-white/60">
              <Sparkles className="h-3 w-3 text-emerald-400" /> Soroban Testnet
            </span>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 flex flex-col gap-8">
        <section className="text-center py-6 flex flex-col items-center gap-3">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white bg-clip-text bg-gradient-to-r from-white via-white to-white/60 max-w-2xl leading-tight">
            Decentralized Invoicing <br className="hidden sm:inline" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Settled Instantly On-Chain
            </span>
          </h1>
          <p className="text-sm md:text-base text-white/50 max-w-lg leading-relaxed">
            Create, verify, and settle freelancer invoices directly on the Stellar Network. 
            Powered by secure, atomic Soroban smart contracts.
          </p>
        </section>

        {/* 3. Wallet Connection Row */}
        <section className="w-full">
          <WalletConnect 
            currentAddress={walletAddress} 
            onAddressChange={setWalletAddress} 
          />
        </section>

        {/* 4. Main App Interaction Panel */}
        <section className="w-full py-4">
          <MainFeature walletAddress={walletAddress} />
        </section>

        {/* 5. Informative Value Props */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
          <div className="p-5 rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm flex gap-4">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">On-Chain Ledger Security</h4>
              <p className="text-xs text-white/50 leading-relaxed">
                All invoice metadata, amounts, and statuses are permanently sealed on the Stellar blockchain, ensuring absolute trust.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm flex gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Atomic Soroban Settlement</h4>
              <p className="text-xs text-white/50 leading-relaxed">
                Client payments are transferred natively and atomically. Mark invoices as paid instantly, with zero human intervention.
              </p>
            </div>
          </div>

          <div className="p-5 rounded-2xl border border-white/5 bg-white/2 backdrop-blur-sm flex gap-4">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0 text-purple-400">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Freight Integration</h4>
              <p className="text-xs text-white/50 leading-relaxed">
                Seamless signing powered by Freighter Wallet extension. Authenticate and sign securely without sharing private keys.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Footer */}
      <footer className="border-t border-white/5 bg-black/60 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center">
          <div className="text-xs text-white/30 font-medium">
            &copy; {new Date().getFullYear()} Stellar SafePay. All rights reserved on-chain.
          </div>
          <div className="flex gap-4 text-xs font-semibold text-white/40">
            <span className="hover:text-white/60 transition-colors">Soroban SDK 21.0.0</span>
            <span className="text-white/10">&bull;</span>
            <span className="hover:text-white/60 transition-colors">Testnet Sandbox</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
