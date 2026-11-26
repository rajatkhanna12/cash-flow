import { Transaction, CategoryBudget, CashFlowStats, ReportingPeriod } from './types';
import fs from 'fs';
import path from 'path';

export const DEFAULT_BUDGETS: CategoryBudget[] = [
  { category: 'Food & Dining', monthly_limit: 8000 },
  { category: 'Groceries', monthly_limit: 6000 },
  { category: 'Travel & Fuel', monthly_limit: 4000 },
  { category: 'Shopping', monthly_limit: 7000 },
  { category: 'Bills & Utilities', monthly_limit: 5000 },
  { category: 'Entertainment & Subs', monthly_limit: 2000 },
  { category: 'Health & Medical', monthly_limit: 3000 },
  { category: 'Other Expenses', monthly_limit: 5000 },
];

// Reference current date: 26 Nov 2026
const NOW = new Date('2026-11-26T10:30:00Z');

// Seed realistic multi-month data: Today, This Week, This Month (Nov 2026), Last Month (Oct 2026), 2 Months Ago (Sep 2026)
const SEED_TRANSACTIONS: Transaction[] = [
  // --- TODAY (26 Nov 2026) ---
  {
    id: 'tx-today-1',
    amount: 480,
    type: 'outflow',
    category: 'Food & Dining',
    merchant: 'Swiggy',
    account: 'A/C **1234',
    reference: '433100100001',
    date: new Date('2026-11-26T08:30:00Z').toISOString(),
    created_at: new Date('2026-11-26T08:30:00Z').toISOString(),
    raw_sms: 'Sent Rs.480.00 from HDFC Bank A/C **1234 to SWIGGY on 26-NOV-26.'
  },
  {
    id: 'tx-today-2',
    amount: 180,
    type: 'outflow',
    category: 'Food & Dining',
    merchant: 'Chai Point',
    account: 'A/C **1234',
    reference: '433100100002',
    date: new Date('2026-11-26T04:15:00Z').toISOString(),
    created_at: new Date('2026-11-26T04:15:00Z').toISOString(),
    raw_sms: 'Paid Rs 180.00 to Chai Point from A/C **1234.'
  },

  // --- THIS WEEK (20 - 25 Nov 2026) ---
  {
    id: 'tx-week-1',
    amount: 850,
    type: 'outflow',
    category: 'Groceries',
    merchant: 'Blinkit',
    account: 'A/C **1234',
    reference: '433100100003',
    date: new Date('2026-11-24T14:20:00Z').toISOString(),
    created_at: new Date('2026-11-24T14:20:00Z').toISOString(),
    raw_sms: 'Sent Rs.850.00 to Blinkit from A/C **1234'
  },
  {
    id: 'tx-week-2',
    amount: 420,
    type: 'outflow',
    category: 'Travel & Fuel',
    merchant: 'Uber Rides',
    account: 'A/C **1234',
    reference: '433100100004',
    date: new Date('2026-11-23T11:00:00Z').toISOString(),
    created_at: new Date('2026-11-23T11:00:00Z').toISOString(),
    raw_sms: 'INR 420.00 debited at UBER INDIA.'
  },
  {
    id: 'tx-week-3',
    amount: 15000,
    type: 'inflow',
    category: 'Salary & Income',
    merchant: 'Freelance Payout',
    account: 'A/C **1234',
    reference: '433100100005',
    date: new Date('2026-11-22T09:00:00Z').toISOString(),
    created_at: new Date('2026-11-22T09:00:00Z').toISOString(),
    raw_sms: 'Your A/C **1234 is credited by Rs 15,000.00 from Client VPA.'
  },

  // --- REST OF THIS MONTH (Nov 2026) ---
  {
    id: 'tx-nov-1',
    amount: 85000,
    type: 'inflow',
    category: 'Salary & Income',
    merchant: 'Monthly Salary Credit',
    account: 'A/C **1234',
    reference: '433100100006',
    date: new Date('2026-11-01T04:30:00Z').toISOString(),
    created_at: new Date('2026-11-01T04:30:00Z').toISOString(),
    raw_sms: 'HDFC Bank: Rs 85,000.00 credited to a/c **1234. Salary.'
  },
  {
    id: 'tx-nov-2',
    amount: 6540,
    type: 'outflow',
    category: 'Food & Dining',
    merchant: 'Zomato & Dining Out',
    account: 'A/C **1234',
    reference: '433100100007',
    date: new Date('2026-11-18T16:00:00Z').toISOString(),
    created_at: new Date('2026-11-18T16:00:00Z').toISOString(),
  },
  {
    id: 'tx-nov-3',
    amount: 4550,
    type: 'outflow',
    category: 'Groceries',
    merchant: 'Zepto & Instamart',
    account: 'A/C **1234',
    reference: '433100100008',
    date: new Date('2026-11-15T10:00:00Z').toISOString(),
    created_at: new Date('2026-11-15T10:00:00Z').toISOString(),
  },
  {
    id: 'tx-nov-4',
    amount: 8900,
    type: 'outflow',
    category: 'Shopping',
    merchant: 'Amazon India',
    account: 'A/C **1234',
    reference: '433100100009',
    date: new Date('2026-11-12T12:00:00Z').toISOString(),
    created_at: new Date('2026-11-12T12:00:00Z').toISOString(),
  },
  {
    id: 'tx-nov-5',
    amount: 2780,
    type: 'outflow',
    category: 'Travel & Fuel',
    merchant: 'Petrol & Fastag',
    account: 'A/C **1234',
    reference: '433100100010',
    date: new Date('2026-11-10T08:00:00Z').toISOString(),
    created_at: new Date('2026-11-10T08:00:00Z').toISOString(),
  },
  {
    id: 'tx-nov-6',
    amount: 3100,
    type: 'outflow',
    category: 'Bills & Utilities',
    merchant: 'Airtel Wifi & Electricity',
    account: 'A/C **1234',
    reference: '433100100011',
    date: new Date('2026-11-05T06:00:00Z').toISOString(),
    created_at: new Date('2026-11-05T06:00:00Z').toISOString(),
  },
  {
    id: 'tx-nov-7',
    amount: 1999,
    type: 'outflow',
    category: 'Entertainment & Subs',
    merchant: 'Netflix & Spotify',
    account: 'A/C **1234',
    reference: '433100100012',
    date: new Date('2026-11-03T05:00:00Z').toISOString(),
    created_at: new Date('2026-11-03T05:00:00Z').toISOString(),
  },

  // --- LAST MONTH: OCTOBER 2026 (Pichla Mahina) ---
  {
    id: 'tx-oct-1',
    amount: 85000,
    type: 'inflow',
    category: 'Salary & Income',
    merchant: 'Monthly Salary Credit',
    account: 'A/C **1234',
    reference: '433100200001',
    date: new Date('2026-10-01T04:30:00Z').toISOString(),
    created_at: new Date('2026-10-01T04:30:00Z').toISOString(),
  },
  {
    id: 'tx-oct-2',
    amount: 12500,
    type: 'outflow',
    category: 'Shopping',
    merchant: 'Diwali Festive Shopping (Flipkart & Amazon)',
    account: 'A/C **1234',
    reference: '433100200002',
    date: new Date('2026-10-25T14:00:00Z').toISOString(),
    created_at: new Date('2026-10-25T14:00:00Z').toISOString(),
  },
  {
    id: 'tx-oct-3',
    amount: 8200,
    type: 'outflow',
    category: 'Food & Dining',
    merchant: 'Restaurants & Family Dinner',
    account: 'A/C **1234',
    reference: '433100200003',
    date: new Date('2026-10-20T17:00:00Z').toISOString(),
    created_at: new Date('2026-10-20T17:00:00Z').toISOString(),
  },
  {
    id: 'tx-oct-4',
    amount: 5800,
    type: 'outflow',
    category: 'Groceries',
    merchant: 'BigBasket & Dmart',
    account: 'A/C **1234',
    reference: '433100200004',
    date: new Date('2026-10-15T09:00:00Z').toISOString(),
    created_at: new Date('2026-10-15T09:00:00Z').toISOString(),
  },
  {
    id: 'tx-oct-5',
    amount: 4600,
    type: 'outflow',
    category: 'Travel & Fuel',
    merchant: 'Petrol & Outstation Travel',
    account: 'A/C **1234',
    reference: '433100200005',
    date: new Date('2026-10-10T12:00:00Z').toISOString(),
    created_at: new Date('2026-10-10T12:00:00Z').toISOString(),
  },
  {
    id: 'tx-oct-6',
    amount: 3200,
    type: 'outflow',
    category: 'Bills & Utilities',
    merchant: 'Electricity & Gas bill',
    account: 'A/C **1234',
    reference: '433100200006',
    date: new Date('2026-10-06T08:00:00Z').toISOString(),
    created_at: new Date('2026-10-06T08:00:00Z').toISOString(),
  },

  // --- 2 MONTHS AGO: SEPTEMBER 2026 (2 Mahine Pehle) ---
  {
    id: 'tx-sep-1',
    amount: 85000,
    type: 'inflow',
    category: 'Salary & Income',
    merchant: 'Monthly Salary Credit',
    account: 'A/C **1234',
    reference: '433100300001',
    date: new Date('2026-09-01T04:30:00Z').toISOString(),
    created_at: new Date('2026-09-01T04:30:00Z').toISOString(),
  },
  {
    id: 'tx-sep-2',
    amount: 20000,
    type: 'inflow',
    category: 'Salary & Income',
    merchant: 'Freelance Consulting',
    account: 'A/C **1234',
    reference: '433100300002',
    date: new Date('2026-09-18T10:00:00Z').toISOString(),
    created_at: new Date('2026-09-18T10:00:00Z').toISOString(),
  },
  {
    id: 'tx-sep-3',
    amount: 6800,
    type: 'outflow',
    category: 'Food & Dining',
    merchant: 'Dining & Cafes',
    account: 'A/C **1234',
    reference: '433100300003',
    date: new Date('2026-09-22T13:00:00Z').toISOString(),
    created_at: new Date('2026-09-22T13:00:00Z').toISOString(),
  },
  {
    id: 'tx-sep-4',
    amount: 5100,
    type: 'outflow',
    category: 'Groceries',
    merchant: 'Local Supermarket & Blinkit',
    account: 'A/C **1234',
    reference: '433100300004',
    date: new Date('2026-09-15T15:00:00Z').toISOString(),
    created_at: new Date('2026-09-15T15:00:00Z').toISOString(),
  },
  {
    id: 'tx-sep-5',
    amount: 4200,
    type: 'outflow',
    category: 'Shopping',
    merchant: 'Zara & Myntra',
    account: 'A/C **1234',
    reference: '433100300005',
    date: new Date('2026-09-10T11:00:00Z').toISOString(),
    created_at: new Date('2026-09-10T11:00:00Z').toISOString(),
  },
  {
    id: 'tx-sep-6',
    amount: 3500,
    type: 'outflow',
    category: 'Travel & Fuel',
    merchant: 'Fuel & Metro',
    account: 'A/C **1234',
    reference: '433100300006',
    date: new Date('2026-09-08T09:00:00Z').toISOString(),
    created_at: new Date('2026-09-08T09:00:00Z').toISOString(),
  },
  {
    id: 'tx-sep-7',
    amount: 3000,
    type: 'outflow',
    category: 'Bills & Utilities',
    merchant: 'Utility Bills',
    account: 'A/C **1234',
    reference: '433100300007',
    date: new Date('2026-09-04T07:00:00Z').toISOString(),
    created_at: new Date('2026-09-04T07:00:00Z').toISOString(),
  }
];

