'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  CheckCircle2,
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
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { Transaction, CashFlowStats, CategoryBudget } from '@/lib/types';

const SAMPLE_SMS_TEMPLATES = [
  {
    label: 'HDFC Swiggy (Debit)',
    text: 'Sent Rs.480.00 from HDFC Bank A/C **1234 to SWIGGY on 26-NOV-26. Ref 433129841892. Avbl bal Rs. 38,500.00.'
  },
  {
    label: 'Salary Credit (Inflow)',
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
    label: 'Freelance Payout (Inflow)',
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
  const [activeTab, setActiveTab] = useState<'flow' | 'budgets' | 'simulator' | 'iphone-setup'>('flow');

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
        body: JSON.stringify({ text: smsText, sender: 'BANK-SMS' })
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

  // Flow percentages
  const inflow = stats?.totalInflow || 0;
  const outflow = stats?.totalOutflow || 0;
  const net = stats?.netCashFlow || 0;
  const expensePercentage = inflow > 0 ? Math.min(100, Math.round((outflow / inflow) * 100)) : 100;
  const savingsPercentage = 100 - expensePercentage;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Clean Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-base tracking-tight">CashFlow Guard</h1>
                <span className="text-[10px] font-medium bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500">Aapki payments aur kharch ka simple flow</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center space-x-2">
            <nav className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-medium">
              <button
                onClick={() => setActiveTab('flow')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeTab === 'flow'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cash Flow
              </button>
              <button
                onClick={() => setActiveTab('budgets')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'budgets'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
                Kharch Control
              </button>
              <button
                onClick={() => setActiveTab('simulator')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'simulator'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                SMS Tester
              </button>
              <button
                onClick={() => setActiveTab('iphone-setup')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1 ${
                  activeTab === 'iphone-setup'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5 text-sky-600" />
                iPhone Setup
              </button>
            </nav>

            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Naya Record</span>
            </button>

            <button
              onClick={fetchData}
              title="Refresh Data"
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* OVERSPENDING WARNING BANNER */}
        {stats && stats.alerts.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center space-x-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600 flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-rose-900">
                  Dhyan dein! Kuch cheezon mein monthly limit cross ho rahi hai:
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  {stats.alerts
                    .map(a => `${a.category} (${a.percentage}% used — ₹${a.spent} of ₹${a.limit})`)
                    .join(' • ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('budgets')}
              className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl transition self-start sm:self-auto shadow-xs"
            >
              Limits Set Karein
            </button>
          </div>
        )}

        {/* VIEW 1: PROPER CASH FLOW UI */}
        {activeTab === 'flow' && (
          <div className="space-y-6">
            {/* 1. VISUAL FLOW EQUATION CARD */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>Cash Flow Summary (Paisa Aaya vs Gaya)</span>
                  </h2>
                  <p className="text-xs text-slate-500">
                    Aapke total income se expenses minus karke net savings ka live balance
                  </p>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1 font-medium bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
                  <Calendar className="h-3.5 w-3.5" />
                  Is Mahine Ka Hisaab
                </div>
              </div>

              {/* FLOW STEPPERS (Aaya ➔ Gaya ➔ Bacha) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                {/* Step 1: Inflow */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                      1. Kul Aaya (Inflow)
                    </span>
                    <div className="h-7 w-7 rounded-lg bg-emerald-200/60 text-emerald-800 flex items-center justify-center">
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-emerald-950">
                    {stats ? formatCurrency(stats.totalInflow) : '₹0'}
                  </div>
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Salary, clients & bank credits
                  </p>
                </div>

                {/* Step 2: Outflow */}
                <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-800 uppercase tracking-wide">
                      2. Kul Gaya (Outflow)
                    </span>
                    <div className="h-7 w-7 rounded-lg bg-rose-200/60 text-rose-800 flex items-center justify-center">
                      <ArrowDownRight className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-extrabold text-rose-950">
                    {stats ? formatCurrency(stats.totalOutflow) : '₹0'}
                  </div>
                  <p className="text-[11px] text-rose-700 mt-1">
                    Kharch hua ({expensePercentage}% of income)
                  </p>
                </div>

                {/* Step 3: Net Savings */}
                <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                      3. Net Bacha (Cash Flow)
                    </span>
                    <div className="h-7 w-7 rounded-lg bg-blue-200/60 text-blue-800 flex items-center justify-center">
                      <Wallet className="h-4 w-4" />
                    </div>
                  </div>
                  <div className={`mt-2 text-2xl font-extrabold ${net >= 0 ? 'text-blue-950' : 'text-rose-950'}`}>
                    {stats ? formatCurrency(stats.netCashFlow) : '₹0'}
                  </div>
                  <p className="text-[11px] text-blue-700 mt-1 font-medium">
                    {savingsPercentage}% Income safe bachi hui hai
                  </p>
                </div>
              </div>

              {/* FLOW PROPORTION BAR */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-rose-700">Kharch: {expensePercentage}% ({formatCurrency(outflow)})</span>
                  <span className="text-emerald-700">Bachat: {savingsPercentage}% ({formatCurrency(net)})</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200">
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${expensePercentage}%` }}
                    title={`Kharch: ${expensePercentage}%`}
                  />
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${Math.max(0, savingsPercentage)}%` }}
                    title={`Bacha: ${savingsPercentage}%`}
                  />
                </div>
              </div>
            </div>

            {/* 2. TWO-COLUMN SPLIT: BUDGET LIMITS (LEFT) vs TRANSACTIONS FEED (RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Category Budgets (Kharch Rokne ke Guardrails) */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <PieChart className="h-4 w-4 text-emerald-600" />
                    <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Category Budgets
                    </h2>
                  </div>
                  <button
                    onClick={() => setActiveTab('budgets')}
                    className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                  >
                    Edit Limits →
                  </button>
                </div>

                <div className="space-y-3.5">
                  {budgets.map(b => {
                    const spent = stats?.categorySpending[b.category] || 0;
                    const percent = Math.min(100, Math.round((spent / b.monthly_limit) * 100));
                    const isExceeded = spent > b.monthly_limit;
                    const isWarning = percent >= 80 && !isExceeded;

                    return (
                      <div key={b.category} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-slate-700">{b.category}</span>
                          <span className="text-slate-500 text-[11px]">
                            <strong className={isExceeded ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-900'}>
                              {formatCurrency(spent)}
                            </strong>{' '}
                            / {formatCurrency(b.monthly_limit)}
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isExceeded
                                ? 'bg-rose-500'
                                : isWarning
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Rozana Run Rate:</span>
                  <span className="font-bold text-slate-800">
                    {stats ? formatCurrency(stats.dailyBurnRate) : '₹0'} / din
                  </span>
                </div>
              </div>

              {/* Right Column: Transactions Feed */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                      Transactions History
                    </h2>
                    <p className="text-xs text-slate-500">Aapke bank aur UPI se aayi payments</p>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-32 sm:w-40"
                      />
                    </div>
                    <select
                      value={filterType}
                      onChange={e => setFilterType(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="all">Sabhi</option>
                      <option value="inflow">Inflow (Aaya)</option>
                      <option value="outflow">Outflow (Gaya)</option>
                    </select>
                  </div>
                </div>

                {/* List Items */}
                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[460px] pr-1">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">
                      Koi transaction nahi mila.
                    </div>
                  ) : (
                    filteredTransactions.map(tx => (
                      <div
                        key={tx.id}
                        className="py-3 flex items-center justify-between hover:bg-slate-50/80 px-2 rounded-xl transition"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              tx.type === 'inflow'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.type === 'inflow' ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                              {tx.merchant}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                                {tx.category}
                              </span>
                              {tx.account && <span>• {tx.account}</span>}
                              <span>• {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-3 flex-shrink-0 pl-2">
                          <span
                            className={`text-xs sm:text-sm font-bold tracking-tight ${
                              tx.type === 'inflow' ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            {tx.type === 'inflow' ? '+' : '-'} {formatCurrency(tx.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            className="text-slate-300 hover:text-rose-600 p-1 rounded transition"
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

        {/* VIEW 2: BUDGET & EXPENSE CONTROL */}
        {activeTab === 'budgets' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-emerald-600" />
                  Monthly Expense Limits (Kharch Rokne Ke Guardrails)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Har category ka ek monthly budget set karein. Jab bhi aap kisi category ke 80% kharch par pahuchenge, system alert kar dega taaki aap faaltu kharch rok sakein.
                </p>
              </div>

              <div className="space-y-3.5">
                {budgets.map((b, idx) => {
                  const spent = stats?.categorySpending[b.category] || 0;
                  const percent = Math.min(100, Math.round((spent / b.monthly_limit) * 100));

                  return (
                    <div key={b.category} className="bg-slate-50/70 border border-slate-200 p-4 rounded-xl space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="font-semibold text-xs sm:text-sm text-slate-900">{b.category}</span>
                          <p className="text-[11px] text-slate-500">
                            Kharch hua: <span className="font-bold text-slate-800">{formatCurrency(spent)}</span> ({percent}%)
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-slate-500 font-medium">Monthly Limit: ₹</span>
                          <input
                            type="number"
                            value={b.monthly_limit}
                            onChange={e => {
                              const val = parseFloat(e.target.value) || 0;
                              const updated = [...budgets];
                              updated[idx].monthly_limit = val;
                              setBudgets(updated);
                            }}
                            className="w-28 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-xs"
                          />
                        </div>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            spent > b.monthly_limit ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
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
                    alert('Budget limits save ho gayi hain!');
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-xs transition"
                >
                  Save Budget Limits
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: LIVE SMS TESTER */}
        {activeTab === 'simulator' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Bank SMS Parser Tester
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Yahan kisi bhi bank SMS ko test karein taaki aap dekh sakein parser kitni accuracy se amount, category aur merchant pehchanta hai.
                </p>
              </div>

              {/* Sample Quick Buttons */}
              <div className="space-y-1.5">
                <span className="text-xs text-slate-500 font-medium">Test templates par click karein:</span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_SMS_TEMPLATES.map((sample, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSimulatorSMS(sample.text);
                        handleSimulate(sample.text);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[11px] text-slate-700 font-medium border border-slate-200 transition"
                    >
                      {sample.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div className="space-y-2">
                <textarea
                  rows={4}
                  placeholder="Apna bank transaction SMS yahan paste karein..."
                  value={simulatorSMS}
                  onChange={e => setSimulatorSMS(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
                />
                <button
                  disabled={!simulatorSMS.trim() || simulating}
                  onClick={() => handleSimulate(simulatorSMS)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 transition shadow-xs"
                >
                  <Send className="h-4 w-4" />
                  <span>{simulating ? 'Analyzing...' : 'Parse & Add to Cash Flow'}</span>
                </button>
              </div>

              {/* Result Preview */}
              {simulatorResult && (
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    simulatorResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="font-semibold flex items-center gap-1.5">
                    {simulatorResult.success ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span>Successfully Parsed & Recorded!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-4 w-4 text-rose-600" />
                        <span>Parse Error</span>
                      </>
                    )}
                  </div>
                  <pre className="p-3 bg-white rounded-lg text-slate-700 font-mono text-[11px] border border-slate-200 overflow-x-auto">
                    {JSON.stringify(simulatorResult, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* VIEW 4: IPHONE SETUP GUIDE */}
        {activeTab === 'iphone-setup' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-sky-600" />
                  iPhone Shortcut Automation (2 Minute Setup)
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Apne iPhone par ek baar yeh shortcut bana lijiye. Uske baad bina kisi app ko khole, background mein har bank transaction yahan automatically record hota rahega.
                </p>
              </div>

              {/* Step 1 */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                    1
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    iPhone par &quot;Shortcuts&quot; App kholein
                  </h3>
                </div>
                <p className="text-xs text-slate-600 pl-7">
                  Neeche <strong>Automation</strong> tab par tap karein aur <strong>New Automation (+)</strong> select karein.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                    2
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Trigger: &quot;Message&quot; select karein
                  </h3>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1 ml-7 text-slate-700">
                  <p>• <strong>Message Contains:</strong> <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-emerald-700 font-semibold">debited, credited, spent, received, A/C, INR, Rs</code></p>
                  <p>• <strong>Run Immediately:</strong> Select karein (taaki bina permission maange background mein chale).</p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="h-5 w-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">
                    3
                  </span>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                    Action: &quot;Get Contents of URL&quot; add karein
                  </h3>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3 ml-7">
                  <div>
                    <label className="text-[11px] text-slate-500 uppercase font-semibold">Webhook URL</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        readOnly
                        value={typeof window !== 'undefined' ? `${window.location.origin}/api/sms` : 'https://your-domain.vercel.app/api/sms'}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-emerald-700 font-semibold"
                      />
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/api/sms`;
                          navigator.clipboard.writeText(url);
                          setCopiedUrl(true);
                          setTimeout(() => setCopiedUrl(false), 2000);
                        }}
                        className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 transition flex items-center space-x-1"
                      >
                        {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase font-semibold">Method</span>
                      <p className="mt-1 font-mono text-slate-900 bg-white p-2 rounded-lg border border-slate-200 font-bold">POST</p>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 uppercase font-semibold">Header (x-api-key)</span>
                      <div className="flex items-center space-x-2 mt-1">
                        <input
                          readOnly
                          value="cf_secret_2026"
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-slate-800 font-bold"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('cf_secret_2026');
                            setCopiedKey(true);
                            setTimeout(() => setCopiedKey(false), 2000);
                          }}
                          className="px-2.5 py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-700 transition"
                        >
                          {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 uppercase font-semibold">Request Body (JSON)</span>
                    <pre className="mt-1 p-3 bg-white rounded-lg border border-slate-200 text-[11px] font-mono text-slate-800">
{`{
  "text": "Shortcut Input",
  "sender": "Sender"
}`}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Done Banner */}
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-3 text-xs text-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <p>
                  Setup complete! Ab jab bhi Google Pay ya Bank ka payment SMS aayega, iPhone automatically usko record kar dega.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Manual Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900">Naya Transaction Add Karein</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManual} className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'outflow' })}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      newTx.type === 'outflow'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Kharch (Outflow)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'inflow' })}
                    className={`py-2 rounded-xl text-xs font-semibold border transition ${
                      newTx.type === 'inflow'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Income (Inflow)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500"
                  value={newTx.amount}
                  onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Merchant / Source</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy, Netflix, Client Retainer"
                  value={newTx.merchant}
                  onChange={e => setNewTx({ ...newTx, merchant: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Category</label>
                <select
                  value={newTx.category}
                  onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
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

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-400 bg-white">
        CashFlow Guard • Light Clean View • Built for Vercel & iPhone Shortcuts
      </footer>
    </div>
  );
}
