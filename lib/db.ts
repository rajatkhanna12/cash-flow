import { Transaction, CategoryBudget, CashFlowStats, ReportingPeriod, MyAccount } from './types';
import fs from 'fs';
import path from 'path';
import { neon } from '@neondatabase/serverless';
import {
  isMssqlConfigured,
  mssqlGetTransactions,
  mssqlAddTransaction,
  mssqlUpdateTransaction,
  mssqlDeleteTransaction,
  mssqlClearAllTransactions,
  mssqlGetBudgets,
  mssqlSaveBudgets,
  mssqlGetMyAccounts,
  mssqlAddMyAccount,
  mssqlDeleteMyAccount
} from './mssql';

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

// Fallback in-memory state
let inMemoryTransactions: Transaction[] = [];
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

// 🚀 PostgreSQL (Neon / Supabase / Vercel Postgres) Connection
function isPostgresConfigured() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return false;
  return dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
}

function getSql() {
  if (!isPostgresConfigured()) return null;
  return neon(process.env.DATABASE_URL!);
}

let dbInitialized = false;
async function ensureDbInitialized() {
  const sql = getSql();
  if (!sql || dbInitialized) return;

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        merchant TEXT NOT NULL,
        account TEXT,
        reference TEXT,
        raw_sms TEXT,
        sender TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS my_accounts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        identifier TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS budgets (
        category TEXT PRIMARY KEY,
        monthly_limit NUMERIC NOT NULL
      );
    `;

    dbInitialized = true;
  } catch (err) {
    console.error('Error initializing PostgreSQL tables:', err);
  }
}

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
        const weekAgo = new Date(now.getTime() - 7 * 86400000).getTime();
        return tTime >= weekAgo && tTime <= now.getTime();
      }
      case 'month':
        return tDate.getMonth() === now.getMonth() && tDate.getFullYear() === now.getFullYear();
      case 'custom':
        if (startDateStr && endDateStr) {
          const start = new Date(startDateStr).getTime();
          const end = new Date(endDateStr).setHours(23, 59, 59, 999);
          return tTime >= start && tTime <= end;
        }
        return true;
      default:
        return true;
    }
  });
}

export async function getTransactions(
  period?: ReportingPeriod,
  startDateStr?: string,
  endDateStr?: string
): Promise<Transaction[]> {
  // 1. Check SQL Server
  if (isMssqlConfigured()) {
    try {
      let list = await mssqlGetTransactions();
      if (period) {
        list = filterTransactionsByPeriod(list, period, startDateStr, endDateStr);
      }
      return list;
    } catch (err) {
      console.error('MSSQL getTransactions error:', err);
    }
  }

  // 2. Check Postgres
  const sql = getSql();
  if (sql) {
    try {
      await ensureDbInitialized();
      const rows = await sql`
        SELECT id, date, amount, type, category, merchant, account, reference, raw_sms, sender, notes, created_at
        FROM transactions
        ORDER BY date DESC, created_at DESC;
      `;
      let txs: Transaction[] = rows.map((r: any) => ({
        id: r.id,
        date: r.date,
        amount: Number(r.amount),
        type: r.type as 'inflow' | 'outflow' | 'transfer',
        category: r.category,
        merchant: r.merchant,
        account: r.account || undefined,
        reference: r.reference || undefined,
        raw_sms: r.raw_sms || undefined,
        sender: r.sender || undefined,
        notes: r.notes || undefined,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString()
      }));
      if (period) {
        txs = filterTransactionsByPeriod(txs, period, startDateStr, endDateStr);
      }
      return txs;
    } catch (err) {
      console.error('Error fetching transactions from Postgres:', err);
    }
  }

  // 3. Fallback
  loadFromFile();
  let list = [...inMemoryTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (period) {
    list = filterTransactionsByPeriod(list, period, startDateStr, endDateStr);
  }
  return list;
}

export async function addTransaction(transaction: Omit<Transaction, 'id'>): Promise<Transaction> {
  const newTx: Transaction = {
    ...transaction,
    id: `tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    created_at: transaction.created_at || new Date().toISOString()
  };

  // 1. Check SQL Server
  if (isMssqlConfigured()) {
    try {
      await mssqlAddTransaction(newTx);
      return newTx;
    } catch (err) {
      console.error('MSSQL addTransaction error:', err);
    }
  }

  // 2. Check Postgres
  const sql = getSql();
  if (sql) {
    try {
      await ensureDbInitialized();
      await sql`
        INSERT INTO transactions (id, date, amount, type, category, merchant, account, reference, raw_sms, sender, notes)
        VALUES (
          ${newTx.id},
          ${newTx.date},
          ${newTx.amount},
          ${newTx.type},
          ${newTx.category},
          ${newTx.merchant},
          ${newTx.account || null},
          ${newTx.reference || null},
          ${newTx.raw_sms || null},
          ${newTx.sender || null},
          ${newTx.notes || null}
        );
      `;
      return newTx;
    } catch (err) {
      console.error('Error inserting transaction into Postgres:', err);
    }
  }

  // 3. Fallback
  inMemoryTransactions.unshift(newTx);
  saveToFile();
  return newTx;
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
  // 1. Check SQL Server
  if (isMssqlConfigured()) {
    try {
      await mssqlUpdateTransaction(id, updates);
      const all = await mssqlGetTransactions();
      return all.find(t => t.id === id) || null;
    } catch (err) {
      console.error('MSSQL updateTransaction error:', err);
    }
  }

  // 2. Check Postgres
  const sql = getSql();
  if (sql) {
    try {
      await ensureDbInitialized();
      const existing = await sql`SELECT * FROM transactions WHERE id = ${id};`;
      if (existing.length === 0) return null;

      const current = existing[0];
      const updatedType = updates.type !== undefined ? updates.type : current.type;
      const updatedCategory = updates.category !== undefined ? updates.category : current.category;
      const updatedMerchant = updates.merchant !== undefined ? updates.merchant : current.merchant;
      const updatedAmount = updates.amount !== undefined ? updates.amount : current.amount;
      const updatedNotes = updates.notes !== undefined ? updates.notes : current.notes;

      await sql`
        UPDATE transactions
        SET type = ${updatedType}, category = ${updatedCategory}, merchant = ${updatedMerchant}, amount = ${updatedAmount}, notes = ${updatedNotes}
        WHERE id = ${id};
      `;

      return {
        id,
        date: current.date,
        amount: Number(updatedAmount),
        type: updatedType,
        category: updatedCategory,
        merchant: updatedMerchant,
        account: current.account,
        reference: current.reference,
        notes: updatedNotes,
        created_at: current.created_at
      };
    } catch (err) {
      console.error('Error updating transaction in Postgres:', err);
    }
  }

  const idx = inMemoryTransactions.findIndex(t => t.id === id);
  if (idx === -1) return null;
  inMemoryTransactions[idx] = { ...inMemoryTransactions[idx], ...updates };
  saveToFile();
  return inMemoryTransactions[idx];
}

