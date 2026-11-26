export type TransactionType = 'inflow' | 'outflow' | 'transfer';

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

export interface MyAccount {
  id: string;
  name: string; // e.g. "HDFC Main", "SBI Savings", "GPay ID"
  identifier: string; // e.g. "rajat@okhdfcbank", "1234", "9876543210@upi"
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

export type ReportingPeriod = 'today' | 'week' | 'month' | 'custom';

export interface CashFlowStats {
  period: ReportingPeriod;
  periodLabel: string;
  startDate?: string;
  endDate?: string;
  totalInflow: number;
  totalOutflow: number;
  totalTransfers: number;
  netCashFlow: number;
  savingsRate: number; // percentage
  dailyBurnRate: number;
  projectedMonthlyOutflow: number;
  transactionCount: number;
  categorySpending: Record<string, number>;
  categoryPercentages: Record<string, number>;
  categoryBudgets: Record<string, number>;
  comparison?: {
    prevOutflow: number;
    diffAmount: number;
    percentageChange: number;
    isHigher: boolean;
  };
  alerts: Array<{
    category: string;
    spent: number;
    limit: number;
    percentage: number;
    level: 'warning' | 'danger';
  }>;
}
