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
  BarChart3,
  Clock,
  CalendarRange,
  ArrowLeftRight,
  CreditCard,
  Building2,
  Inbox,
  Pencil,
  FileText
} from 'lucide-react';
import { Transaction, CashFlowStats, CategoryBudget, ReportingPeriod, MyAccount } from '@/lib/types';

const SAMPLE_SMS_TEMPLATES = [
  {
    label: 'Swiggy (Debit)',
    text: 'Sent Rs.480.00 from HDFC Bank A/C **1234 to SWIGGY on 26-NOV-26. Ref 433129841892. Avbl bal Rs. 38,500.00.'
  },
  {
    label: 'Self-Transfer (Own A/C)',
    text: 'INR 10,000.00 debited from A/C **1234 on 26-Nov-26 transfer to own a/c linked to VPA rajat@oksbi. UPI Ref 433156789123.'
  },
  {
    label: 'Salary Credit (Client)',
    text: 'HDFC Bank: Rs 85,000.00 credited to a/c **1234 on 01-Nov-26 by a/c linked to VPA client@upi. Ref 433198711002.'
  },
  {
    label: 'Blinkit (Debit)',
    text: 'Your A/C XXXXX12345 debited by Rs 740.00 on 26Nov26 transfer to VPA blinkit@icici (UPI Ref no 433199887766).'
  },
  {
    label: 'Amazon (Debit)',
    text: 'Dear Customer, Acct XX123 debited with INR 2,499.00 on 26-Nov-26. Info: VPS*AMAZON. Avbl Bal INR 42,100.00.'
  },
  {
    label: 'Uber (Debit)',
    text: 'Kotak Bank: Rs. 385.00 debited from A/C ...123 on 26-Nov-26. UPI Ref: 433156789012. Beneficiary: UBER.'
  }
];

