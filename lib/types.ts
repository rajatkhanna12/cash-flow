export type TransactionType = 'inflow' | 'outflow';

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  merchant: string;
  account?: string;
  reference?: string;
  raw_sms?: string;
  sender?: string;
  date: string; // ISO string
  notes?: string;
  created_at: string;
}

export interface CategoryBudget {
  category: string;
  monthly_limit: number;
}

export interface SMSParseResult {
  success: boolean;
  amount?: number;
  type?: TransactionType;
  category?: string;
  merchant?: string;
  account?: string;
  reference?: string;
  date?: string;
  error?: string;
  confidence: number;
}

export interface CashFlowStats {
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  savingsRate: number; // percentage
  dailyBurnRate: number;
  projectedMonthlyOutflow: number;
  categorySpending: Record<string, number>;
  categoryBudgets: Record<string, number>;
  alerts: Array<{
    category: string;
    spent: number;
    limit: number;
    percentage: number;
    level: 'warning' | 'danger';
  }>;
}
