import { CreateTransactionDialog } from './create-transaction-dialog'
import { RefundTransactionDialog } from './refund-transaction-dialog'
import { TransactionDetailDialog } from './transaction-detail-dialog'
import { TransactionStatusDialog } from './transaction-status-dialog'

export function TransactionsDialogs() {
  return (
    <>
      <CreateTransactionDialog />
      <TransactionDetailDialog />
      <RefundTransactionDialog />
      <TransactionStatusDialog />
    </>
  )
}
