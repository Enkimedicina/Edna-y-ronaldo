export interface Debt {
  id: string;
  name: string;
  initialAmount: number;
  currentAmount: number;
  minPayment: number;
  color: string;
  dueDay?: number; // Day of month (1-31)
  interestRate?: number; // Annual interest rate percentage
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  category: 'Services' | 'Food' | 'Nanny' | 'Other';
  frequency?: 'Monthly' | 'Bi-weekly' | 'Weekly'; // New field
  dueDay?: number; // 1-31 for Monthly/Bi-weekly, 0-6 for Weekly (0=Sunday)
}

export interface Income {
  id: string;
  source: string; // "Edna" or "Ronaldo"
  amount: number;
}

export interface PaymentRecord {
  id: string;
  debtId: string;
  amount: number;
  date: string;
  recordedBy?: string; // New field to track who paid
}

export interface FinancialState {
  debts: Debt[];
  expenses: Expense[];
  incomes: Income[];
  payments: PaymentRecord[];
  history: { date: string; totalDebt: number }[];
}

export interface NotificationItem {
  id: string;
  type: 'warning' | 'info';
  title: string;
  message: string;
}

export type UserProfile = 'Edna' | 'Ronaldo' | 'Invitado';

export enum View {
  DASHBOARD = 'DASHBOARD',
  DEBTS = 'DEBTS',
  BUDGET = 'BUDGET',
  PROJECTION = 'PROJECTION',
  ADVISOR = 'ADVISOR'
}