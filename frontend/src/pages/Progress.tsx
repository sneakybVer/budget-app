import React, { useEffect, useState, useMemo } from "react"
import axios from "axios"
import { fmt, monthsFromTo } from "../utils"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts"

const API = `http://${window.location.hostname}:8000`
const ACCOUNT_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899"]

type Account = { id: number; name: string; total?: number }
type ValueRecord = { id: number; account_id: number; value: number; date: string }

type Notice = { type: "success" | "error"; msg: string }

export default function Progress() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [total, setTotal] = useState<number>(0)
  const [target, setTarget] = useState<number | null>(null)
  const [targetInput, setTargetInput] = useState<string>("")
  const [values, setValues] = useState<ValueRecord[]>([])
  const [formAccount, setFormAccount] = useState<string>("")
  const [formAmount, setFormAmount] = useState<string>("")
  const [formDate, setFormDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  )
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [chartType, setChartType] = useState<"bar" | "line">("bar")

  function notify(type: Notice["type"], msg: string) {
    setNotice({ type, msg })
    setTimeout(() => setNotice(null), 3500)
  }

  async function loadAll() {
    const [sumRes, valRes] = await Promise.all([
      axios.get(`${API}/summary`),
      axios.get(`${API}/values`),
    ])
    setTotal(sumRes.data.total ?? 0)
    setTarget(sumRes.data.target ?? null)
    setTargetInput(String(sumRes.data.target ?? ""))
    if (sumRes.data.accounts) {
      setAccounts(sumRes.data.accounts)
      if (!formAccount && sumRes.data.accounts.length) {
        setFormAccount(String(sumRes.data.accounts[0].id))
      }
    }
    setValues(valRes.data)
  }

  useEffect(() => {
    loadAll().catch(console.error).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submitValue(e: React.FormEvent) {
    e.preventDefault()
    if (!formAccount || !formAmount) return
    try {
      await axios.post(`${API}/values`, {
        account_id: parseInt(formAccount),
        value: parseFloat(formAmount),
        date: formDate,
      })
      setFormAmount("")
      await loadAll()
      notify("success", "Value recorded successfully")
    } catch (err) {
      console.error(err)
      notify("error", "Failed to save value record")
    }
  }

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(targetInput)
    if (!val || val <= 0) {
      notify("error", "Enter a valid target amount")
      return
    }
    try {
      await axios.put(`${API}/settings`, { total_target: val })
      setTarget(val)
      notify("success", "Target saved")
    } catch (err) {
      console.error(err)
      notify("error", "Failed to save target")
    }
  }

  async function deleteValue(id: number) {
    if (!confirm("Delete this value entry?")) return
    try {
      await axios.delete(`${API}/values/${id}`)
      await loadAll()
      notify("success", "Entry deleted")
    } catch (err) {
      console.error(err)
      notify("error", "Failed to delete entry")
    }
  }

  // ── Chart data: historical values per account, by month ──────────────────
  const { chartLabels, chartData } = useMemo(() => {
    if (!values.length || !accounts.length) {
      const now = new Date()
      const past = new Date(now.getFullYear(), now.getMonth() - 5, 1)
      const labels = monthsFromTo(past, now)
      return {
        chartLabels: labels,
        chartData: labels.map((lbl) => ({ name: lbl.split(" ")[0] })),
      }
    }
    const parsed = values.map((v) => new Date(v.date))
    const minDate = new Date(Math.min(...parsed.map((d) => d.getTime())))
    const maxDate = new Date()
    const labels = monthsFromTo(minDate, maxDate)
    const sorted = [...values].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
    const data = labels.map((lbl) => {
      const [monthName, yearStr] = lbl.split(" ")
      const year = parseInt(yearStr)
      const monthIdx = new Date(`${monthName} 1, ${year}`).getMonth()
      // last moment of this month
      const monthEnd = new Date(year, monthIdx + 1, 0, 23, 59, 59)
      const obj: Record<string, number | string> = { name: monthName }
      accounts.forEach((a) => {
        const recs = sorted.filter(
          (v) => v.account_id === a.id && new Date(v.date) <= monthEnd
        )
        obj[a.name] = recs.length ? recs[recs.length - 1].value : 0
      })
      return obj
    })
    return { chartLabels: labels, chartData: data }
  }, [values, accounts])

  // ── Recent entries (latest 20, newest first) ─────────────────────────────
  const recentValues = useMemo(
    () =>
      [...values]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 20),
    [values]
  )

  // ── 30-day change per account ─────────────────────────────────────────────
  const changes = useMemo(() => {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return accounts.map((a) => {
      const recs = [...values]
        .filter((v) => v.account_id === a.id)
        .sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime())
      const latest = recs[recs.length - 1]
      // last record on or before 30 days ago
      const prev = [...recs].reverse().find((r) => new Date(r.date) <= cutoff)
      const change = (latest?.value ?? 0) - (prev?.value ?? latest?.value ?? 0)
      const pct = prev && prev.value ? (change / prev.value) * 100 : null
      return { account: a, change, pct }
    })
  }, [accounts, values])

  const pct = target && total ? Math.min(100, (total / target) * 100) : 0

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading your savings data…</div>
      </div>
    )
  }

  return (
    <div className="container">
      {notice && (
        <div className={`notice notice-${notice.type}`}>{notice.msg}</div>
      )}

      <div className="page-header">
        <h2>Progress</h2>
      </div>

      {/* ── Stat cards ── */}
      <div className="stat-grid">
        <div className="stat-card stat-primary">
          <div className="stat-label">Total Savings</div>
          <div className="stat-value">{fmt(total)}</div>
          {target && (
            <div className="stat-sub">{pct.toFixed(1)}% of target</div>
          )}
        </div>
        {accounts.map((a, i) => (
          <div key={a.id} className="stat-card">
            <div className="stat-label">{a.name}</div>
            <div className="stat-value">{fmt(a.total ?? 0)}</div>
            {total > 0 && (
              <div className="stat-sub">
                {(((a.total ?? 0) / total) * 100).toFixed(1)}% of total
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Progress toward target ── */}
      {target && (
        <div className="card progress-section">
          <div className="progress-header">
            <span>Progress to Target</span>
            <span>
              {fmt(total)} / {fmt(target)}
            </span>
          </div>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${pct}%` }}
            >
              {pct > 10 && (
                <span className="progress-bar-label">{pct.toFixed(1)}%</span>
              )}
            </div>
          </div>
          <div className="progress-footer">
            {fmt(target - total)} remaining to target
          </div>
        </div>
      )}

      {/* ── Historical chart ── */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0 }}>Historical Values by Account</h3>
          <div style={{ display: "flex", gap: 6 }}>
            {(["bar", "line"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setChartType(t)}
                style={{
                  padding: "3px 12px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: chartType === t ? "var(--accent)" : "transparent",
                  color: chartType === t ? "#fff" : "var(--text)",
                  cursor: "pointer",
                  fontWeight: chartType === t ? 600 : 400,
                  textTransform: "capitalize",
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val: number, name: string) => [fmt(val), name]} />
                <Legend />
                {accounts.map((a, i) => (
                  <Bar
                    key={a.id}
                    dataKey={a.name}
                    stackId="stack"
                    fill={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]}
                    radius={i === accounts.length - 1 ? [4, 4, 0, 0] : undefined}
                  />
                ))}
                {target && (
                  <ReferenceLine
                    y={target}
                    stroke="#ef4444"
                    strokeDasharray="5 3"
                    label={{ value: `Target ${fmt(target)}`, position: "insideTopRight", fontSize: 11, fill: "#ef4444" }}
                  />
                )}
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(val: number, name: string) => [fmt(val), name]} />
                <Legend />
                {accounts.map((a, i) => (
                  <Line
                    key={a.id}
                    type="monotone"
                    dataKey={a.name}
                    stroke={ACCOUNT_COLORS[i % ACCOUNT_COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
                {target && (
                  <ReferenceLine
                    y={target}
                    stroke="#ef4444"
                    strokeDasharray="5 3"
                    label={{ value: `Target ${fmt(target)}`, position: "insideTopRight", fontSize: 11, fill: "#ef4444" }}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Record a value ── */}
      <div className="card">
        <h3>Record Account Value</h3>
        <form onSubmit={submitValue} className="form-row">
          <label className="form-field">
            <span>Account</span>
            <select
              value={formAccount}
              onChange={(e) => setFormAccount(e.target.value)}
              required
            >
              <option value="" disabled>
                Select account…
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Value (£)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </label>
          <label className="form-field">
            <span>Date</span>
            <input
              type="date"
              value={formDate}
              onChange={(e) => setFormDate(e.target.value)}
              required
            />
          </label>
          <div className="form-field form-submit">
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </div>

      {/* ── Settings ── */}
      <div className="card">
        <h3>Savings Target</h3>
        <form onSubmit={saveTarget} className="form-row">
          <label className="form-field">
            <span>Target Amount (£)</span>
            <input
              type="number"
              step="1"
              min="1"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="200000"
              required
            />
          </label>
          <div className="form-field form-submit">
            <button type="submit" className="btn-primary">
              Save Target
            </button>
          </div>
        </form>
      </div>

      {/* ── 30-day change ── */}
      <div className="card">
        <h3>Change (last 30 days)</h3>
        <div className="account-change-list">
          {changes.map(({ account, change, pct: changePct }) => (
            <div key={account.id} className="account-change-row">
              <div className="account-change-name">{account.name}</div>
              <div
                className={`account-change-value ${change >= 0 ? "positive" : "negative"}`}
              >
                {change >= 0 ? "+" : ""}
                {fmt(change)}
                {changePct !== null && (
                  <span className="account-change-pct">
                    {" "}
                    ({changePct >= 0 ? "+" : ""}
                    {changePct.toFixed(2)}%)
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Recent entries ── */}
      <div className="card">
        <h3>Recent Entries</h3>
        {recentValues.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>No entries yet.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Date</th>
                <th>Value</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {recentValues.map((v) => {
                const acct = accounts.find((a) => a.id === v.account_id)
                return (
                  <tr key={v.id}>
                    <td>{acct?.name ?? `Account ${v.account_id}`}</td>
                    <td>{v.date}</td>
                    <td>{fmt(v.value)}</td>
                    <td>
                      <button
                        className="btn-danger-sm"
                        onClick={() => deleteValue(v.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