export async function deleteTransaction(id: string): Promise<boolean> {
  // 1. Check SQL Server
  if (isMssqlConfigured()) {
    try {
      await mssqlDeleteTransaction(id);
      return true;
    } catch (err) {
      console.error('MSSQL deleteTransaction error:', err);
    }
  }

  // 2. Check Postgres
  const sql = getSql();
  if (sql) {
    try {
      await ensureDbInitialized();
      await sql`DELETE FROM transactions WHERE id = ${id};`;
      return true;
    } catch (err) {
      console.error('Error deleting transaction in Postgres:', err);
    }
  }

  inMemoryTransactions = inMemoryTransactions.filter(t => t.id !== id);
  saveToFile();
  return true;
}

export async function clearAllTransactions(): Promise<boolean> {
  // 1. Check SQL Server
  if (isMssqlConfigured()) {
    try {
      await mssqlClearAllTransactions();
      return true;
    } catch (err) {
      console.error('MSSQL clearAllTransactions error:', err);
    }
  }

  // 2. Check Postgres
  const sql = getSql();
  if (sql) {
    try {
      await ensureDbInitialized();
      await sql`DELETE FROM transactions;`;
      return true;
    } catch (err) {
      console.error('Error clearing transactions in Postgres:', err);
    }
  }

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
  // 1. Check SQL Server
  if (isMssqlConfigured()) {
    try {
      const b = await mssqlGetBudgets();
      if (b.length > 0) return b;
      await mssqlSaveBudgets(DEFAULT_BUDGETS);
      return [...DEFAULT_BUDGETS];
    } catch (err) {
      console.error('MSSQL getBudgets error:', err);
    }
  }

  // 2. Check Postgres
  const sql = getSql();
  if (sql) {
    try {
      await ensureDbInitialized();
      const rows = await sql`SELECT category, monthly_limit as "monthly_limit" FROM budgets;`;
      if (rows.length > 0) {
        return rows.map((r: any) => ({
          category: r.category,
          monthly_limit: Number(r.monthly_limit)
        }));
      } else {
        for (const b of DEFAULT_BUDGETS) {
          await sql`
            INSERT INTO budgets (category, monthly_limit)
            VALUES (${b.category}, ${b.monthly_limit})
            ON CONFLICT (category) DO NOTHING;
          `;
        }
        return [...DEFAULT_BUDGETS];
      }
    } catch (err) {
      console.error('Error fetching budgets from Postgres:', err);
    }
  }

  return [...inMemoryBudgets];
}

