'use client';

import React, { useState, useEffect } from 'react';
import { getFreighterPublicKey, fundWithFriendbot, checkAccountExists } from '../lib/stellar';
import { Wallet, Check, AlertCircle, RefreshCw, PlusCircle, Coins } from 'lucide-react';

interface WalletConnectProps {
  onAddressChange: (address: string | null) => void;
  currentAddress: string | null;
}

export default function WalletConnect({ onAddressChange, currentAddress }: WalletConnectProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [funding, setFunding] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [accountExists, setAccountExists] = useState<boolean>(true);
  const [hasCheckedAccount, setHasCheckedAccount] = useState<boolean>(false);

  // Check if Freighter account exists on Testnet Horizon
  useEffect(() => {
    if (currentAddress) {
      checkAccountStatus(currentAddress);
    } else {
      setHasCheckedAccount(false);
      setAccountExists(true);
    }
  }, [currentAddress]);

  const checkAccountStatus = async (address: string) => {
    try {
      const exists = await checkAccountExists(address);
      setAccountExists(exists);
      setHasCheckedAccount(true);
    } catch (err) {
      console.error('Failed to check account existence:', err);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const pubKey = await getFreighterPublicKey();
      onAddressChange(pubKey);
      await checkAccountStatus(pubKey);
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || 'Failed to connect to Freighter. Make sure the extension is installed and unlocked.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    onAddressChange(null);
    setError(null);
    setHasCheckedAccount(false);
  };

  const handleFund = async () => {
    if (!currentAddress) return;
    setFunding(true);
    setError(null);
    try {
      await fundWithFriendbot(currentAddress);
      setAccountExists(true);
      await checkAccountStatus(currentAddress);
    } catch (err: any) {
      console.error('Friendbot funding error:', err);
      setError(err.message || 'Failed to request testnet XLM. Please try again.');
    } finally {
      setFunding(false);
    }
  };

  const truncateAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex flex-col gap-3 w-full max-w-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl transition-all duration-300">
        
        {/* Connection Status Indicator */}
        <div className="flex items-center gap-3">
          <div className={`relative flex h-3 w-3`}>
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${currentAddress ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${currentAddress ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
          </div>
          
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-wider text-white/50">FREIGHTER CONNECTION</span>
            <span className="text-sm font-bold text-white">
              {currentAddress ? 'Wallet Connected' : 'Wallet Disconnected'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {currentAddress ? (
            <>
              {/* Account Address Banner */}
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-xs text-white/80 font-mono">
                <Wallet className="h-3.5 w-3.5 text-blue-400" />
                {truncateAddress(currentAddress)}
              </div>

              {/* Disconnect Button */}
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-300 cursor-pointer"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 active:scale-95 transition-all duration-300 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Wallet className="h-4 w-4" />
              )}
              {loading ? 'Connecting...' : 'Connect Freighter'}
            </button>
          )}
        </div>
      </div>

      {/* Account Info and Friendbot funding banner */}
      {currentAddress && (
        <div className="flex flex-col gap-2">
          {/* If the account is unfunded (404 on Horizon) */}
          {!accountExists && hasCheckedAccount && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm text-amber-200">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="font-semibold">New Testnet Account Detected</p>
                  <p className="text-xs text-amber-200/70">Your public key must be activated on the Testnet ledger before making transactions.</p>
                </div>
              </div>
              <button
                onClick={handleFund}
                disabled={funding}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg bg-amber-500 hover:bg-amber-400 text-black shadow-md shadow-amber-500/10 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {funding ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Coins className="h-3.5 w-3.5" />
                )}
                {funding ? 'Funding...' : 'Get Testnet XLM'}
              </button>
            </div>
          )}

          {/* Quick Activation Action for Funded Accounts to get more funds if needed */}
          {accountExists && hasCheckedAccount && (
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/2 text-xs text-white/50">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check className="h-4 w-4" /> Active on Testnet Ledger
              </span>
              <button
                onClick={handleFund}
                disabled={funding}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/15 text-white/70 hover:text-white hover:bg-white/5 transition-all duration-200 cursor-pointer disabled:opacity-50"
              >
                {funding ? (
                  <RefreshCw className="h-3 w-3 animate-spin" />
                ) : (
                  <PlusCircle className="h-3 w-3" />
                )}
                {funding ? 'Funding...' : 'Request 10k XLM'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Error message card */}
      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-200 text-sm">
          <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Wallet Alert:</span> {error}
          </div>
        </div>
      )}
    </div>
  );
}
