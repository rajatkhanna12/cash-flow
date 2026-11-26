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

// Current reference timestamp: 26 Nov 2026
const NOW = new Date('2026-11-26T10:30:00Z');

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

  // --- EARLIER THIS MONTH (Nov 2026) ---
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

  // --- PAST MONTHS (For Custom Date Range Testing) ---
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
    merchant: 'Diwali Festive Shopping',
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
    id: 'tx-sep-3',
    amount: 5100,
    type: 'outflow',
    category: 'Groceries',
    merchant: 'Local Supermarket & Blinkit',
    account: 'A/C **1234',
    reference: '433100300004',
    date: new Date('2026-09-15T15:00:00Z').toISOString(),
    created_at: new Date('2026-09-15T15:00:00Z').toISOString(),
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

// Filter function supporting: today, week, month, custom (From date - To date)
export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: ReportingPeriod = 'month',
  startDateStr?: string,
  endDateStr?: string
): Transaction[] {
  const now = new Date(NOW);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000 - 1;

  return transactions.filter(t => {
    const tTime = new Date(t.date).getTime();
    const tDate = new Date(t.date);

    switch (period) {
      case 'today':
        return tTime >= startOfToday && tTime <= endOfToday;

      case 'week': {
        // This Week: last 7 days including today
        const startOfWeek = startOfToday - 6 * 86400000;
        return tTime >= startOfWeek && tTime <= endOfToday;
      }

      case 'month':
        // Current Month (Nov 2026)
        return tDate.getFullYear() === now.getFullYear() && tDate.getMonth() === now.getMonth();

      case 'custom': {
        if (!startDateStr && !endDateStr) return true;
        const fromTime = startDateStr
          ? new Date(`${startDateStr}T00:00:00`).getTime()
          : 0;
        const toTime = endDateStr
          ? new Date(`${endDateStr}T23:59:59.999`).getTime()
          : Number.MAX_SAFE_INTEGER;
        return tTime >= fromTime && tTime <= toTime;
      }

      default:
        return true;
    }
  });
}

export async function getTransactions(
  period?: ReportingPeriod,
  startDate?: string,
  endDate?: string
): Promise<Transaction[]> {
  const list = [...inMemoryTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  if (period) {
    return filterTransactionsByPeriod(list, period, startDate, endDate);
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

// Compute Cash Flow statistics for Today, This Week, Current Month, or Custom Date Range
export async function getCashFlowStats(
  period: ReportingPeriod = 'month',
  startDateStr?: string,
  endDateStr?: string
): Promise<CashFlowStats> {
  const allTransactions = await getTransactions();
  const budgets = await getBudgets();

  const periodTxs = filterTransactionsByPeriod(allTransactions, period, startDateStr, endDateStr);

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

  const categoryPercentages: Record<string, number> = {};
  for (const [cat, spent] of Object.entries(categorySpending)) {
    categoryPercentages[cat] = totalOutflow > 0 ? Math.round((spent / totalOutflow) * 100) : 0;
  }

  let daysCount = 1;
  let periodLabel = 'Current Month (November)';

  switch (period) {
    case 'today':
      daysCount = 1;
      periodLabel = 'Today (26 Nov 2026)';
      break;
    case 'week':
      daysCount = 7;
      periodLabel = 'This Week (Past 7 Days)';
      break;
    case 'month':
      daysCount = 26;
      periodLabel = 'Current Month (Nov 2026)';
      break;
    case 'custom':
      if (startDateStr && endDateStr) {
        const d1 = new Date(startDateStr).getTime();
        const d2 = new Date(endDateStr).getTime();
        daysCount = Math.max(1, Math.round((d2 - d1) / 86400000) + 1);
        periodLabel = `${startDateStr} to ${endDateStr}`;
      } else {
        periodLabel = 'Custom Date Range';
      }
      break;
  }

  const dailyBurnRate = Math.round(totalOutflow / Math.max(1, daysCount));
  const projectedMonthlyOutflow = dailyBurnRate * 30;

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
    startDate: startDateStr,
    endDate: endDateStr,
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
    alerts
  };
}
