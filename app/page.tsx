'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Plus,
  Trash2,
  Smartphone,
  Send,
  RefreshCw,
  Search,
  Copy,
  Check,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Calendar,
  Sparkles
} from 'lucide-react';
import { Transaction, CashFlowStats, CategoryBudget } from '@/lib/types';

const SAMPLE_SMS_TEMPLATES = [
  {
    label: 'HDFC Swiggy (Debit)',
    text: 'Sent Rs.480.00 from HDFC Bank A/C **1234 to SWIGGY on 26-NOV-26. Ref 433129841892. Avbl bal Rs. 38,500.00.'
  },
  {
    label: 'Salary Credit',
    text: 'HDFC Bank: Rs 85,000.00 credited to a/c **1234 on 01-Nov-26 by a/c linked to VPA employer@upi. Ref 433198711002.'
  },
  {
    label: 'SBI Blinkit (Debit)',
    text: 'Your A/C XXXXX12345 debited by Rs 740.00 on 26Nov26 transfer to VPA blinkit@icici (UPI Ref no 433199887766).'
  },
  {
    label: 'ICICI Amazon (Debit)',
    text: 'Dear Customer, Acct XX123 debited with INR 2,499.00 on 26-Nov-26. Info: VPS*AMAZON. Avbl Bal INR 42,100.00.'
  },
  {
    label: 'Freelance Inflow',
    text: 'Your A/C **1234 is credited by Rs 25,000.00 from Client VPA rakesh@okhdfcbank. Ref 433112233445.'
  },
  {
    label: 'Uber Ride (Debit)',
    text: 'Kotak Bank: Rs. 385.00 debited from A/C ...123 on 26-Nov-26. UPI Ref: 433156789012. Beneficiary: UBER.'
  }
];

