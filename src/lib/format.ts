export function truncateAddress(address: string, keep = 4): string {
  if (keep <= 0 || address.length <= keep * 2 + 1) return address
  return `${address.slice(0, keep)}…${address.slice(-keep)}`
}