export async function saveBudgets(budgets: CategoryBudget[]): Promise<CategoryBudget[]> {
  // 1. Check SQL Server
  if (isMssqlConfigured()) {
    try {
      await mssqlSaveBudgets(budgets);
      return budgets;
    } catch (err) {
      console.error('MSSQL saveBudgets error:', err);
    }
  }

  // 2. Check Postgres
  const sql = getSql();
  if (sql) {
    try {
      await ensureDbInitialized();
      for (const b of budgets) {
        await sql`
          INSERT INTO budgets (category, monthly_limit)
          VALUES (${b.category}, ${b.monthly_limit})
          ON CONFLICT (category) DO UPDATE SET monthly_limit = ${b.monthly_limit};
        `;
      }
      return budgets;
    } catch (err) {
      console.error('Error saving budgets to Postgres:', err);
    }
  }

  inMemoryBudgets = budgets;
  saveToFile();
  return inMemoryBudgets;
}

export async function getMyAccounts(): Promise<MyAccount[]> {
  // 1. Check SQL Server
  if (isMssqlConfigured()) {
    try {
      return await mssqlGetMyAccounts();
    } catch (err) {
      console.error('MSSQL getMyAccounts error:', err);
    }
  }

  // 2. Check Postgres
  const sql = getSql();
  if (sql) {
    try {
      await ensureDbInitialized();
      const rows = await sql`SELECT id, name, identifier FROM my_accounts;`;
      return rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        identifier: r.identifier
      }));
    } catch (err) {
      console.error('Error fetching my_accounts from Postgres:', err);
    }
  }

  loadFromFile();
  return [...inMemoryMyAccounts];
}

export async function addMyAccount(account: Omit<MyAccount, 'id'>): Promise<MyAccount> {
  const newAcc: MyAccount = {
    ...account,
    id: `acc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
  };

  // 1. Check SQL Server
  if (isMssqlConfigured()) {
    try {
      await mssqlAddMyAccount(newAcc);
      return newAcc;
    } catch (err) {
      console.error('MSSQL addMyAccount error:', err);
    }
  }

  // 2. Check Postgres
  const sql = getSql();
  if (sql) {
    try {
      await ensureDbInitialized();
      await sql`
        INSERT INTO my_accounts (id, name, identifier)
        VALUES (${newAcc.id}, ${newAcc.name}, ${newAcc.identifier});
      `;
      return newAcc;
    } catch (err) {
      console.error('Error inserting my_account into Postgres:', err);
    }
  }

  inMemoryMyAccounts.push(newAcc);
  saveToFile();
  return newAcc;
}

export async function deleteMyAccount(id: string): Promise<boolean> {
  // 1. Check SQL Server
  if (isMssqlConfigured()) {
    try {
      await mssqlDeleteMyAccount(id);
      return true;
    } catch (err) {
      console.error('MSSQL deleteMyAccount error:', err);
    }
  }

  // 2. Check Postgres
  const sql = getSql();
  if (sql) {
    try {
      await ensureDbInitialized();
      await sql`DELETE FROM my_accounts WHERE id = ${id};`;
      return true;
    } catch (err) {
      console.error('Error deleting my_account from Postgres:', err);
    }
  }

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
