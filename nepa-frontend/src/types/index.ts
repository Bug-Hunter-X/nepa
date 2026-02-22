export type TransactionStatus = 'idle' | 'loading' | 'success' | 'error';

export enum TransactionStep {
  IDLE = 'idle',
  CONNECTING = 'connecting',
  SIGNING = 'signing',
  SUBMITTING = 'submitting',
  FINALIZING = 'finalizing',
  COMPLETE = 'complete'
}

export type WalletProvider = 'freighter' | 'albedo' | 'walletconnect';

export interface TransactionHistory {
  id: string;
  amount: string;
  meter: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

export interface WalletState {
  address: string | null;
  balance: string;
  provider: WalletProvider | null;
  status: TransactionStatus;
  currentStep: TransactionStep;
  txHash: string | null;
  history: TransactionHistory[];
  error: string | null;
}

export interface StellarState {
  address: string | null;
  status: TransactionStatus;
  error: string | null;
}

export interface PaymentFormData {
  destination: string;
  amount: string;
  meterNumber?: string;
}
