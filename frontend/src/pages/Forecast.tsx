import React, { useEffect, useState, useMemo } from "react"
import axios from "axios"
import { fmt, nextNMonths, monthsToTarget } from "../utils"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts"

const API = `http://${window.location.hostname}:8000`

type FutureContribution = {
  id: number
  account_id?: number | null
  amount: number
  date?: string | null
  recurring: boolean
}

type Notice = { type: "success" | "error"; msg: string }

export default function Forecast() {
  const [futureContributions, setFutureContributions] = useState<FutureContribution[]>([])
  const [accounts, setAccounts] = useState<{ id: number; name: string }[]>([])
  const [summaryTotal, setSummaryTotal] = useState<number>(0)
  const [target, setTarget] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)

  // Recurring monthly amount per account (editable)
  const [recurringEdit, setRecurringEdit] = useState<Record<number, string>>({})

  // One-off form
  const [oneOffAccount, setOneOffAccount] = useState<string>("")
  const [oneOffAmount, setOneOffAmount] = useState<string>("")
  const [oneOffDate, setOneOffDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )

  // Per-account what-if monthly amounts (absolute £ values)
  const [whatIfAmounts, setWhatIfAmounts] = useState<Record<number, string>>({})

  // Forecast timeframe
  const [forecastMonths, setForecastMonths] = useState<number>(12)

  function notify(type: Notice["type"], msg: string) {
    setNotice({ type, msg })
    setTimeout(() => setNotice(null), 3500)
  }

  async function loadAll() {
    const [fcRes, acctRes, sumRes] = await Promise.all([
      axios.get(`${API}/future_contributions`),
      axios.get(`${API}/accounts`),
      axios.get(`${API}/summary`),
    ])
    setFutureContributions(fcRes.data)
    setAccounts(acctRes.data)
    setSummaryTotal(sumRes.data.total ?? 0)
    setTarget(sumRes.data.target ?? null)
    if (!oneOffAccount && acctRes.data.length) {
      setOneOffAccount(String(acctRes.data[0].id))
    }
  }

  useEffect(() => {
    loadAll().catch(console.error).finally(() => setLoading(false))
  }, [])

  // Sync recurring edit map from loaded contributions
  useEffect(() => {
    const map: Record<number, string> = {}
    futureContributions
      .filter((f) => f.recurring && f.account_id != null)
      .forEach((f) => {
        map[f.account_id as number] = String(f.amount)
      })
    setRecurringEdit(map)
  }, [futureContributions])

  async function saveRecurring(accountId: number) {
    const val = parseFloat(recurringEdit[accountId] || "0")
    if (!val || val <= 0) {
      notify("error", "Enter a positive monthly amount")
      return
    }
    try {
      // Backend upserts: deletes old recurring entry for this account,
      // then inserts the new one.
      await axios.post(`${API}/future_contributions`, {
        account_id: accountId,
        amount: val,
        date: new Date().toISOString().slice(0, 10),
        recurring: true,
      })
      await loadAll()
      notify("success", "Monthly contribution saved")
    } catch (err) {
      console.error(err)
      notify("error", "Failed to save contribution")
    }
  }

  async function addOneOff(e: React.FormEvent) {
    e.preventDefault()
    if (!oneOffAmount) {
      notify("error", "Enter an amount")
      return
    }
    try {
      await axios.post(`${API}/future_contributions`, {
        account_id: oneOffAccount ? parseInt(oneOffAccount) : null,
        amount: parseFloat(oneOffAmount),
        date: oneOffDate,
        recurring: false,
      })
      setOneOffAmount("")
      await loadAll()
      notify("success", "One-off contribution added")
    } catch (err) {
      console.error(err)
      notify("error", "Failed to add one-off contribution")
    }
  }

  async function deleteContribution(id: number) {
    try {
      await axios.delete(`${API}/future_contributions/${id}`)
      await loadAll()
      notify("success", "Contribution removed")
    } catch (err) {
      console.error(err)
      notify("error", "Failed to delete")
    }
  }

  // ── Projection calculation ─────────────────────────────────────────────
  const perAccountRate = accounts.map((a) => {
    const rate = futureContributions
      .filter((f) => f.recurring && f.account_id === a.id)
      .reduce((s, f) => s + f.amount, 0)
    return { ...a, rate }
  })

  const { projectionData, totalRecurring, totalAdjusted, hasWhatIf } = useMemo(() => {
    const recurring = futureContributions.filter((f) => f.recurring)
    const oneOffs = futureContributions.filter((f) => !f.recurring && f.date)

    const totalRecurring = recurring.reduce((s, f) => s + f.amount, 0)

    // Per-account adjusted monthly total: use whatIfAmounts[id] if set, else current rate
    const totalAdjusted = accounts.reduce((sum, a) => {
      const raw = whatIfAmounts[a.id]
      const adj = raw !== undefined && raw !== "" ? parseFloat(raw) : perAccountRate.find((p) => p.id === a.id)?.rate ?? 0
      return sum + (isNaN(adj) ? 0 : adj)
    }, 0)
    const hasWhatIf = totalAdjusted !== totalRecurring

    // Build one-off map: "YYYY-M" → total amount that month
    const oneOffMap: Record<string, number> = {}
    oneOffs.forEach((f) => {
      const d = new Date(f.date as string)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      oneOffMap[key] = (oneOffMap[key] || 0) + f.amount
    })

    const months = nextNMonths(forecastMonths)
    let runningBase = summaryTotal
    let runningAdjusted = summaryTotal

    const data = months.map(({ label, year, month }) => {
      const oneOff = oneOffMap[`${year}-${month}`] || 0
      runningBase += totalRecurring + oneOff
      runningAdjusted += totalAdjusted + oneOff
      return {
        name: label,
        "Current Rate": Math.round(runningBase),
        Adjusted: Math.round(runningAdjusted),
      }
    })

    return { projectionData: data, totalRecurring, totalAdjusted, hasWhatIf }
  }, [futureContributions, summaryTotal, whatIfAmounts, accounts, perAccountRate, forecastMonths])

  const oneOffList = futureContributions.filter((f) => !f.recurring)
  const mttBase = monthsToTarget(summaryTotal, target, totalRecurring)
  const mttAdj = monthsToTarget(summaryTotal, target, totalAdjusted)

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading forecast data…</div>
      </div>
    )
  }

  return (
    <div className="container">
      {notice && (
        <div className={`notice notice-${notice.type}`}>{notice.msg}</div>
      )}

      <div className="page-header">
        <h2>Forecast</h2>
      </div>

      {/* ── Current monthly rates (read-only badges) ── */}
      <div className="card">
        <h3>Monthly Contribution Rates</h3>
        <div className="rate-badges">
          {perAccountRate.map((a) => (
            <div key={a.id} className="rate-badge">
              <div className="rate-badge-name">{a.name}</div>
              <div className="rate-badge-val">{fmt(a.rate)}/mo</div>
            </div>
          ))}
          <div className="rate-badge" style={{ background: "#f0fdf4", borderColor: "#86efac" }}>
            <div className="rate-badge-name" style={{ color: "#166534" }}>Total</div>
            <div className="rate-badge-val" style={{ color: "#15803d" }}>{fmt(totalRecurring)}/mo</div>
          </div>
        </div>
      </div>

      {/* ── Set recurring contributions ── */}
      <div className="card">
        <h3>Set Monthly Projected Contributions</h3>
        <p style={{ color: "var(--muted)", margin: "0 0 14px", fontSize: 13 }}>
          These amounts are used for the projection chart only — they do not
          record actual values. Saving replaces any existing projected monthly
          entry for that account.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {accounts.map((a) => (
            <div key={a.id} className="form-row" style={{ flexWrap: "nowrap" }}>
              <div style={{ width: 170, fontWeight: 500, fontSize: 14, paddingTop: 8 }}>
                {a.name}
              </div>
              <label className="form-field">
                <span>£ / month</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={recurringEdit[a.id] ?? ""}
                  onChange={(e) =>
                    setRecurringEdit({ ...recurringEdit, [a.id]: e.target.value })
                  }
                  placeholder="0.00"
                  style={{ width: 120 }}
                />
              </label>
              <div className="form-field form-submit">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => saveRecurring(a.id)}
                >
                  Save
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Add one-off contribution ── */}
      <div className="card">
        <h3>Add One-off Projected Contribution</h3>
        <form onSubmit={addOneOff} className="form-row">
          <label className="form-field">
            <span>Account</span>
            <select
              value={oneOffAccount}
              onChange={(e) => setOneOffAccount(e.target.value)}
              required
            >
              <option value="" disabled>Select account…</option>
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Amount (£)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={oneOffAmount}
              onChange={(e) => setOneOffAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </label>
          <label className="form-field">
            <span>Date</span>
            <input
              type="date"
              value={oneOffDate}
              onChange={(e) => setOneOffDate(e.target.value)}
              required
            />
          </label>
          <div className="form-field form-submit">
            <button type="submit" className="btn-primary">
              Add
            </button>
          </div>
        </form>

        {/* One-off list */}
        {oneOffList.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                color: "var(--muted)",
                letterSpacing: "0.05em",
                marginBottom: 6,
              }}
            >
              Planned one-offs
            </div>
            <div className="contribution-list">
              {oneOffList.map((f) => {
                const acct = accounts.find((a) => a.id === f.account_id)
                return (
                  <div key={f.id} className="contribution-row">
                    <div>
                      <div style={{ fontWeight: 500 }}>{fmt(f.amount)}</div>
                      <div className="contribution-meta">
                        {f.date} · {acct?.name ?? "Unallocated"}
                      </div>
                    </div>
                    <button
                      className="btn-danger-sm"
                      onClick={() => deleteContribution(f.id)}
                    >
                      Remove
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── What-if per-account adjustment ── */}
      <div className="card">
        <h3>What-if Adjustment</h3>
        <p style={{ color: "var(--muted)", margin: "0 0 14px", fontSize: 13 }}>
          Override any account's monthly contribution to see how a change would
          impact your forecast. Leave blank to keep the current rate.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {accounts.map((a) => {
            const current = perAccountRate.find((p) => p.id === a.id)?.rate ?? 0
            const raw = whatIfAmounts[a.id]
            const whatIfVal = raw !== undefined && raw !== "" ? parseFloat(raw) : current
            const diff = (isNaN(whatIfVal) ? 0 : whatIfVal) - current
            return (
              <div key={a.id} className="form-row" style={{ flexWrap: "nowrap", alignItems: "center" }}>
                <div style={{ width: 170, fontWeight: 500, fontSize: 14 }}>{a.name}</div>
                <div style={{ color: "var(--muted)", fontSize: 13, width: 130 }}>
                  Current: {fmt(current)}/mo
                </div>
                <label className="form-field" style={{ flexShrink: 0 }}>
                  <span>What-if (£/mo)</span>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={raw ?? ""}
                    placeholder={current.toFixed(0)}
                    onChange={(e) =>
                      setWhatIfAmounts({ ...whatIfAmounts, [a.id]: e.target.value })
                    }
                    style={{ width: 120 }}
                  />
                </label>
                {raw !== undefined && raw !== "" && !isNaN(parseFloat(raw)) && (
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: diff > 0 ? "var(--success)" : diff < 0 ? "var(--danger)" : "var(--muted)",
                      minWidth: 100,
                    }}
                  >
                    {diff > 0 ? "+" : ""}{fmt(diff)}/mo
                  </div>
                )}
                {raw !== undefined && raw !== "" && (
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ height: 28, padding: "0 10px", fontSize: 12 }}
                    onClick={() => {
                      const next = { ...whatIfAmounts }
                      delete next[a.id]
                      setWhatIfAmounts(next)
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            )
          })}
        </div>
        {hasWhatIf && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 14px",
              background: "#f8faff",
              borderRadius: 8,
              fontSize: 13,
              display: "flex",
              gap: 24,
            }}
          >
            <span>Current total: <strong>{fmt(totalRecurring)}/mo</strong></span>
            <span>
              Adjusted total:{" "}
              <strong style={{ color: totalAdjusted > totalRecurring ? "var(--success)" : "var(--danger)" }}>
                {fmt(totalAdjusted)}/mo
              </strong>
              {" "}(
              {totalAdjusted >= totalRecurring ? "+" : ""}
              {fmt(totalAdjusted - totalRecurring)}/mo)
            </span>
          </div>
        )}
      </div>

      {/* ── Projection chart ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>{forecastMonths}-Month Projection</h3>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)", marginRight: 4 }}>Timeframe:</span>
            {[6, 12, 18, 24, 36, 60].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setForecastMonths(n)}
                style={{
                  padding: "3px 10px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: forecastMonths === n ? "var(--accent)" : "transparent",
                  color: forecastMonths === n ? "#fff" : "var(--text)",
                  cursor: "pointer",
                  fontWeight: forecastMonths === n ? 600 : 400,
                }}
              >
                {n}mo
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={projectionData}
              margin={{ top: 10, right: 20, bottom: 0, left: 20 }}
            >
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(val: number) => fmt(val)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="Current Rate"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="Adjusted"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                strokeDasharray={!hasWhatIf ? "5 5" : undefined}
              />
              {target && (
                <ReferenceLine
                  y={target}
                  stroke="#ef4444"
                  strokeDasharray="5 3"
                  label={{
                    value: `Target ${fmt(target)}`,
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "#ef4444",
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Insights ── */}
      {(mttBase !== null || mttAdj !== null) && (
        <div className="card">
          <h3>Insights</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {mttBase !== null && (
              <div className="insight-box">
                At your current rate of <strong>{fmt(totalRecurring)}/mo</strong>,
                you will reach your target in approximately{" "}
                <strong>{mttBase} months</strong> ({Math.floor(mttBase / 12)} yr{" "}
                {mttBase % 12} mo).
              </div>
            )}
            {mttAdj !== null && hasWhatIf && (
              <div className="insight-box">
                At the adjusted rate of{" "}
                <strong>{fmt(totalAdjusted)}/mo</strong> you would reach your
                target in approximately <strong>{mttAdj} months</strong> (
                {Math.floor(mttAdj / 12)} yr {mttAdj % 12} mo)
                {mttBase !== null && mttBase !== mttAdj
                  ? mttBase - mttAdj > 0
                    ? ` — ${mttBase - mttAdj} months sooner`
                    : ` — ${mttAdj - mttBase} months later`
                  : ""}
                .
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
