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
  CalendarRange
} from 'lucide-react';
import { Transaction, CashFlowStats, CategoryBudget, ReportingPeriod } from '@/lib/types';

const SAMPLE_SMS_TEMPLATES = [
  {
    label: 'Swiggy (Debit)',
    text: 'Sent Rs.480.00 from HDFC Bank A/C **1234 to SWIGGY on 26-NOV-26. Ref 433129841892. Avbl bal Rs. 38,500.00.'
  },
  {
    label: 'Salary Credit',
    text: 'HDFC Bank: Rs 85,000.00 credited to a/c **1234 on 01-Nov-26 by a/c linked to VPA employer@upi. Ref 433198711002.'
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
    label: 'Client (Inflow)',
    text: 'Your A/C **1234 is credited by Rs 25,000.00 from Client VPA rakesh@okhdfcbank. Ref 433112233445.'
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
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'flow' | 'budgets' | 'simulator' | 'iphone-setup'>('flow');

  // Exact Requested Filters: today | week | month | custom
  const [selectedPeriod, setSelectedPeriod] = useState<ReportingPeriod>('month');

  // Custom Date Range State
  const [customFromDate, setCustomFromDate] = useState('2026-09-01');
  const [customToDate, setCustomToDate] = useState('2026-11-26');

  // Search & Type Filter
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

      const [txRes, statsRes, budgetRes] = await Promise.all([
        fetch(`/api/transactions?${query}`),
        fetch(`/api/stats?${query}`),
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
    fetchData(selectedPeriod, customFromDate, customToDate);
  }, [selectedPeriod]);

  const handlePeriodChange = (period: ReportingPeriod) => {
    setSelectedPeriod(period);
  };

  const handleApplyCustomDates = () => {
    fetchData('custom', customFromDate, customToDate);
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
  const expensePercentage = inflow > 0 ? Math.min(100, Math.round((outflow / inflow) * 100)) : 100;
  const savingsPercentage = 100 - expensePercentage;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans pb-24">
      {/* 📱 TOP APP BAR */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-xs">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-slate-900 text-sm tracking-tight">CashFlow Guard</h1>
                <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full border border-emerald-200">
                  Live
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Reporting & Expense Control</p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-xs transition"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Naya Add</span>
            </button>
            <button
              onClick={() => fetchData(selectedPeriod, customFromDate, customToDate)}
              title="Refresh"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* ⏱️ FILTERS: Today, This Week, Current Month, Custom Date */}
        <div className="max-w-lg mx-auto px-3 py-2 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <button
              onClick={() => handlePeriodChange('today')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition text-center whitespace-nowrap ${
                selectedPeriod === 'today'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Today
            </button>

            <button
              onClick={() => handlePeriodChange('week')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition text-center whitespace-nowrap ${
                selectedPeriod === 'week'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              This Week
            </button>

            <button
              onClick={() => handlePeriodChange('month')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition text-center whitespace-nowrap ${
                selectedPeriod === 'month'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Current Month
            </button>

            <button
              onClick={() => handlePeriodChange('custom')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition text-center whitespace-nowrap flex items-center justify-center gap-1 ${
                selectedPeriod === 'custom'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CalendarRange className="h-3 w-3" />
              Custom Date
            </button>
          </div>

          {/* 📅 CUSTOM DATE RANGE PICKER (EXPANDS WHEN CUSTOM DATE IS ACTIVE) */}
          {selectedPeriod === 'custom' && (
            <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-2.5 space-y-2 animate-in fade-in duration-200">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={customFromDate}
                    onChange={e => setCustomFromDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={customToDate}
                    onChange={e => setCustomToDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>
              </div>
              <button
                onClick={handleApplyCustomDates}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-1.5 rounded-lg text-xs font-bold shadow-xs transition"
              >
                Apply Date Range
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 📱 MAIN VIEW */}
      <main className="max-w-lg mx-auto px-4 py-3 w-full space-y-4 flex-1">
        {/* ACTIVE TIMEFRAME STATUS PILL */}
        <div className="flex items-center justify-between text-xs text-slate-500 bg-white/70 px-3 py-1.5 rounded-xl border border-slate-200/60">
          <span className="font-semibold text-slate-700 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span>Filter: {stats?.periodLabel}</span>
          </span>
          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-600">
            {stats?.transactionCount || 0} Transactions
          </span>
        </div>

        {/* OVERSPENDING ALERT (CURRENT MONTH) */}
        {selectedPeriod === 'month' && stats && stats.alerts.length > 0 && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-rose-600 flex-shrink-0" />
                <h3 className="text-xs font-bold text-rose-900">
                  Kharch Warning: {stats.alerts.length} Limit Cross Hui!
                </h3>
              </div>
              <button
                onClick={() => setActiveTab('budgets')}
                className="text-[11px] font-bold text-rose-700 underline"
              >
                Limits Set Karein →
              </button>
            </div>
            <div className="space-y-1">
              {stats.alerts.map(a => (
                <div key={a.category} className="flex justify-between items-center text-[11px] text-rose-800 bg-white/80 px-2 py-1 rounded-md border border-rose-100">
                  <span className="font-semibold">{a.category}</span>
                  <span>{a.percentage}% used ({formatCurrency(a.spent)} / {formatCurrency(a.limit)})</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 📊 TAB 1: FLOW & SUMMARY FOR SELECTED PERIOD */}
        {activeTab === 'flow' && (
          <div className="space-y-4">
            {/* HERO CASH FLOW CARD FOR CHOSEN FILTER */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Net Cash Flow ({stats?.periodLabel})
                  </span>
                  <div className={`text-2xl font-extrabold tracking-tight mt-0.5 ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {stats ? formatCurrency(stats.netCashFlow) : '₹0'}
                  </div>
                </div>
                <div className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                  net >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}>
                  {savingsPercentage}% Bachat
                </div>
              </div>

              {/* AAYA vs GAYA 2-COLUMN SPLIT */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-emerald-50/70 border border-emerald-200/70 rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-emerald-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Kul Aaya (Inflow)</span>
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-base font-extrabold text-emerald-950 mt-1">
                    {stats ? formatCurrency(stats.totalInflow) : '₹0'}
                  </div>
                  <p className="text-[10px] text-emerald-700 mt-0.5">Is time period mein</p>
                </div>

                <div className="bg-rose-50/70 border border-rose-200/70 rounded-xl p-2.5">
                  <div className="flex items-center justify-between text-rose-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Kul Gaya (Outflow)</span>
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  </div>
                  <div className="text-base font-extrabold text-rose-950 mt-1">
                    {stats ? formatCurrency(stats.totalOutflow) : '₹0'}
                  </div>
                  <p className="text-[10px] text-rose-700 mt-0.5">{expensePercentage}% of income</p>
                </div>
              </div>

              {/* FLOW PROPORTION BAR */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                  <span className="text-rose-600">Kharch: {expensePercentage}% ({formatCurrency(outflow)})</span>
                  <span className="text-emerald-700">Bachat: {savingsPercentage}% ({formatCurrency(net)})</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex border border-slate-200/80">
                  <div
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${expensePercentage}%` }}
                  />
                  <div
                    className="bg-emerald-500 h-full transition-all duration-500"
                    style={{ width: `${Math.max(0, savingsPercentage)}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                  <span>Daily Run Rate: <strong className="text-slate-700">{stats ? formatCurrency(stats.dailyBurnRate) : '₹0'}/din</strong></span>
                  <span>Projected Month: <strong className="text-slate-700">{stats ? formatCurrency(stats.projectedMonthlyOutflow) : '₹0'}</strong></span>
                </div>
              </div>
            </div>

            {/* CATEGORY EXPENSE SHARE FOR CHOSEN FILTER */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                  Kharch Ka Batwara ({stats?.periodLabel})
                </span>
                <span className="text-[10px] text-slate-400 font-bold">Category Wise</span>
              </div>

              <div className="space-y-2.5">
                {stats && Object.keys(stats.categorySpending).length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">Is time period mein koi kharch nahi hua.</p>
                ) : (
                  stats &&
                  Object.entries(stats.categorySpending)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, spent]) => {
                      const pct = stats.categoryPercentages[cat] || 0;
                      return (
                        <div key={cat} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-800">{cat}</span>
                            <span className="text-[11px] text-slate-600">
                              <strong className="text-slate-900">{formatCurrency(spent)}</strong> ({pct}% of total)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="bg-slate-800 h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* TRANSACTIONS FILTERED BY TIME PERIOD */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Transactions List
                  </h2>
                  <p className="text-[10px] text-slate-400">{stats?.periodLabel}</p>
                </div>

                <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-semibold">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-2 py-0.5 rounded-md transition ${filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('inflow')}
                    className={`px-2 py-0.5 rounded-md transition ${filterType === 'inflow' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'}`}
                  >
                    Aaya
                  </button>
                  <button
                    onClick={() => setFilterType('outflow')}
                    className={`px-2 py-0.5 rounded-md transition ${filterType === 'outflow' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500'}`}
                  >
                    Gaya
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredTransactions.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">
                    Is selected dates mein koi transaction nahi mila.
                  </div>
                ) : (
                  filteredTransactions.map(tx => (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            tx.type === 'inflow' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {tx.type === 'inflow' ? (
                            <ArrowUpRight className="h-4 w-4" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {tx.merchant}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="text-slate-600 font-medium">{tx.category}</span>
                            <span>•</span>
                            <span>{new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span
                          className={`text-xs font-bold ${
                            tx.type === 'inflow' ? 'text-emerald-700' : 'text-slate-900'
                          }`}
                        >
                          {tx.type === 'inflow' ? '+' : '-'} {formatCurrency(tx.amount)}
                        </span>
                        <button
                          onClick={() => handleDeleteTx(tx.id)}
                          className="text-slate-300 hover:text-rose-600 p-1"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 🛡️ TAB 2: KHARCH CONTROL & BUDGETS */}
        {activeTab === 'budgets' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-emerald-600" />
                Monthly Expense Limits (Targets)
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Har category ka monthly limit set karein. 80% reach hone par warning badge aayega.
              </p>
            </div>

            <div className="space-y-3">
              {budgets.map((b, idx) => {
                const spent = stats?.categorySpending[b.category] || 0;
                const percent = Math.min(100, Math.round((spent / b.monthly_limit) * 100));
                const isExceeded = spent > b.monthly_limit;

                return (
                  <div key={b.category} className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-900">{b.category}</span>
                        <p className="text-[10px] text-slate-500">
                          Kharch: <strong className={isExceeded ? 'text-rose-600' : 'text-slate-800'}>{formatCurrency(spent)}</strong> ({percent}%)
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] text-slate-400 font-semibold">₹</span>
                        <input
                          type="number"
                          value={b.monthly_limit}
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = [...budgets];
                            updated[idx].monthly_limit = val;
                            setBudgets(updated);
                          }}
                          className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-900 font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
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
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-xs transition"
            >
              Save All Limits
            </button>
          </div>
        )}

        {/* 🧪 TAB 3: SMS TESTER */}
        {activeTab === 'simulator' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-3.5">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Bank SMS Parser Tester
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Bank ya UPI SMS paste karke live test karein.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Samples:</span>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_SMS_TEMPLATES.map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSimulatorSMS(sample.text);
                      handleSimulate(sample.text);
                    }}
                    className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 font-semibold border border-slate-200"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              rows={3}
              placeholder="Bank transaction SMS yahan paste karein..."
              value={simulatorSMS}
              onChange={e => setSimulatorSMS(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 font-mono"
            />

            <button
              disabled={!simulatorSMS.trim() || simulating}
              onClick={() => handleSimulate(simulatorSMS)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{simulating ? 'Analyzing...' : 'Parse & Add to Flow'}</span>
            </button>

            {simulatorResult && (
              <div
                className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                  simulatorResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="font-bold flex items-center gap-1 text-[11px]">
                  {simulatorResult.success ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Parsed & Added!</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                      <span>Parse Error</span>
                    </>
                  )}
                </div>
                <pre className="p-2 bg-white rounded-lg text-slate-700 font-mono text-[10px] border border-slate-200 overflow-x-auto">
                  {JSON.stringify(simulatorResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* 📱 TAB 4: IPHONE SETUP GUIDE */}
        {activeTab === 'iphone-setup' && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-2.5">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-sky-600" />
                iPhone Shortcuts Automation Setup
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                2 minute mein setup karein taaki har SMS turant dashboard mein aa jaye.
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900">1. Shortcuts App kholiye</span>
              <p className="text-[11px] text-slate-500">
                <strong>Automation</strong> ➔ <strong>New Automation (+)</strong>
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-900">2. Trigger: Message</span>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
                <p>• <strong>Contains:</strong> <code className="bg-white px-1 py-0.5 rounded text-emerald-700 font-bold">debited, credited, spent, received, A/C, INR, Rs</code></p>
                <p>• <strong>Run Immediately:</strong> Select karein</p>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900">3. Action: Get Contents of URL</span>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Webhook URL</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <input
                      readOnly
                      value={typeof window !== 'undefined' ? `${window.location.origin}/api/sms` : 'https://your-domain.vercel.app/api/sms'}
                      className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[11px] font-mono text-emerald-700 font-bold"
                    />
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/api/sms`;
                        navigator.clipboard.writeText(url);
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className="p-1.5 bg-white border border-slate-200 rounded-lg text-slate-700"
                    >
                      {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Method</span>
                    <p className="bg-white p-1 rounded-md border border-slate-200 text-[11px] font-bold font-mono text-center">POST</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Header (x-api-key)</span>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <input
                        readOnly
                        value="cf_secret_2026"
                        className="w-full bg-white border border-slate-200 rounded p-1 text-[10px] font-mono text-slate-800 font-bold"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText('cf_secret_2026');
                          setCopiedKey(true);
                          setTimeout(() => setCopiedKey(false), 2000);
                        }}
                        className="p-1 bg-white border border-slate-200 rounded text-slate-700"
                      >
                        {copiedKey ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Request Body (JSON)</span>
                  <pre className="mt-0.5 p-2 bg-white rounded border border-slate-200 text-[10px] font-mono text-slate-800">
{`{
  "text": "Shortcut Input",
  "sender": "Sender"
}`}
                  </pre>
                </div>
              </div>
            </div>

            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
              <span>Har bank transaction SMS yahan live auto-sync hoga.</span>
            </div>
          </div>
        )}
      </main>

      {/* 📱 NATIVE iOS STYLE FIXED BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-slate-200/90 z-40 shadow-lg">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-around">
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'outflow' })}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
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
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
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
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">Merchant / Source</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Swiggy, Netflix, Client Retainer"
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
    </div>
  );
}
