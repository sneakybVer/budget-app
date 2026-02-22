/**
 * Shared pure utility functions used by both Progress and Forecast pages.
 * Living here makes them unit-testable without any DOM / React setup.
 */

/** Format a number as a rounded pound-sterling amount, e.g. £1,234 */
export function fmt(n: number): string {
  return "£" + Math.round(n).toLocaleString()
}

/** Build N monthly descriptor objects starting from `fromDate` (defaults to today). */
export function nextNMonths(
  n: number,
  fromDate = new Date()
): Array<{ label: string; year: number; month: number }> {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(fromDate.getFullYear(), fromDate.getMonth() + i, 1)
    return {
      label: d.toLocaleString(undefined, { month: "short", year: "2-digit" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    }
  })
}

/** Estimate months until target is reached given current total and monthly rate. */
export function monthsToTarget(
  current: number,
  target: number | null,
  monthlyRate: number
): number | null {
  if (!target || target <= current || monthlyRate <= 0) return null
  return Math.ceil((target - current) / monthlyRate)
}

/**
 * Build "MMM YYYY" labels for every calendar month from `start` to `end`
 * (inclusive).
 */
export function monthsFromTo(start: Date, end: Date): string[] {
  const labels: string[] = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const e = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cur <= e) {
    labels.push(cur.toLocaleString(undefined, { month: "short", year: "numeric" }))
    cur.setMonth(cur.getMonth() + 1)
  }
  return labels
}
