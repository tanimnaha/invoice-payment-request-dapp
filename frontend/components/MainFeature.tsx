'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  createInvoice,
  payInvoice,
  getFreelancerInvoices,
  getPayerInvoices,
  InvoiceData
} from '../lib/contract';
import {
  PlusCircle,
  FileText,
  Send,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  User,
  ExternalLink,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';

interface MainFeatureProps {
  walletAddress: string | null;
}

export default function MainFeature({ walletAddress }: MainFeatureProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'create' | 'freelancer' | 'payer'>('create');
  
  // Forms & State
  const [invoiceId, setInvoiceId] = useState<string>('');
  const [payerAddress, setPayerAddress] = useState<string>('');
  const [amountXlm, setAmountXlm] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // UI status states
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Invoices list data
  const [createdInvoices, setCreatedInvoices] = useState<InvoiceData[]>([]);
  const [assignedInvoices, setAssignedInvoices] = useState<InvoiceData[]>([]);

  // Format date helper
  const formatDate = (seconds: bigint) => {
    return new Date(Number(seconds) * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Convert stroops to XLM
  const stroopsToXlm = (stroops: bigint) => {
    return Number(stroops) / 10_000_000;
  };

  // Truncate address helper
  const truncate = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  // Handle clipboard copy
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Determine dynamic invoice status
  const getDynamicStatus = (invoice: InvoiceData): 'Paid' | 'Overdue' | 'Pending' => {
    if (invoice.status === 'Paid') return 'Paid';
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (nowSeconds > Number(invoice.due_date)) {
      return 'Overdue';
    }
    return 'Pending';
  };

  // Fetch Invoices
  const fetchInvoices = useCallback(async (isSilent = false) => {
    if (!walletAddress) return;
    
    if (!isSilent) setRefreshing(true);
    setErrorMsg(null);
    
    try {
      const [freelancerData, payerData] = await Promise.all([
        getFreelancerInvoices(walletAddress),
        getPayerInvoices(walletAddress),
      ]);
      
      // Sort newest first based on due_date or ID
      setCreatedInvoices(freelancerData.reverse());
      setAssignedInvoices(payerData.reverse());
    } catch (err: any) {
      console.error('Error fetching invoices:', err);
      // Suppress showing error when page initially loads if it's due to unconfigured contract
      if (!err.message.includes('NEXT_PUBLIC_CONTRACT_ID')) {
        setErrorMsg('Failed to fetch on-chain invoices. Make sure contract is deployed.');
      }
    } finally {
      setRefreshing(false);
    }
  }, [walletAddress]);

  // Load lists on wallet change
  useEffect(() => {
    if (walletAddress) {
      fetchInvoices();
    } else {
      setCreatedInvoices([]);
      setAssignedInvoices([]);
    }
  }, [walletAddress, fetchInvoices]);

  // Create Invoice Submission
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      setErrorMsg('Please connect your Freighter wallet first.');
      return;
    }

    if (!invoiceId.trim()) return setErrorMsg('Invoice ID is required.');
    if (!payerAddress.trim()) return setErrorMsg('Payer Address is required.');
    if (!amountXlm || parseFloat(amountXlm) <= 0) return setErrorMsg('Please enter a valid amount.');
    if (!dueDate) return setErrorMsg('Due date is required.');
    if (!description.trim()) return setErrorMsg('Description is required.');

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const dueTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
    const nowTimestamp = Math.floor(Date.now() / 1000);

    if (dueTimestamp <= nowTimestamp) {
      setErrorMsg('Due date must be in the future.');
      setLoading(false);
      return;
    }

    try {
      await createInvoice(
        walletAddress,
        invoiceId.trim(),
        payerAddress.trim(),
        parseFloat(amountXlm),
        dueTimestamp,
        description.trim()
      );

      setSuccessMsg(`Invoice "${invoiceId}" successfully created on-chain!`);
      // Clear fields
      setInvoiceId('');
      setPayerAddress('');
      setAmountXlm('');
      setDueDate('');
      setDescription('');
      
      // Reload and switch tab
      await fetchInvoices(true);
      setActiveTab('freelancer');
    } catch (err: any) {
      console.error('Invoice creation failed:', err);
      setErrorMsg(err.message || 'On-chain transaction execution failed. Check console.');
    } finally {
      setLoading(false);
    }
  };

  // Pay Invoice Trigger
  const handlePayInvoice = async (id: string) => {
    if (!walletAddress) return;
    
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await payInvoice(walletAddress, id);
      setSuccessMsg(`Invoice "${id}" successfully settled on-chain!`);
      await fetchInvoices(true);
      setActiveTab('payer');
    } catch (err: any) {
      console.error('Invoice payment failed:', err);
      setErrorMsg(err.message || 'On-chain payment execution failed. Ensure you have enough XLM.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-6">
      
      {/* Messages */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-300 text-sm">
          <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
          <div className="flex-1 font-medium">{successMsg}</div>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-rose-300 text-sm">
          <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{errorMsg}</div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-white/10 pb-1">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all duration-300 cursor-pointer ${
              activeTab === 'create'
                ? 'border-b-2 border-blue-500 text-white bg-white/5'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <PlusCircle className="h-4 w-4" /> Create Invoice
          </button>
          
          <button
            onClick={() => setActiveTab('freelancer')}
            disabled={!walletAddress}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              activeTab === 'freelancer'
                ? 'border-b-2 border-blue-500 text-white bg-white/5'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <FileText className="h-4 w-4" /> Created by Me ({createdInvoices.length})
          </button>
          
          <button
            onClick={() => setActiveTab('payer')}
            disabled={!walletAddress}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all duration-300 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
              activeTab === 'payer'
                ? 'border-b-2 border-blue-500 text-white bg-white/5'
                : 'text-white/50 hover:text-white/80'
            }`}
          >
            <CreditCard className="h-4 w-4" /> Assigned to Me ({assignedInvoices.length})
          </button>
        </div>

        {walletAddress && (
          <button
            onClick={() => fetchInvoices()}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-white/70 active:scale-95 transition-all cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        )}
      </div>

      {/* Tabs Content */}
      <div className="min-h-[400px]">
        {!walletAddress ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/5 bg-white/2 backdrop-blur-md">
            <User className="h-12 w-12 text-white/20 mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">Freighter Wallet Required</h3>
            <p className="text-sm text-white/50 max-w-sm">
              Please connect your Freighter browser wallet above to view your invoices, make payments, or issue payment requests.
            </p>
          </div>
        ) : (
          <>
            {/* 1. Create Invoice Form */}
            {activeTab === 'create' && (
              <div className="p-6 rounded-2xl border border-white/10 bg-black/35 backdrop-blur-xl">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white">Create On-Chain Payment Request</h3>
                  <p className="text-xs text-white/50">Issue a tamper-proof invoice stored securely on the Soroban ledger.</p>
                </div>
                
                <form onSubmit={handleCreateInvoice} className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Invoice ID */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-white/70 uppercase">Invoice ID</label>
                      <input
                        type="text"
                        value={invoiceId}
                        onChange={(e) => setInvoiceId(e.target.value)}
                        placeholder="e.g. INV-2026-001"
                        disabled={loading}
                        className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium text-sm placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all duration-300"
                      />
                    </div>

                    {/* Amount */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-white/70 uppercase">Amount (XLM)</label>
                      <input
                        type="number"
                        step="0.0000001"
                        value={amountXlm}
                        onChange={(e) => setAmountXlm(e.target.value)}
                        placeholder="e.g. 150.50"
                        disabled={loading}
                        className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-medium text-sm placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all duration-300"
                      />
                    </div>

                    {/* Payer Address */}
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-white/70 uppercase">Payer Public Key (Stellar G... Address)</label>
                      <input
                        type="text"
                        value={payerAddress}
                        onChange={(e) => setPayerAddress(e.target.value)}
                        placeholder="e.g. GC34...ABCD"
                        disabled={loading}
                        className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white font-mono text-sm placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all duration-300"
                      />
                    </div>

                    {/* Due Date */}
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-white/70 uppercase">Due Date & Time</label>
                      <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        disabled={loading}
                        className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm focus:outline-none focus:border-blue-500 transition-all duration-300"
                      />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1.5 md:col-span-2">
                      <label className="text-xs font-semibold text-white/70 uppercase">Description / Scope of Work</label>
                      <textarea
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe services rendered, delivery terms, or milestones..."
                        disabled={loading}
                        className="px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-blue-500 transition-all duration-300 resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 mt-2 px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wide active:scale-98 transition-all duration-300 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <RefreshCw className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {loading ? 'Executing On-Chain Transactions...' : 'Publish Invoice & Request Payment'}
                  </button>
                </form>
              </div>
            )}

            {/* 2. Created Invoices (Freelancer View) */}
            {activeTab === 'freelancer' && (
              <div className="flex flex-col gap-4">
                {createdInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/5 bg-white/2">
                    <FileText className="h-10 w-10 text-white/25 mb-3" />
                    <p className="text-sm font-semibold text-white">No Invoices Sent Yet</p>
                    <p className="text-xs text-white/40 mt-0.5">Use the "Create Invoice" tab to send your first payment request.</p>
                  </div>
                ) : (
                  createdInvoices.map((invoice) => {
                    const status = getDynamicStatus(invoice);
                    return (
                      <div
                        key={invoice.id}
                        className="p-5 rounded-2xl border border-white/10 bg-black/30 hover:border-white/20 transition-all duration-300 flex flex-col md:flex-row justify-between gap-4"
                      >
                        <div className="flex-1 flex flex-col gap-2.5">
                          {/* Top Header Row */}
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-bold text-white font-mono">{invoice.id}</span>
                            
                            {/* Dynamic Badges */}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              status === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : status === 'Overdue'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {status === 'Paid' && <CheckCircle className="h-3 w-3" />}
                              {status === 'Overdue' && <AlertTriangle className="h-3 w-3" />}
                              {status === 'Pending' && <Clock className="h-3 w-3" />}
                              {status}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-white/80">{invoice.description}</p>

                          {/* Address details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/60">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white/40">TO PAYER:</span>
                              <span className="font-mono text-white/80">{truncate(invoice.payer)}</span>
                              <button
                                onClick={() => handleCopy(invoice.payer, `payer-${invoice.id}`)}
                                className="text-white/40 hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedId === `payer-${invoice.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-1.5 sm:justify-end">
                              <Clock className="h-3 w-3 text-white/40" />
                              <span className="font-semibold text-white/40">DUE DATE:</span>
                              <span className="text-white/80">{formatDate(invoice.due_date)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Visual Right Column: Amount */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-5 min-w-[140px] gap-2">
                          <div className="flex flex-col md:items-end">
                            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Invoice Amount</span>
                            <span className="text-xl font-extrabold text-blue-400">{stroopsToXlm(invoice.amount).toLocaleString()} XLM</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 3. Assigned Invoices (Payer View) */}
            {activeTab === 'payer' && (
              <div className="flex flex-col gap-4">
                {assignedInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/5 bg-white/2">
                    <CreditCard className="h-10 w-10 text-white/25 mb-3" />
                    <p className="text-sm font-semibold text-white">No Invoices Received</p>
                    <p className="text-xs text-white/40 mt-0.5">When freelancers issue payment requests to your public key, they appear here.</p>
                  </div>
                ) : (
                  assignedInvoices.map((invoice) => {
                    const status = getDynamicStatus(invoice);
                    return (
                      <div
                        key={invoice.id}
                        className="p-5 rounded-2xl border border-white/10 bg-black/30 hover:border-white/20 transition-all duration-300 flex flex-col md:flex-row justify-between gap-4"
                      >
                        <div className="flex-1 flex flex-col gap-2.5">
                          {/* Top Header Row */}
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-bold text-white font-mono">{invoice.id}</span>
                            
                            {/* Dynamic Badges */}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              status === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : status === 'Overdue'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}>
                              {status === 'Paid' && <CheckCircle className="h-3 w-3" />}
                              {status === 'Overdue' && <AlertTriangle className="h-3 w-3" />}
                              {status === 'Pending' && <Clock className="h-3 w-3" />}
                              {status}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-white/80">{invoice.description}</p>

                          {/* Address details */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-white/60">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-white/40">FROM CREATOR:</span>
                              <span className="font-mono text-white/80">{truncate(invoice.creator)}</span>
                              <button
                                onClick={() => handleCopy(invoice.creator, `creator-${invoice.id}`)}
                                className="text-white/40 hover:text-white transition-colors cursor-pointer"
                              >
                                {copiedId === `creator-${invoice.id}` ? (
                                  <Check className="h-3 w-3 text-emerald-400" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </button>
                            </div>
                            
                            <div className="flex items-center gap-1.5 sm:justify-end">
                              <Clock className="h-3 w-3 text-white/40" />
                              <span className="font-semibold text-white/40">DUE DATE:</span>
                              <span className="text-white/80">{formatDate(invoice.due_date)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Visual Right Column: Pay / Amount Actions */}
                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 md:border-l border-white/5 pt-3 md:pt-0 md:pl-5 min-w-[170px] gap-3">
                          <div className="flex flex-col md:items-end">
                            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Amount Due</span>
                            <span className="text-xl font-extrabold text-blue-400">{stroopsToXlm(invoice.amount).toLocaleString()} XLM</span>
                          </div>

                          {/* Pay Button */}
                          {status !== 'Paid' ? (
                            <button
                              onClick={() => handlePayInvoice(invoice.id)}
                              disabled={loading}
                              className="flex items-center gap-1 px-4 py-2 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/10 active:scale-95 transition-all duration-200 cursor-pointer disabled:opacity-50"
                            >
                              {loading ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <CreditCard className="h-3.5 w-3.5" />
                              )}
                              Pay Invoice
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-400/70 flex items-center gap-1 font-semibold">
                              <Check className="h-4.5 w-4.5" /> Settled On-Chain
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
