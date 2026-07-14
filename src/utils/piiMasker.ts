export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const [localPart, domain] = email.split('@')
  if (!domain) return email // Invalid format
  const maskedLocal =
    localPart.length > 2 ? `${localPart.substring(0, 2)}***` : '***'
  return `${maskedLocal}@${domain}`
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  if (phone.length <= 4) return '***'
  return `***-***-${phone.slice(-4)}`
}
