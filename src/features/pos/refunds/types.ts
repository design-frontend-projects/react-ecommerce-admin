export type RefundMethod = 'CASH' | 'CARD' | 'STORE_CREDIT' | 'OTHER';

export interface RefundItem {
  id: string; // ID of the refund item record
  saleItemId: string; // The original item from the sale
  productId: string;
  quantity: number;
  price: number;
  reason?: string;
  isRestockable: boolean;
}

export interface Refund {
  id: string;
  saleId: string;
  transactionNumber: string;
  amount: number;
  method: RefundMethod;
  notes?: string;
  processedBy: string; // Employee ID
  approvedBy?: string; // Manager ID
  createdAt: string;
  items: RefundItem[];
}

export interface SaleHistoryItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  refundedQuantity: number;
}

export interface SaleHistory {
  id: string;
  transactionNumber: string;
  amount: number;
  date: string;
  items: SaleHistoryItem[];
  paymentMethod: string;
}

export interface RefundDraft {
  saleId: string;
  items: {
    saleItemId: string;
    productId: string;
    quantity: number;
    isRestockable: boolean;
  }[];
  method: RefundMethod;
  notes?: string;
  managerPin?: string;
}