let inMemoryTransactions: Transaction[] = [...SEED_TRANSACTIONS];
let inMemoryBudgets: CategoryBudget[] = [...DEFAULT_BUDGETS];

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'cashflow.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(
        DATA_FILE,
        JSON.stringify(
          {
            transactions: SEED_TRANSACTIONS,
            budgets: DEFAULT_BUDGETS,
          },
          null,
          2
        )
      );
    }
  } catch {}
}

function loadFromFile() {
  try {
    ensureDataFile();
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (Array.isArray(data.transactions)) inMemoryTransactions = data.transactions;
      if (Array.isArray(data.budgets)) inMemoryBudgets = data.budgets;
    }
  } catch {}
}

function saveToFile() {
  try {
    ensureDataFile();
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        {
          transactions: inMemoryTransactions,
          budgets: inMemoryBudgets,
        },
        null,
        2
      )
    );
  } catch {}
}

loadFromFile();

// Filter helper by time period
export function filterTransactionsByPeriod(transactions: Transaction[], period: ReportingPeriod = 'month'): Transaction[] {
  const now = new Date(NOW);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000;

  return transactions.filter(t => {
    const tTime = new Date(t.date).getTime();
    const tDate = new Date(t.date);

    switch (period) {
      case 'today':
        return tTime >= startOfToday && tTime < endOfToday;

      case 'week': {
        // Last 7 days
        const sevenDaysAgo = startOfToday - 6 * 86400000;
        return tTime >= sevenDaysAgo && tTime < endOfToday;
      }

      case 'month':
        // Current Month (Nov 2026)
        return tDate.getFullYear() === now.getFullYear() && tDate.getMonth() === now.getMonth();

      case 'last_month': {
        // October 2026
        const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return tDate.getFullYear() === lastMonthDate.getFullYear() && tDate.getMonth() === lastMonthDate.getMonth();
      }

      case '2_months_ago': {
        // September 2026
        const twoMonthsAgoDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
        return tDate.getFullYear() === twoMonthsAgoDate.getFullYear() && tDate.getMonth() === twoMonthsAgoDate.getMonth();
      }

      case 'all':
      default:
        return true;
    }
  });
}