export default function CashFlowApp() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<CashFlowStats | null>(null);
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [myAccounts, setMyAccounts] = useState<MyAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'flow' | 'accounts' | 'budgets' | 'simulator' | 'iphone-setup'>('flow');

  // Exact Requested Filters: today | week | month | custom
  const [selectedPeriod, setSelectedPeriod] = useState<ReportingPeriod>('month');

  // Date Range State
  const [customFromDate, setCustomFromDate] = useState('2026-10-26');
  const [customToDate, setCustomToDate] = useState('2026-11-26');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const past = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    setCustomToDate(today);
    setCustomFromDate(past);
  }, []);

  // Search & Type Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inflow' | 'outflow' | 'transfer'>('all');

  // New Account state
  const [newAccName, setNewAccName] = useState('');
  const [newAccIdentifier, setNewAccIdentifier] = useState('');

  // Simulator state
  const [simulatorSMS, setSimulatorSMS] = useState('');
  const [simulatorResult, setSimulatorResult] = useState<any>(null);
  const [simulating, setSimulating] = useState(false);

  // Manual Add Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTx, setNewTx] = useState({
    amount: '',
    type: 'outflow' as 'inflow' | 'outflow' | 'transfer',
    merchant: '',
    category: 'Food & Dining',
    notes: ''
  });

  // Edit Modal state (rename merchant, add remarks)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    merchant: '',
    category: 'Food & Dining',
    amount: '',
    notes: '',
    type: 'outflow' as 'inflow' | 'outflow' | 'transfer'
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const fetchData = async (
    period: ReportingPeriod = selectedPeriod,
    fromD: string = customFromDate,
    toD: string = customToDate
  ) => {
    try {
      setLoading(true);
      let query = `period=${period}`;
      if (period === 'custom') {
        query += `&startDate=${fromD}&endDate=${toD}`;
      }

      const [txRes, statsRes, budgetRes, accRes] = await Promise.all([
        fetch(`/api/transactions?${query}`),
        fetch(`/api/stats?${query}`),
        fetch('/api/budgets'),
        fetch('/api/my-accounts')
      ]);

      const txData = await txRes.json();
      const statsData = await statsRes.json();
      const budgetData = await budgetRes.json();
      const accData = await accRes.json();

      if (txData.success) setTransactions(txData.transactions);
      if (statsData.success) setStats(statsData.stats);
      if (budgetData.success) setBudgets(budgetData.budgets);
      if (accData.success) setMyAccounts(accData.accounts);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(selectedPeriod, customFromDate, customToDate);
  }, [selectedPeriod]);

  const handlePeriodChange = (period: ReportingPeriod) => {
    setSelectedPeriod(period);
  };

  const handleApplyCustomDates = () => {
    fetchData('custom', customFromDate, customToDate);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccIdentifier.trim()) return;

    try {
      const res = await fetch('/api/my-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newAccName || 'My Bank/UPI',
          identifier: newAccIdentifier.trim()
        })
      });
      const data = await res.json();
      if (data.success) {
        setNewAccName('');
        setNewAccIdentifier('');
        await fetchData(selectedPeriod, customFromDate, customToDate);
        alert('UPI / Account successfully add ho gaya!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Yeh account/UPI ID delete karein?')) return;
    try {
      await fetch(`/api/my-accounts?id=${id}`, { method: 'DELETE' });
      await fetchData(selectedPeriod, customFromDate, customToDate);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTransfer = async (tx: Transaction) => {
    const isNowTransfer = tx.type !== 'transfer';
    try {
      await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tx.id,
          updates: {
            type: isNowTransfer ? 'transfer' : 'outflow',
            category: isNowTransfer ? 'Self Transfer' : 'Other Expenses'
          }
        })
      });
      await fetchData(selectedPeriod, customFromDate, customToDate);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditForm({
      merchant: tx.merchant,
      category: tx.category,
      amount: tx.amount.toString(),
      notes: tx.notes || '',
      type: tx.type
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    try {
      setSavingEdit(true);
      const res = await fetch('/api/transactions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTx.id,
          updates: {
            merchant: editForm.merchant.trim(),
            category: editForm.category,
            amount: parseFloat(editForm.amount) || editingTx.amount,
            notes: editForm.notes.trim(),
            type: editForm.type
          }
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditingTx(null);
        await fetchData(selectedPeriod, customFromDate, customToDate);
      }
    } catch (err) {
      console.error('Error saving transaction updates:', err);
    } finally {
      setSavingEdit(false);
    }
  };

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
        await fetchData(selectedPeriod, customFromDate, customToDate);
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
        await fetchData(selectedPeriod, customFromDate, customToDate);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTx = async (id: string) => {
    if (!confirm('Transaction delete karein?')) return;
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await fetchData(selectedPeriod, customFromDate, customToDate);
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

  const inflow = stats?.totalInflow || 0;
  const outflow = stats?.totalOutflow || 0;
  const net = stats?.netCashFlow || 0;
  const transfers = stats?.totalTransfers || 0;
  const expensePercentage = inflow > 0 ? Math.min(100, Math.round((outflow / inflow) * 100)) : (outflow > 0 ? 100 : 0);
  const savingsPercentage = 100 - expensePercentage;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-24 md:pb-10">
      {/* 🌐 RESPONSIVE APP HEADER */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">CashFlow Guard</h1>
                <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-200">
                  Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">Automated Cash Flow & iPhone Integration</p>
            </div>
          </div>

          {/* DESKTOP TOP NAV TABS */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('flow')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'flow'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wallet className="h-3.5 w-3.5 text-emerald-600" />
              Cash Flow
            </button>
            <button
              onClick={() => setActiveTab('accounts')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'accounts'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5 text-sky-600" />
              My UPI & Accounts
            </button>
            <button
              onClick={() => setActiveTab('budgets')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'budgets'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="h-3.5 w-3.5 text-rose-500" />
              Budget Limits
            </button>
            <button
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              SMS Tester
            </button>
            <button
              onClick={() => setActiveTab('iphone-setup')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'iphone-setup'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="h-3.5 w-3.5 text-sky-600" />
              iPhone Setup
            </button>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Naya Add</span>
            </button>
            <button
              onClick={() => fetchData(selectedPeriod, customFromDate, customToDate)}
              title="Refresh"
              className="p-1.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ⏱️ FILTERS BAR */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full md:w-auto">
            <button
              onClick={() => handlePeriodChange('today')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition text-center whitespace-nowrap ${
                selectedPeriod === 'today'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Today
            </button>

            <button
              onClick={() => handlePeriodChange('week')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition text-center whitespace-nowrap ${
                selectedPeriod === 'week'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              This Week
            </button>

            <button
              onClick={() => handlePeriodChange('month')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition text-center whitespace-nowrap ${
                selectedPeriod === 'month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Current Month
            </button>

            <button
              onClick={() => handlePeriodChange('custom')}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold transition text-center whitespace-nowrap flex items-center justify-center gap-1.5 ${
                selectedPeriod === 'custom'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Custom Date
            </button>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span>{stats?.periodLabel}</span>
            </span>
            <span className="text-[11px] bg-slate-100 px-2.5 py-0.5 rounded-lg font-bold text-slate-700 border border-slate-200">
              {stats?.transactionCount || 0} Transactions
            </span>
          </div>
        </div>

        {/* 📅 CUSTOM DATE RANGE */}
        {selectedPeriod === 'custom' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">From:</span>
                <input
                  type="date"
                  value={customFromDate}
                  onChange={e => setCustomFromDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-xs flex-1 md:w-44"
                />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-bold text-slate-600 whitespace-nowrap">To:</span>
                <input
                  type="date"
                  value={customToDate}
                  onChange={e => setCustomToDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-xs flex-1 md:w-44"
                />
              </div>
              <button
                onClick={handleApplyCustomDates}
                className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-xs font-bold shadow-xs transition"
              >
                Apply Range
              </button>
            </div>
          </div>
        )}
      </header>

      {/* 📱 / 💻 MAIN CONTENT */}
      <main className="max-w-lg lg:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full space-y-6 flex-1">
        {/* OVERSPENDING ALERT */}
        {selectedPeriod === 'month' && stats && stats.alerts.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-start md:items-center space-x-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-600 flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-rose-900">
                  Dhyan dein! {stats.alerts.length} Categories mein budget limit cross hui hai:
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
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl transition self-start md:self-auto shadow-xs whitespace-nowrap"
            >
              Limits Set Karein →
            </button>
          </div>
        )}

        {/* 📊 TAB 1: FLOW (HOME) */}
        {activeTab === 'flow' && (
          <div className="space-y-6">
            {/* 4 KPI CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Net Cash Flow */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Net Bacha (Savings)
                  </span>
                  <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    net >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {inflow > 0 ? `${savingsPercentage}% Bachat` : 'Clean Slate'}
                  </div>
                </div>
                <div className="mt-3">
                  <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {stats ? formatCurrency(stats.netCashFlow) : '₹0'}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Inflow minus outflow</p>
                </div>
                <div className="mt-4 space-y-1">
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/60">
                    <div
                      className="bg-rose-500 h-full transition-all duration-500"
                      style={{ width: `${expensePercentage}%` }}
                    />
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${Math.max(0, savingsPercentage)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card 2: Kul Aaya */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Kul Aaya (Inflow)
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl lg:text-3xl font-extrabold text-emerald-950 tracking-tight">
                    {stats ? formatCurrency(stats.totalInflow) : '₹0'}
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">Salary & client credits</p>
                </div>
                <div className="mt-4 text-[11px] text-slate-400 font-medium">
                  {stats?.periodLabel}
                </div>
              </div>

              {/* Card 3: Kul Gaya */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Kul Gaya (Outflow)
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                    <ArrowDownRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl lg:text-3xl font-extrabold text-rose-950 tracking-tight">
                    {stats ? formatCurrency(stats.totalOutflow) : '₹0'}
                  </div>
                  <p className="text-xs text-rose-700 mt-1">{expensePercentage}% of income spent</p>
                </div>
                <div className="mt-4 text-[11px] text-slate-400 font-medium">
                  Daily Burn: <strong className="text-slate-700">{stats ? formatCurrency(stats.dailyBurnRate) : '₹0'}/day</strong>
                </div>
              </div>

              {/* Card 4: Self Transfers */}
              <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Self Transfers
                  </span>
                  <div className="h-8 w-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                    <ArrowLeftRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl lg:text-3xl font-extrabold text-sky-950 tracking-tight">
                    {formatCurrency(transfers)}
                  </div>
                  <p className="text-xs text-sky-700 mt-1">Zero Expense (Between Own A/C)</p>
                </div>
                <div className="mt-4 text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Whitelisted accounts safe
                </div>
              </div>
            </div>

            {/* 2-COLUMN DESKTOP SPLIT / 1-COLUMN MOBILE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Category Budgets */}
              <div className="space-y-6">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-emerald-600" />
                      Category Budgets & Limits
                    </span>
                    <button
                      onClick={() => setActiveTab('budgets')}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
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
                            <span className="font-semibold text-slate-800">{b.category}</span>
                            <span className="text-[11px] text-slate-500">
                              <strong className={isExceeded ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-900'}>
                                {formatCurrency(spent)}
                              </strong>{' '}
                              / {formatCurrency(b.monthly_limit)}
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                isExceeded ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* My Accounts Quick Widget */}
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4 text-sky-600" />
                      My Accounts ({myAccounts.length})
                    </span>
                    <button
                      onClick={() => setActiveTab('accounts')}
                      className="text-xs font-semibold text-sky-600 hover:text-sky-700"
                    >
                      Manage →
                    </button>
                  </div>
                  {myAccounts.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                      <p>Apna UPI ya A/C add karein taaki internal transfers zero expense banein.</p>
                      <button
                        onClick={() => setActiveTab('accounts')}
                        className="mt-2 text-xs font-bold text-sky-600 underline"
                      >
                        + Add Account
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {myAccounts.slice(0, 3).map(acc => (
                        <div key={acc.id} className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800">{acc.name}</span>
                          <span className="text-[11px] font-mono text-slate-500">{acc.identifier}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Transactions History */}
              <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4 flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wider">
                      Transactions History
                    </h2>
                    <p className="text-xs text-slate-500">Auto-detected SMS & UPI records</p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 w-32 sm:w-44"
                      />
                    </div>
                    <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
                      <button
                        onClick={() => setFilterType('all')}
                        className={`px-2 py-1 rounded-md transition ${filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setFilterType('inflow')}
                        className={`px-2 py-1 rounded-md transition ${filterType === 'inflow' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'}`}
                      >
                        Aaya
                      </button>
                      <button
                        onClick={() => setFilterType('outflow')}
                        className={`px-2 py-1 rounded-md transition ${filterType === 'outflow' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500'}`}
                      >
                        Gaya
                      </button>
                      <button
                        onClick={() => setFilterType('transfer')}
                        className={`px-2 py-1 rounded-md transition ${filterType === 'transfer' ? 'bg-white text-sky-700 shadow-xs' : 'text-slate-500'}`}
                      >
                        Transfer
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transactions Table / Empty State */}
                <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[560px] pr-1">
                  {filteredTransactions.length === 0 ? (
                    <div className="text-center py-16 px-4 space-y-3">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                        <Inbox className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Abhi koi transaction nahi hai</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                          Aapka system clean aur ready hai! iPhone Shortcut setup karein ya manually test karne ke liye &apos;Naya Add&apos; karein.
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-2">
                        <button
                          onClick={() => setActiveTab('iphone-setup')}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                        >
                          <Smartphone className="h-3.5 w-3.5" />
                          <span>iPhone Shortcut Setup</span>
                        </button>
                        <button
                          onClick={() => setShowAddModal(true)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded-xl text-xs font-bold border border-slate-200 transition"
                        >
                          + Manual Entry
                        </button>
                      </div>
                    </div>
                  ) : (
                    filteredTransactions.map(tx => (
                      <div key={tx.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 px-2 rounded-xl transition">
                        <div className="flex items-center space-x-3 min-w-0">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              tx.type === 'transfer'
                                ? 'bg-sky-100 text-sky-800'
                                : tx.type === 'inflow'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {tx.type === 'transfer' ? (
                              <ArrowLeftRight className="h-4 w-4" />
                            ) : tx.type === 'inflow' ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleOpenEdit(tx)}
                                className="text-left group flex items-center gap-1.5 hover:text-emerald-700 transition"
                                title="Click to edit Name & Remark"
                              >
                                <span className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-emerald-700 truncate">
                                  {tx.merchant}
                                </span>
                                <Pencil className="h-3 w-3 text-slate-300 opacity-60 group-hover:opacity-100 group-hover:text-emerald-600 transition flex-shrink-0" />
                              </button>
                              {tx.type === 'transfer' && (
                                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">
                                  Self Transfer
                                </span>
                              )}
                            </div>

                            {tx.notes && (
                              <div className="flex items-center gap-1 text-[11px] text-amber-800 font-medium bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5 mt-0.5 w-fit">
                                <FileText className="h-3 w-3 text-amber-600 flex-shrink-0" />
                                <span className="truncate max-w-[200px] sm:max-w-xs">{tx.notes}</span>
                              </div>
                            )}

                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 flex-wrap mt-0.5">
                              <span className="text-slate-700 font-medium">{tx.category}</span>
                              {tx.account && <span>• {tx.account}</span>}
                              <span>
                                • {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}, {new Date(tx.date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
                          <span
                            className={`text-xs sm:text-sm font-bold tracking-tight ${
                              tx.type === 'transfer'
                                ? 'text-sky-700'
                                : tx.type === 'inflow'
                                ? 'text-emerald-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {tx.type === 'transfer' ? '⇄ ' : tx.type === 'inflow' ? '+' : '-'} {formatCurrency(tx.amount)}
                          </span>

                          <button
                            onClick={() => handleOpenEdit(tx)}
                            title="Edit Name, Remark & Category"
                            className="p-1.5 rounded-lg text-xs border border-slate-200 bg-slate-50 text-slate-500 hover:text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50 active:scale-95 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleToggleTransfer(tx)}
                            title={tx.type === 'transfer' ? 'Convert to Expense' : 'Mark as Self-Transfer (Exclude from Expense)'}
                            className={`p-1.5 rounded-lg text-xs border transition active:scale-95 ${
                              tx.type === 'transfer'
                                ? 'bg-sky-50 text-sky-700 border-sky-200'
                                : 'bg-slate-50 text-slate-400 hover:text-slate-700 border-slate-200'
                            }`}
                          >
                            <ArrowLeftRight className="h-3.5 w-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteTx(tx.id)}
                            className="text-slate-300 hover:text-rose-600 p-1.5 active:scale-95"
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

        {/* 💳 TAB 2: MY ACCOUNTS & UPI */}
        {activeTab === 'accounts' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                My Bank Accounts & UPI IDs (Self-Transfer Whitelist)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Yahan apne saare personal Bank A/C numbers ya UPI IDs add kar dein. Jab bhi aap in accounts ke beech paise move karenge, system <strong>100% automatically</strong> usko Self-Transfer pehchanega aur <strong>kharch mein count nahi karega!</strong>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <form onSubmit={handleAddAccount} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Naya Account / UPI ID Add Karein:</span>
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">Account Ka Naam</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Primary, SBI Savings"
                    value={newAccName}
                    onChange={e => setNewAccName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 font-semibold block mb-1">UPI ID ya A/C Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. rajat@okhdfcbank ya 1234"
                    value={newAccIdentifier}
                    onChange={e => setNewAccIdentifier(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg text-xs shadow-xs transition"
                >
                  + Add My Account
                </button>
              </form>

              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-900">Active Whitelisted Accounts ({myAccounts.length}):</span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {myAccounts.length === 0 ? (
                    <p className="p-4 text-xs text-slate-400 text-center">Abhi koi account add nahi hai. Upar se add karein!</p>
                  ) : (
                    myAccounts.map(acc => (
                      <div key={acc.id} className="p-3 flex items-center justify-between bg-white hover:bg-slate-50 text-xs">
                        <div className="flex items-center space-x-3">
                          <Building2 className="h-5 w-5 text-emerald-600" />
                          <div>
                            <span className="font-bold text-slate-900">{acc.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono block">{acc.identifier}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAccount(acc.id)}
                          className="text-slate-300 hover:text-rose-600 p-1.5"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 🛡️ TAB 3: KHARCH CONTROL & BUDGETS */}
        {activeTab === 'budgets' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-emerald-600" />
                Monthly Expense Limits (Targets)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Har category ka monthly target set karein. 80% reach hone par system warning alert dega.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {budgets.map((b, idx) => {
                const spent = stats?.categorySpending[b.category] || 0;
                const percent = Math.min(100, Math.round((spent / b.monthly_limit) * 100));
                const isExceeded = spent > b.monthly_limit;

                return (
                  <div key={b.category} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-slate-900">{b.category}</span>
                        <p className="text-[11px] text-slate-500">
                          Kharch: <strong className={isExceeded ? 'text-rose-600' : 'text-slate-800'}>{formatCurrency(spent)}</strong> ({percent}%)
                        </p>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs text-slate-500 font-semibold">₹</span>
                        <input
                          type="number"
                          value={b.monthly_limit}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = [...budgets];
                            updated[idx].monthly_limit = val;
                            setBudgets(updated);
                          }}
                          className="w-24 bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isExceeded ? 'bg-rose-500' : percent >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={async () => {
                  await fetch('/api/budgets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ budgets })
                  });
                  await fetchData(selectedPeriod, customFromDate, customToDate);
                  alert('Limits successfully save ho gayi hain!');
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs sm:text-sm shadow-xs transition"
              >
                Save All Limits
              </button>
            </div>
          </div>
        )}

        {/* 🧪 TAB 4: SMS TESTER */}
        {activeTab === 'simulator' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Bank SMS Parser Tester
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Bank ya UPI SMS paste karke live test karein (Self Transfer bhi test kar sakte hain).
              </p>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs text-slate-500 font-bold uppercase">Quick Samples:</span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_SMS_TEMPLATES.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSimulatorSMS(sample.text);
                      handleSimulate(sample.text);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-semibold border border-slate-200"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={4}
              placeholder="Bank transaction SMS yahan paste karein..."
              value={simulatorSMS}
              onChange={e => setSimulatorSMS(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
            />

            <button
              disabled={!simulatorSMS.trim() || simulating}
              onClick={() => handleSimulate(simulatorSMS)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-xs"
            >
              <Send className="h-4 w-4" />
              <span>{simulating ? 'Analyzing...' : 'Parse & Add to Flow'}</span>
            </button>

            {simulatorResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-2 ${
                  simulatorResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  {simulatorResult.success ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span>Parsed & Added Successfully!</span>
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
        )}

        {/* 📱 TAB 5: IPHONE SETUP GUIDE */}
        {activeTab === 'iphone-setup' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-sky-600" />
                iPhone Shortcuts Automation Setup
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                2 minute mein setup karein taaki har bank SMS aate hi background mein live sync ho jaye.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-bold text-slate-900">1. Shortcuts App kholiye</span>
              <p className="text-xs text-slate-600">
                iPhone par <strong>Shortcuts</strong> App kholiye ➔ <strong>Automation</strong> tab ➔ <strong>New Automation (+)</strong>
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-bold text-slate-900">2. Trigger: Message</span>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <p>• <strong>Message Contains:</strong> <code className="bg-white px-1.5 py-0.5 rounded text-emerald-700 font-bold border border-slate-200">debited, credited, spent, received, A/C, INR, Rs</code></p>
                <p>• <strong>Run Immediately:</strong> Select karein (Don&apos;t ask before running)</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-bold text-slate-900">3. Action: Get Contents of URL</span>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Webhook URL</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <input
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/api/sms` : 'https://your-domain.vercel.app/api/sms'}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-mono text-emerald-700 font-bold"
                    />
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/api/sms`;
                        navigator.clipboard.writeText(url);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 flex items-center gap-1 font-semibold"
                    >
                      {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Method</span>
                    <p className="bg-white p-2 rounded-lg border border-slate-200 text-xs font-bold font-mono text-center">POST</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Header (x-api-key)</span>
                    <div className="flex items-center space-x-1.5 mt-1">
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
                        className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700"
                      >
                        {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Request Body (JSON)</span>
                  <pre className="mt-1 p-2.5 bg-white rounded-lg border border-slate-200 text-xs font-mono text-slate-800">
{`{
  "text": "Shortcut Input",
  "sender": "Sender"
}`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center space-x-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <span>Setup complete! Har bank transaction SMS yahan live auto-sync hoga.</span>
            </div>
          </div>
        )}
      </main>

      {/* 📱 NATIVE iOS STYLE FIXED BOTTOM NAVIGATION BAR (MOBILE ONLY) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200/90 z-40 shadow-lg md:hidden">
        <div className="max-w-lg mx-auto px-2 h-16 flex items-center justify-around">
          <button
            onClick={() => setActiveTab('flow')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeTab === 'flow' ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <Wallet className="h-5 w-5" />
            <span className="text-[10px] mt-1">Cash Flow</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeTab === 'accounts' ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <CreditCard className="h-5 w-5" />
            <span className="text-[10px] mt-1">My UPI/A/C</span>
          </button>

          <button
            onClick={() => setActiveTab('budgets')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeTab === 'budgets' ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <ShieldAlert className="h-5 w-5" />
            <span className="text-[10px] mt-1">Limits</span>
          </button>

          <button
            onClick={() => setActiveTab('simulator')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeTab === 'simulator' ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px] mt-1">SMS Test</span>
          </button>

          <button
            onClick={() => setActiveTab('iphone-setup')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              activeTab === 'iphone-setup' ? 'text-emerald-600 font-bold' : 'text-slate-400 font-medium'
            }`}
          >
            <Smartphone className="h-5 w-5" />
            <span className="text-[10px] mt-1">iPhone</span>
          </button>
        </div>
      </nav>

      {/* MANUAL ENTRY MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="font-bold text-sm text-slate-900">Naya Transaction Add Karein</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddManual} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'outflow' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition text-center ${
                      newTx.type === 'outflow'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Kharch
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'inflow' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition text-center ${
                      newTx.type === 'inflow'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'transfer' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition text-center ${
                      newTx.type === 'transfer'
                        ? 'bg-sky-50 border-sky-300 text-sky-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Self Transfer
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Amount (₹)</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 500"
                  value={newTx.amount}
                  onChange={e => setNewTx({ ...newTx, amount: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Merchant / Recipient</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy, SBI Savings, Client"
                  value={newTx.merchant}
                  onChange={e => setNewTx({ ...newTx, merchant: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Category</label>
                <select
                  value={newTx.category}
                  onChange={e => setNewTx({ ...newTx, category: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
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
                  <option value="Self Transfer">Self Transfer</option>
                  <option value="Other Expenses">Other Expenses</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl text-xs text-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ✏️ EDIT TRANSACTION MODAL (Rename Merchant, Add Remarks, Recategorize) */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 space-y-3.5 shadow-2xl animate-in slide-in-from-bottom-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Pencil className="h-4 w-4 text-emerald-600" />
                  Transaction Details Update
                </h3>
                <p className="text-[11px] text-slate-500">Name aur remark add karein taaki month-end reporting clear rahe.</p>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-slate-600 text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Type</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, type: 'outflow' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition text-center ${
                      editForm.type === 'outflow'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Kharch (Outflow)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, type: 'inflow' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition text-center ${
                      editForm.type === 'inflow'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Aaya (Income)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, type: 'transfer', category: 'Self Transfer' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition text-center ${
                      editForm.type === 'transfer'
                        ? 'bg-sky-50 border-sky-300 text-sky-800'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    Self Transfer
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Kisko bheje / Kis se aaye (Name)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ankit Gupta, Ramesh Client, Swiggy, Office Wifi"
                  value={editForm.merchant}
                  onChange={e => setEditForm({ ...editForm, merchant: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Remark / Notes (Kyun diye / Kis project ke hain)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Website advance 50%, Team lunch, Diwali bonus, Bike fuel"
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">Category</label>
                  <select
                    value={editForm.category}
                    onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
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
                    <option value="Self Transfer">Self Transfer</option>
                    <option value="Other Expenses">Other Expenses</option>
                  </select>
                </div>
              </div>

              {editingTx.raw_sms && (
                <div className="bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Original SMS</span>
                  <p className="text-[10px] text-slate-500 font-mono leading-tight whitespace-pre-wrap line-clamp-2">
                    {editingTx.raw_sms}
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                >
                  {savingEdit ? 'Saving...' : 'Update Karein'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
