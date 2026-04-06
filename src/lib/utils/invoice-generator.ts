export function generateInvoiceNumber(): string {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  // Using Math.random for the suffix for now, in a real highly concurrent system 
  // you might want to use a sequence generator from the database
  const randomStr = Math.floor(1000 + Math.random() * 9000).toString()
  return `SAL-${year}${month}${day}-${randomStr}`
}