export default function CashFlowDashboard() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<CashFlowStats | null>(null);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'simulator' | 'iphone-setup' | 'budgets'>('dashboard');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow'>('all');

  // Simulator state
  const [simulatorSMS, setSimulatorSMS] = useState('');
  const [simulatorResult, setSimulatorResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  // Manual Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTx, setNewTx] = useState({
    amount: '',
    type: 'outflow' as 'inflow' | 'outflow',
    merchant: '',
    category: 'Food & Dining',
    notes: ''
  });

  // Copied alert for shortcuts
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [txRes, statsRes, budgetRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/stats'),
        fetch('/api/budgets')
      ]);

      const txData = await txRes.json();
      const statsData = await statsRes.json();
      const budgetData = await budgetRes.json();

      if (txData.success) setTransactions(txData.transactions);
      if (statsData.success) setStats(statsData.stats);
      if (budgetData.success) setBudgets(budgetData.budgets);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Simulator Submit
  const handleSimulate = async (smsText: string) => {
    try {
      setSimulating(true);
      setSimulatorResult(null);
      const res = await fetch('/api/sms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'cf_secret_2026'
        },
        body: JSON.stringify({
          text: smsText,
          sender: 'BANK-SMS'
        })
      });

      const data = await res.json();
      setSimulatorResult(data);
      if (data.success) {
        await fetchData();
      }
    } catch (err: any) {
      setSimulatorResult({ success: false, error: err.message });
    } finally {
      setSimulating(false);
    }
  };

  // Handle Manual Add
  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTx.amount || !newTx.merchant) return;

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTx)
      });
      const data = await res.json();
      if (data.success) {
        setShowAddModal(false);
        setNewTx({
          amount: '',
          type: 'outflow',
          merchant: '',
          category: 'Food & Dining',
          notes: ''
        });
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete
  const handleDeleteTx = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch =
      tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tx.account && tx.account.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (tx.reference && tx.reference.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = filterType === 'all' || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amt);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="h-5 w-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight flex items-center gap-2">
                CashFlow Guard
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
                  Live
                </span>
              </h1>
              <p className="text-xs text-slate-400">Automated iPhone SMS Cash Flow Control</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('budgets')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1 ${
                activeTab === 'budgets'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              Budgets & Limits
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1 ${
                activeTab === 'simulator'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              SMS Tester
            </button>
            <button
              onClick={() => setActiveTab('iphone-setup')}
              className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1 ${
                activeTab === 'iphone-setup'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 text-sky-400" />
              iPhone Setup
            </button>
          </nav>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="hidden sm:flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Manual Entry</span>
            </button>
            <button
              onClick={fetchData}
              title="Refresh Data"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition border border-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* OVERSPENDING ALERT BANNER */}
        {stats && stats.alerts.length > 0 && (
          <div className="bg-rose-950/40 border border-rose-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-rose-950/20">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-rose-200 flex items-center gap-2">
                  Expense Warning: Budget Limit Reached!
                </h3>
                <p className="text-xs text-rose-300/80">
                  {stats.alerts
                    .map(a => `${a.category} (${a.percentage}% used - ₹${a.spent} of ₹${a.limit})`)
                    .join(' • ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('budgets')}
              className="text-xs font-medium bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg transition self-start sm:self-auto"
            >
              Control Limits
            </button>
          </div>
        )}

        {/* TAB 1: DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Stat KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Inflow (Income) */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Total Inflow (Aaya)
                  </span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-white tracking-tight">
                    {stats ? formatCurrency(stats.totalInflow) : '₹0'}
                  </div>
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                    <TrendingUp className="h-3 w-3" />
                    Salary, clients & credits this month
                  </p>
                </div>
              </div>

              {/* Total Outflow (Expenses) */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Total Outflow (Gaya)
                  </span>
                  <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                    <ArrowDownRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-white tracking-tight">
                    {stats ? formatCurrency(stats.totalOutflow) : '₹0'}
                  </div>
                  <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1 font-medium">
                    <TrendingDown className="h-3 w-3" />
                    Debited across all accounts
                  </p>
                </div>
              </div>

              {/* Net Cash Flow (Savings / Deficit) */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Net Cash Flow (Bachaa)
                  </span>
                  <div
                    className={`p-2 rounded-xl ${
                      (stats?.netCashFlow || 0) >= 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div
                    className={`text-2xl font-bold tracking-tight ${
                      (stats?.netCashFlow || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {stats ? formatCurrency(stats.netCashFlow) : '₹0'}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    Savings Rate: <span className="text-slate-200">{stats?.savingsRate || 0}%</span> of income
                  </p>
                </div>
              </div>

              {/* Daily Burn Rate & Projection */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Daily Burn Rate
                  </span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <Calendar className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-white tracking-tight">
                    {stats ? formatCurrency(stats.dailyBurnRate) : '₹0'}
                    <span className="text-xs font-normal text-slate-400">/day</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">
                    Projected Month-end: <span className="text-amber-300">{stats ? formatCurrency(stats.projectedMonthlyOutflow) : '₹0'}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Split Row: Category Budget Health + Recent Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Category Spending & Guardrails (Left 1 col) */}
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2">
                    <PieChart className="h-4 w-4 text-emerald-400" />
                    <h2 className="font-semibold text-sm text-slate-200">Category Budgets (Limits)</h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('budgets')}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Edit Limits →
                  </button>
                </div>

                <div className="space-y-4">
                  {budgets.map(b => {
                    const spent = stats?.categorySpending[b.category] || 0;
                    const percent = Math.min(100, Math.round((spent / b.monthly_limit) * 100));
                    const isExceeded = spent > b.monthly_limit;
                    const isWarning = percent >= 80 && !isExceeded;

                    return (
                      <div key={b.category} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-300">{b.category}</span>
                          <span className="text-slate-400">
                            <span className={isExceeded ? 'text-rose-400 font-bold' : isWarning ? 'text-amber-400 font-bold' : 'text-slate-200'}>
                              {formatCurrency(spent)}
                            </span>{' '}
                            / {formatCurrency(b.monthly_limit)}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isExceeded
                                ? 'bg-rose-500 shadow-sm shadow-rose-500'
                                : isWarning
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Transactions Feed (Right 2 cols) */}
              <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="font-semibold text-sm text-slate-200">Transaction History</h2>
                    <p className="text-xs text-slate-400">Auto-fetched via iPhone SMS & Manual entries</p>
                  </div>

                  {/* Search and Filter */}
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search merchant, ref..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition w-36 sm:w-44"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={e => setFilterType(e.target.value as any)}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">All Types</option>
                      <option value="inflow">Inflow (Aaya)</option>
                      <option value="outflow">Outflow (Gaya)</option>
                    </select>
                  </div>
                </div>

                {/* List Items */}
                <div className="divide-y divide-slate-850 flex-1 overflow-y-auto max-h-[500px] pr-1">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-sm">
                      Koi transaction nahi mila. Naya transaction add karein ya iPhone se SMS send karein!
                    </div>
                  ) : (
                    filteredTransactions.map(tx => (
                      <div key={tx.id} className="py-3 flex items-center justify-between group hover:bg-slate-850/30 px-2 rounded-xl transition">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              tx.type === 'inflow'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {tx.type === 'inflow' ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                              {tx.merchant}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                {tx.category}
                              </span>
                              {tx.account && <span>• {tx.account}</span>}
                              {tx.reference && <span className="hidden sm:inline">• Ref: {tx.reference}</span>}
                              <span>• {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 flex-shrink-0 pl-2">
                          <span
                            className={`text-xs sm:text-sm font-bold tracking-tight ${
                              tx.type === 'inflow' ? 'text-emerald-400' : 'text-slate-100'
                            }`}
                          >
                            {tx.type === 'inflow' ? '+' : '-'} {formatCurrency(tx.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: LIVE SMS TESTER / SIMULATOR */}
        {activeTab === 'simulator' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  Live Bank SMS Tester
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Apne bank ya Google Pay ka SMS yahan paste karein ya neeche diye gaye templates par click karein. Hamara parser turant test karega.
                </p>
              </div>

              {/* Sample Quick Buttons */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-400 font-medium">Click to test sample bank SMS:</span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_SMS_TEMPLATES.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSimulatorSMS(sample.text);
                        handleSimulate(sample.text);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 transition"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input Area */}
              <div className="space-y-2">
                <textarea
                  rows={4}
                  placeholder="Paste your bank or UPI transaction SMS here..."
                  value={simulatorSMS}
                  onChange={e => setSimulatorSMS(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  disabled={!simulatorSMS.trim() || simulating}
                  onClick={() => handleSimulate(simulatorSMS)}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-600/20"
                >
                  <Send className="h-4 w-4" />
                  <span>{simulating ? 'Parsing...' : 'Parse & Record Transaction'}</span>
                </button>
              </div>

              {/* Result Preview */}
              {simulatorResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    simulatorResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    {simulatorResult.success ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-400" />
                        <span>Parsed Successfully!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-rose-400" />
                        <span>Parse Error</span>
                      </>
                    )}
                  </div>
                  <pre className="p-3 bg-slate-950 rounded-lg text-slate-300 font-mono text-[11px] overflow-x-auto">
                    {JSON.stringify(simulatorResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: IPHONE SHORTCUT SETUP GUIDE */}
        {activeTab === 'iphone-setup' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-sky-400" />
                  iPhone Shortcuts Automation Setup
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Sirf ek baar 2 minute lagakar yeh shortcut bana lijiye. Uske baad jab bhi bank ka SMS aayega, iPhone automatically background mein transaction record kar lega!
                </p>
              </div>

              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-sm font-semibold text-slate-200">
                    iPhone par &quot;Shortcuts&quot; App kholiye
                  </h3>
                </div>
                <p className="text-xs text-slate-400 pl-8">
                  Neeche <strong>Automation</strong> tab par tap karein, aur <strong>New Automation (+)</strong> ya <strong>Create Personal Automation</strong> select karein.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Trigger Select Karein: &quot;Message&quot;
                  </h3>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1.5 ml-8 text-slate-300">
                  <p>• <strong>Message Contains:</strong> <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded">debited, credited, spent, received, A/C, INR, Rs</code></p>
                  <p>• <strong>Run Immediately:</strong> Select karein (taaki bina aapse puche background mein chale).</p>
                  <p>• <strong>Notify When Run:</strong> Off (optional, silence ke liye).</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-sm font-semibold text-slate-200">
                    Action Add Karein: &quot;Get Contents of URL&quot;
                  </h3>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-3 ml-8 text-slate-300">
                  <div>
                    <label className="text-[11px] text-slate-400 uppercase font-semibold">Webhook URL</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/api/sms` : 'https://your-domain.vercel.app/api/sms'}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-emerald-400"
                      />
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/api/sms`;
                          navigator.clipboard.writeText(url);
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition flex items-center space-x-1"
                      >
                        {copiedUrl ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Method</span>
                      <p className="mt-1 font-mono text-amber-300 bg-slate-900 p-2 rounded-lg border border-slate-800">POST</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">Header (x-api-key)</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          readOnly
                          value="cf_secret_2026"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-sky-400"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('cf_secret_2026');
                            setCopiedKey(true);
                            setTimeout(() => setCopiedKey(false), 2000);
                          }}
                          className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-200 transition"
                        >
                          {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">Request Body (JSON)</span>
                    <pre className="mt-1 p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-200">
{`{
  "text": "Shortcut Input",
  "sender": "Sender"
}`}
                    </pre>
                    <p className="text-[10px] text-slate-400 mt-1">
                      * <strong>Shortcut Input</strong> ko message text se map karein.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 4: Done */}
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-xl flex items-center space-x-3 text-xs text-emerald-300">
                <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                <p>
                  Done! Ab aapke phone par aane wala har bank transaction SMS turant is cash flow reporting system mein live update ho jayega.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BUDGET & LIMITS MANAGEMENT */}
        {activeTab === 'budgets' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-emerald-400" />
                  Monthly Expense Limits (Budgeting)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Har category ka ek monthly limit set karein. Jaise hi kisi category ka 80% kharch hoga, system aapko dashboard par red alert dikha dega taaki aap be-fizool kharch rok sakein.
                </p>
              </div>

              <div className="space-y-4">
                {budgets.map((b, idx) => {
                  const spent = stats?.categorySpending[b.category] || 0;
                  const percent = Math.min(100, Math.round((spent / b.monthly_limit) * 100));

                  return (
                    <div key={b.category} className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-xs sm:text-sm text-slate-200">{b.category}</span>
                          <p className="text-[11px] text-slate-400">
                            Is mahine kharch hua: <span className="text-white font-medium">{formatCurrency(spent)}</span> ({percent}%)
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-400">Limit: ₹</span>
                          <input
                            type="number"
                            value={b.monthly_limit}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...budgets];
                              updated[idx].monthly_limit = val;
                              setBudgets(updated);
                            }}
                            className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-medium focus:outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            spent > b.monthly_limit ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-400' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={async () => {
                    await fetch('/api/budgets', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ budgets })
                    });
                    await fetchData();
                    alert('Budget limits saved successfully!');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-4 py-2 rounded-xl text-xs sm:text-sm transition shadow-lg shadow-emerald-600/20"
                >
                  Save Budget Limits
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Manual Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-sm text-slate-100">Manual Transaction Add Karein</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-500 hover:text-slate-300 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManual} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'outflow' })}
                    className={`py-2 rounded-lg text-xs font-semibold border transition ${
                      newTx.type === 'outflow'
                        ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Expense (Outflow)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'inflow' })}
                    className={`py-2 rounded-lg text-xs font-semibold border transition ${
                      newTx.type === 'inflow'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    Income (Inflow)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500"
                  value={newTx.amount}
                  onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Merchant / Recipient / Source</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy, Netflix, Client Retainer"
                  value={newTx.merchant}
                  onChange={e => setNewTx({ ...newTx, merchant: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Category</label>
                <select
                  value={newTx.category}
                  onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Food & Dining">Food & Dining</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Travel & Fuel">Travel & Fuel</option>
                  <option value="Shopping">Shopping</option>
                  <option value="Bills & Utilities">Bills & Utilities</option>
                  <option value="Entertainment & Subs">Entertainment & Subs</option>
                  <option value="Health & Medical">Health & Medical</option>
                  <option value="Investments & Savings">Investments & Savings</option>
                  <option value="Salary & Income">Salary & Income</option>
                  <option value="Other Expenses">Other Expenses</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner with team"
                  value={newTx.notes}
                  onChange={e => setNewTx({ ...newTx, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-500">
        CashFlow Guard • Built for Vercel & iPhone Shortcuts Automation
      </footer>
    </div>
  );
}
