export function formatCurrency(value: number) {
  return `$${Math.round(Number(value || 0))}`
}

export function formatStage(stage: string) {
  return String(stage || "waiting").toUpperCase()
}

export function formatDateTime(value: number | string | Date) {
  return new Date(value).toLocaleString()
}
