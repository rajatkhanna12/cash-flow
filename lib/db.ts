import { Transaction, CategoryBudget, CashFlowStats } from './types';
import fs from 'fs';
import path from 'path';

// Default initial category budgets
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

// Sample seed data to showcase the dashboard
const SEED_TRANSACTIONS: Transaction[] = [
  {
    id: 'seed-1',
    amount: 85000,
    type: 'inflow',
    category: 'Salary & Income',
    merchant: 'Monthly Salary / Client Retainer',
    account: 'A/C **1234',
    reference: '433100000001',
    date: new Date(Date.now() - 20 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
    raw_sms: 'HDFC Bank: Rs 85,000.00 credited to a/c **1234 on 06-Nov-26. Salary Credit.'
  },
  {
    id: 'seed-2',
    amount: 15000,
    type: 'inflow',
    category: 'Salary & Income',
    merchant: 'Freelance Project Payout',
    account: 'A/C **1234',
    reference: '433100000002',
    date: new Date(Date.now() - 10 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    raw_sms: 'Your A/C **1234 is credited by Rs 15,000.00 from Upwork VPA.'
  },
  {
    id: 'seed-3',
    amount: 7200,
    type: 'outflow',
    category: 'Food & Dining',
    merchant: 'Swiggy & Zomato Orders',
    account: 'A/C **1234',
    reference: '433100000003',
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    raw_sms: 'Rs 450.00 debited from HDFC A/C **1234 to SWIGGY. Ref 433100000003'
  },
  {
    id: 'seed-4',
    amount: 5400,
    type: 'outflow',
    category: 'Groceries',
    merchant: 'Blinkit & Zepto',
    account: 'A/C **1234',
    reference: '433100000004',
    date: new Date(Date.now() - 4 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    raw_sms: 'Sent Rs. 650.00 to Blinkit from A/C **1234'
  },
  {
    id: 'seed-5',
    amount: 3200,
    type: 'outflow',
    category: 'Travel & Fuel',
    merchant: 'Uber Rides & Petrol',
    account: 'A/C **1234',
    reference: '433100000005',
    date: new Date(Date.now() - 6 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    raw_sms: 'INR 420.00 debited from A/C **1234 at UBER INDIA.'
  },
  {
    id: 'seed-6',
    amount: 8900,
    type: 'outflow',
    category: 'Shopping',
    merchant: 'Amazon India',
    account: 'A/C **1234',
    reference: '433100000006',
    date: new Date(Date.now() - 8 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    raw_sms: 'Paid Rs 2,499.00 to Amazon Pay from A/C **1234'
  },
  {
    id: 'seed-7',
    amount: 3100,
    type: 'outflow',
    category: 'Bills & Utilities',
    merchant: 'Electricity & Wifi Recharge',
    account: 'A/C **1234',
    reference: '433100000007',
    date: new Date(Date.now() - 15 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    raw_sms: 'Airtel Broadband bill payment of Rs 1,179 debited from A/C **1234'
  },
  {
    id: 'seed-8',
    amount: 1999,
    type: 'outflow',
    category: 'Entertainment & Subs',
    merchant: 'Netflix & Spotify',
    account: 'A/C **1234',
    reference: '433100000008',
    date: new Date(Date.now() - 18 * 86400000).toISOString(),
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    raw_sms: 'Your A/C **1234 is debited with Rs 649 for Netflix subscription'
  }
];

// In-memory cache for fast access
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
  } catch {
    // If filesystem is read-only (e.g. standard Vercel lambda outside /tmp), rely on memory or DATABASE_URL
  }
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
  } catch {
    // Ignore read errors
  }
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
  } catch {
    // Ignore write errors
  }
}

// Initialize on first import
loadFromFile();

export async function getTransactions(): Promise<Transaction[]> {
  // If PostgreSQL DATABASE_URL is provided, we can fetch from PostgreSQL
  if (process.env.DATABASE_URL) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);
      // Auto-create table if not exists
      await sql`
        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY,
          amount NUMERIC NOT NULL,
          type TEXT NOT NULL,
          category TEXT NOT NULL,
          merchant TEXT NOT NULL,
          account TEXT,
          reference TEXT,
          raw_sms TEXT,
          sender TEXT,
          date TIMESTAMPTZ NOT NULL,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      const rows = await sql`SELECT * FROM transactions ORDER BY date DESC`;
      return rows.map((r: any) => ({
        id: r.id,
        amount: parseFloat(r.amount),
        type: r.type,
        category: r.category,
        merchant: r.merchant,
        account: r.account,
        reference: r.reference,
        raw_sms: r.raw_sms,
        sender: r.sender,
        date: new Date(r.date).toISOString(),
        notes: r.notes,
        created_at: new Date(r.created_at).toISOString()
      }));
    } catch (err) {
      console.error('Neon DB fetch failed, falling back to local storage:', err);
    }
  }

  return [...inMemoryTransactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export async function addTransaction(tx: Omit<Transaction, 'id' | 'created_at'>): Promise<Transaction> {
  const newTx: Transaction = {
    ...tx,
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    created_at: new Date().toISOString()
  };

  if (process.env.DATABASE_URL) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);
      await sql`
        INSERT INTO transactions (id, amount, type, category, merchant, account, reference, raw_sms, sender, date, notes, created_at)
        VALUES (${newTx.id}, ${newTx.amount}, ${newTx.type}, ${newTx.category}, ${newTx.merchant}, ${newTx.account || null}, ${newTx.reference || null}, ${newTx.raw_sms || null}, ${newTx.sender || null}, ${newTx.date}, ${newTx.notes || null}, ${newTx.created_at})
      `;
    } catch (err) {
      console.error('Neon DB insert failed, saving locally:', err);
    }
  }

  inMemoryTransactions.unshift(newTx);
  saveToFile();
  return newTx;
}

export async function deleteTransaction(id: string): Promise<boolean> {
  if (process.env.DATABASE_URL) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.DATABASE_URL);
      await sql`DELETE FROM transactions WHERE id = ${id}`;
    } catch (err) {
      console.error('Neon DB delete failed:', err);
    }
  }

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
  if (amount && merchant) {
    // Check if same amount and merchant occurred within past 10 minutes
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const exists = txs.some(t => {
      const txTime = new Date(t.date).getTime();
      return t.amount === amount && t.merchant.toLowerCase() === merchant.toLowerCase() && txTime > tenMinAgo;
    });
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

export async function getCashFlowStats(): Promise<CashFlowStats> {
  const transactions = await getTransactions();
  const budgets = await getBudgets();

  let totalInflow = 0;
  let totalOutflow = 0;
  const categorySpending: Record<string, number> = {};
  const categoryBudgetsMap: Record<string, number> = {};

  budgets.forEach(b => {
    categoryBudgetsMap[b.category] = b.monthly_limit;
  });

  // Calculate current month statistics
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  transactions.forEach(t => {
    const txDate = new Date(t.date);
    // Include transactions in current month
    if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
      if (t.type === 'inflow') {
        totalInflow += t.amount;
      } else {
        totalOutflow += t.amount;
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      }
    }
  });

  const netCashFlow = totalInflow - totalOutflow;
  const savingsRate = totalInflow > 0 ? Math.max(0, Math.round(((totalInflow - totalOutflow) / totalInflow) * 100)) : 0;

  const dayOfMonth = Math.max(1, now.getDate());
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyBurnRate = Math.round(totalOutflow / dayOfMonth);
  const projectedMonthlyOutflow = dailyBurnRate * daysInMonth;

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
    totalInflow,
    totalOutflow,
    netCashFlow,
    savingsRate,
    dailyBurnRate,
    projectedMonthlyOutflow,
    categorySpending,
    categoryBudgets: categoryBudgetsMap,
    alerts
  };
}
