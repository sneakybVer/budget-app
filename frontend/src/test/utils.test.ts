import { describe, it, expect } from "vitest"
import { fmt, nextNMonths, monthsToTarget, monthsFromTo } from "../utils"

// ── fmt ──────────────────────────────────────────────────────────────────────

describe("fmt", () => {
  it("formats zero as £0", () => {
    expect(fmt(0)).toBe("£0")
  })

  it("formats a plain integer", () => {
    expect(fmt(1000)).toBe("£1,000")
  })

  it("rounds a float to the nearest integer", () => {
    expect(fmt(1234.6)).toBe("£1,235")
    expect(fmt(1234.4)).toBe("£1,234")
  })

  it("formats large numbers with comma separators", () => {
    expect(fmt(200000)).toBe("£200,000")
  })

  it("handles negative values (£ prefix before sign)", () => {
    // fmt is a display formatter, not an accounting formatter:
    // "£" is prepended to the stringified number including its sign
    expect(fmt(-500)).toBe("£-500")
  })
})

// ── nextNMonths ───────────────────────────────────────────────────────────────

describe("nextNMonths", () => {
  it("returns exactly n entries", () => {
    expect(nextNMonths(6, new Date(2026, 0, 1))).toHaveLength(6)
  })

  it("first entry matches the fromDate's year and month", () => {
    const result = nextNMonths(3, new Date(2026, 2, 15)) // March 2026
    expect(result[0].year).toBe(2026)
    expect(result[0].month).toBe(2) // 0-indexed
  })

  it("rolls over the year correctly", () => {
    const result = nextNMonths(3, new Date(2025, 11, 1)) // Dec 2025
    expect(result[0].month).toBe(11) // Dec
    expect(result[1].month).toBe(0)  // Jan
    expect(result[1].year).toBe(2026)
    expect(result[2].month).toBe(1)  // Feb
  })

  it("each entry has label, year and month properties", () => {
    nextNMonths(2, new Date(2026, 0, 1)).forEach((entry) => {
      expect(entry).toHaveProperty("label")
      expect(entry).toHaveProperty("year")
      expect(entry).toHaveProperty("month")
    })
  })
})

// ── monthsToTarget ────────────────────────────────────────────────────────────

describe("monthsToTarget", () => {
  it("returns null when target is null", () => {
    expect(monthsToTarget(50000, null, 500)).toBeNull()
  })

  it("returns null when target is zero (falsy)", () => {
    expect(monthsToTarget(0, 0, 500)).toBeNull()
  })

  it("returns null when current already equals target", () => {
    expect(monthsToTarget(200000, 200000, 500)).toBeNull()
  })

  it("returns null when current exceeds target", () => {
    expect(monthsToTarget(210000, 200000, 500)).toBeNull()
  })

  it("returns null when monthly rate is zero", () => {
    expect(monthsToTarget(50000, 200000, 0)).toBeNull()
  })

  it("returns null when monthly rate is negative", () => {
    expect(monthsToTarget(50000, 200000, -100)).toBeNull()
  })

  it("returns ceiling of required months", () => {
    // (200000 - 59700) / 600 = 233.83... → ceil = 234
    expect(monthsToTarget(59700, 200000, 600)).toBe(234)
  })

  it("returns exactly 1 when one month is enough", () => {
    expect(monthsToTarget(199500, 200000, 600)).toBe(1)
  })
})

// ── monthsFromTo ──────────────────────────────────────────────────────────────

describe("monthsFromTo", () => {
  it("returns a single label when start and end are the same month", () => {
    const labels = monthsFromTo(new Date(2026, 0, 1), new Date(2026, 0, 31))
    expect(labels).toHaveLength(1)
  })

  it("returns correct count for a multi-month range", () => {
    // Jan → Jun 2026 = 6 months
    const labels = monthsFromTo(new Date(2026, 0, 1), new Date(2026, 5, 1))
    expect(labels).toHaveLength(6)
  })

  it("spans year boundaries correctly", () => {
    // Nov 2025 → Feb 2026 = 4 months
    const labels = monthsFromTo(new Date(2025, 10, 1), new Date(2026, 1, 1))
    expect(labels).toHaveLength(4)
  })

  it("labels contain both a month name and a year", () => {
    const labels = monthsFromTo(new Date(2026, 0, 1), new Date(2026, 1, 1))
    // Locale-dependent, but both should include "2026"
    labels.forEach((l) => expect(l).toContain("2026"))
  })
})
