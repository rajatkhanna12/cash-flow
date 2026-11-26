import { Transaction, CategoryBudget, CashFlowStats, ReportingPeriod, MyAccount } from './types';
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

export const DEFAULT_MY_ACCOUNTS: MyAccount[] = [];

// Clean initial production state: 0 dummy transactions
const SEED_TRANSACTIONS: Transaction[] = [];

let inMemoryTransactions: Transaction[] = [...SEED_TRANSACTIONS];
let inMemoryBudgets: CategoryBudget[] = [...DEFAULT_BUDGETS];
let inMemoryMyAccounts: MyAccount[] = [...DEFAULT_MY_ACCOUNTS];

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
            transactions: [],
            budgets: DEFAULT_BUDGETS,
            myAccounts: []
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
      if (Array.isArray(data.myAccounts)) inMemoryMyAccounts = data.myAccounts;
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
          myAccounts: inMemoryMyAccounts
        },
        null,
        2
      )
    );
  } catch {}
}

loadFromFile();

// Filter helper
export function filterTransactionsByPeriod(
  transactions: Transaction[],
  period: ReportingPeriod = 'month',
  startDateStr?: string,
  endDateStr?: string
): Transaction[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfToday = startOfToday + 86400000 - 1;

  return transactions.filter(t => {
    const tTime = new Date(t.date).getTime();
    const tDate = new Date(t.date);

    switch (period) {
      case 'today':
        return tTime >= startOfToday && tTime <= endOfToday;

      case 'week': {
        const startOfWeek = startOfToday - 6 * 86400000;
        return tTime >= startOfWeek && tTime <= endOfToday;
      }

      case 'month':
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

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
  const idx = inMemoryTransactions.findIndex(t => t.id === id);
  if (idx === -1) return null;
  inMemoryTransactions[idx] = { ...inMemoryTransactions[idx], ...updates };
  saveToFile();
  return inMemoryTransactions[idx];
}

export async function deleteTransaction(id: string): Promise<boolean> {
  inMemoryTransactions = inMemoryTransactions.filter(t => t.id !== id);
  saveToFile();
  return true;
}

export async function clearAllTransactions(): Promise<boolean> {
  inMemoryTransactions = [];
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

export async function getMyAccounts(): Promise<MyAccount[]> {
  return [...inMemoryMyAccounts];
}

export async function addMyAccount(account: Omit<MyAccount, 'id'>): Promise<MyAccount> {
  const newAcc: MyAccount = {
    ...account,
    id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
  };
  inMemoryMyAccounts.push(newAcc);
  saveToFile();
  return newAcc;
}

export async function deleteMyAccount(id: string): Promise<boolean> {
  inMemoryMyAccounts = inMemoryMyAccounts.filter(a => a.id !== id);
  saveToFile();
  return true;
}

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
  let totalTransfers = 0;
  const categorySpending: Record<string, number> = {};
  const categoryBudgetsMap: Record<string, number> = {};

  budgets.forEach(b => {
    categoryBudgetsMap[b.category] = b.monthly_limit;
  });

  periodTxs.forEach(t => {
    if (t.type === 'transfer' || t.category === 'Self Transfer') {
      totalTransfers += t.amount;
      return;
    }

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

  const now = new Date();
  const currentMonthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  let daysCount = 1;
  let periodLabel = `Current Month (${currentMonthName})`;

  switch (period) {
    case 'today':
      daysCount = 1;
      periodLabel = `Today (${now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})`;
      break;
    case 'week':
      daysCount = 7;
      periodLabel = 'This Week (Past 7 Days)';
      break;
    case 'month':
      daysCount = Math.max(1, now.getDate());
      periodLabel = `Current Month (${currentMonthName})`;
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
    totalTransfers,
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