export async function getTransactions(period?: ReportingPeriod): Promise<Transaction[]> {
  const list = [...inMemoryTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  if (period) {
    return filterTransactionsByPeriod(list, period);
  }
  return list;
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
  const newTx: Transaction = {
    ...tx,
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString()
  };

  inMemoryTransactions.unshift(newTx);
  saveToFile();
  return newTx;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  inMemoryTransactions = inMemoryTransactions.filter(t => t.id !== id);
  saveToFile();
  return true;
}

export async function isDuplicateTransaction(
  reference?: string,
  amount?: number,
  merchant?: string
): Promise<boolean> {
  const txs = await getTransactions();
  if (reference) {
    const exists = txs.some(t => t.reference && t.reference.toLowerCase() === reference.toLowerCase());
    if (exists) return true;
  }
  return false;
}

export async function getBudgets(): Promise<CategoryBudget[]> {
  return [...inMemoryBudgets];
}

export async function saveBudgets(budgets: CategoryBudget[]): Promise<CategoryBudget[]> {
  inMemoryBudgets = budgets;
  saveToFile();
  return inMemoryBudgets;
}

// Compute dynamic reporting stats for any period: Today, Week, Month, Last Month, 2 Months Ago
export async function getCashFlowStats(period: ReportingPeriod = 'month'): Promise<CashFlowStats> {
  const allTransactions = await getTransactions();
  const budgets = await getBudgets();

  const periodTxs = filterTransactionsByPeriod(allTransactions, period);

  let totalInflow = 0;
  let totalOutflow = 0;
  const categorySpending: Record<string, number> = {};
  const categoryBudgetsMap: Record<string, number> = {};

  budgets.forEach(b => {
    categoryBudgetsMap[b.category] = b.monthly_limit;
  });

  periodTxs.forEach(t => {
    if (t.type === 'inflow') {
      totalInflow += t.amount;
    } else {
      totalOutflow += t.amount;
      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
    }
  });

  const netCashFlow = totalInflow - totalOutflow;
  const savingsRate = totalInflow > 0 ? Math.max(0, Math.round(((totalInflow - totalOutflow) / totalInflow) * 100)) : 0;

  // Category percentage of total expenses
  const categoryPercentages: Record<string, number> = {};
  for (const [cat, spent] of Object.entries(categorySpending)) {
    categoryPercentages[cat] = totalOutflow > 0 ? Math.round((spent / totalOutflow) * 100) : 0;
  }

  // Days calculation
  let daysInPeriod = 1;
  let periodLabel = 'Is Mahine (November)';

  switch (period) {
    case 'today':
      daysInPeriod = 1;
      periodLabel = 'Aaj (Today - 26 Nov)';
      break;
    case 'week':
      daysInPeriod = 7;
      periodLabel = 'Is Hafte (Last 7 Days)';
      break;
    case 'month':
      daysInPeriod = 26; // up to 26th of Nov
      periodLabel = 'Is Mahine (November 2026)';
      break;
    case 'last_month':
      daysInPeriod = 31;
      periodLabel = 'Pichla Mahina (October 2026)';
      break;
    case '2_months_ago':
      daysInPeriod = 30;
      periodLabel = '2 Mahine Pehle (September 2026)';
      break;
    case 'all':
      daysInPeriod = 90;
      periodLabel = 'All Time Reporting';
      break;
  }

  const dailyBurnRate = Math.round(totalOutflow / Math.max(1, daysInPeriod));
  const projectedMonthlyOutflow = dailyBurnRate * 30;

  // Comparison with previous period (e.g. Month vs Last Month)
  let comparison: CashFlowStats['comparison'];
  if (period === 'month') {
    const prevTxs = filterTransactionsByPeriod(allTransactions, 'last_month');
    let prevOutflow = 0;
    prevTxs.forEach(t => {
      if (t.type === 'outflow') prevOutflow += t.amount;
    });
    const diff = totalOutflow - prevOutflow;
    const pct = prevOutflow > 0 ? Math.abs(Math.round((diff / prevOutflow) * 100)) : 0;
    comparison = {
      prevOutflow,
      diffAmount: Math.abs(diff),
      percentageChange: pct,
      isHigher: diff > 0
    };
  }

  // Generate budget alerts
  const alerts: CashFlowStats['alerts'] = [];
  budgets.forEach(b => {
    const spent = categorySpending[b.category] || 0;
    const percentage = Math.round((spent / b.monthly_limit) * 100);
    if (percentage >= 100) {
      alerts.push({
        category: b.category,
        spent,
        limit: b.monthly_limit,
        percentage,
        level: 'danger'
      });
    } else if (percentage >= 80) {
      alerts.push({
        category: b.category,
        spent,
        limit: b.monthly_limit,
        percentage,
        level: 'warning'
      });
    }
  });

  return {
    period,
    periodLabel,
    totalInflow,
    totalOutflow,
    netCashFlow,
    savingsRate,
    dailyBurnRate,
    projectedMonthlyOutflow,
    transactionCount: periodTxs.length,
    categorySpending,
    categoryPercentages,
    categoryBudgets: categoryBudgetsMap,
    comparison,
    alerts
  };
}
