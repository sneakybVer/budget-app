import React, { useEffect, useState, useMemo } from "react"
import axios from "axios"
import { fmt } from "../utils"

const API = `http://${window.location.hostname}:8000`

type Account = { id: number; name: string; total?: number }
type ValueRecord = { id: number; account_id: number; value: number; date: string }
type Notice = { type: "success" | "error"; msg: string }

export default function Settings() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [values, setValues] = useState<ValueRecord[]>([])
  const [target, setTarget] = useState<number | null>(null)
  const [targetInput, setTargetInput] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice | null>(null)

  // Rename state: accountId → draft name
  const [renameMap, setRenameMap] = useState<Record<number, string>>({})

  // Opening balance form state per account: accountId → { amount, date }
  const [openingForm, setOpeningForm] = useState<Record<number, { amount: string; date: string }>>({})

  // Add account form
  const [newName, setNewName] = useState("")
  const [newAmount, setNewAmount] = useState("")
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))

  function notify(type: Notice["type"], msg: string) {
    setNotice({ type, msg })
    setTimeout(() => setNotice(null), 3500)
  }

  async function loadAll() {
    const [sumRes, valRes, settingsRes] = await Promise.all([
      axios.get(`${API}/summary`),
      axios.get(`${API}/values`),
      axios.get(`${API}/settings`),
    ])
    const accts: Account[] = sumRes.data.accounts ?? []
    setAccounts(accts)
    setValues(valRes.data)
    setTarget(settingsRes.data.total_target ?? null)
    setTargetInput(String(settingsRes.data.total_target ?? ""))

    // Initialise rename map from current names
    const rm: Record<number, string> = {}
    accts.forEach((a) => (rm[a.id] = a.name))
    setRenameMap(rm)
  }

  useEffect(() => {
    loadAll().catch(console.error).finally(() => setLoading(false))
  }, [])

  // Opening balance = earliest ValueRecord per account
  const openingBalances = useMemo(() => {
    const map: Record<number, ValueRecord> = {}
    values.forEach((v) => {
      const existing = map[v.account_id]
      if (!existing || v.date < existing.date) map[v.account_id] = v
    })
    return map
  }, [values])

  // ── Rename ────────────────────────────────────────────────────────────────

  async function saveRename(accountId: number) {
    const name = (renameMap[accountId] ?? "").trim()
    if (!name) { notify("error", "Name cannot be blank"); return }
    try {
      await axios.patch(`${API}/accounts/${accountId}`, { name })
      await loadAll()
      notify("success", "Account renamed")
    } catch {
      notify("error", "Failed to rename account")
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function deleteAccount(accountId: number, name: string) {
    if (!confirm(`Delete "${name}" and all its history? This cannot be undone.`)) return
    try {
      await axios.delete(`${API}/accounts/${accountId}`)
      await loadAll()
      notify("success", `"${name}" deleted`)
    } catch {
      notify("error", "Failed to delete account")
    }
  }

  // ── Opening / seed balance ─────────────────────────────────────────────────

  function openingField(accountId: number, field: "amount" | "date"): string {
    return openingForm[accountId]?.[field] ?? ""
  }

  function setOpeningField(accountId: number, field: "amount" | "date", val: string) {
    setOpeningForm((prev) => ({
      ...prev,
      [accountId]: { ...(prev[accountId] ?? { amount: "", date: new Date().toISOString().slice(0, 10) }), [field]: val },
    }))
  }

  async function saveOpeningBalance(accountId: number) {
    const amount = parseFloat(openingField(accountId, "amount"))
    const date = openingField(accountId, "date")
    if (!amount || amount <= 0 || !date) { notify("error", "Enter a valid amount and date"); return }
    try {
      await axios.post(`${API}/values`, { account_id: accountId, value: amount, date })
      // Clear the form for this account
      setOpeningForm((prev) => { const n = { ...prev }; delete n[accountId]; return n })
      await loadAll()
      notify("success", "Opening balance saved")
    } catch {
      notify("error", "Failed to save opening balance")
    }
  }

  // ── Add account ───────────────────────────────────────────────────────────

  async function addAccount(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) { notify("error", "Enter an account name"); return }
    try {
      const acct = (await axios.post(`${API}/accounts`, { name })).data
      if (newAmount && parseFloat(newAmount) > 0) {
        await axios.post(`${API}/values`, {
          account_id: acct.id,
          value: parseFloat(newAmount),
          date: newDate,
        })
      }
      setNewName("")
      setNewAmount("")
      setNewDate(new Date().toISOString().slice(0, 10))
      await loadAll()
      notify("success", `"${name}" added`)
    } catch {
      notify("error", "Failed to add account")
    }
  }

  // ── Target ────────────────────────────────────────────────────────────────

  async function saveTarget(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(targetInput)
    if (!val || val <= 0) { notify("error", "Enter a valid target amount"); return }
    try {
      await axios.put(`${API}/settings`, { total_target: val })
      setTarget(val)
      notify("success", "Target saved")
    } catch {
      notify("error", "Failed to save target")
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading settings…</div>
      </div>
    )
  }

  return (
    <div className="container">
      {notice && (
        <div className={`notice notice-${notice.type}`}>{notice.msg}</div>
      )}

      <div className="page-header">
        <h2>Settings</h2>
      </div>

      {/* ── Add account ── */}
      <div className="card">
        <h3>Add Account</h3>
        <p style={{ color: "var(--muted)", margin: "0 0 14px", fontSize: 13 }}>
          Create a new savings account. Optionally set its opening balance here — you
          can always add more history from the Progress page.
        </p>
        <form onSubmit={addAccount} className="form-row">
          <label className="form-field">
            <span>Account name</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. My ISA"
              required
            />
          </label>
          <label className="form-field">
            <span>Opening balance (£)</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              placeholder="optional"
            />
          </label>
          <label className="form-field">
            <span>Opening date</span>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
          </label>
          <div className="form-field form-submit">
            <button type="submit" className="btn-primary">Add</button>
          </div>
        </form>
      </div>

      {/* ── Account list ── */}
      <div className="card">
        <h3>My Accounts</h3>
        {accounts.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            No accounts yet — add one above.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {accounts.map((a) => {
              const opening = openingBalances[a.id]
              return (
                <div
                  key={a.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: 10,
                    padding: "16px 18px",
                    background: "var(--surface)",
                  }}
                >
                  {/* Name row */}
                  <div className="form-row" style={{ flexWrap: "nowrap", marginBottom: 12 }}>
                    <label className="form-field" style={{ flex: 1 }}>
                      <span>Account name</span>
                      <input
                        type="text"
                        value={renameMap[a.id] ?? a.name}
                        onChange={(e) =>
                          setRenameMap({ ...renameMap, [a.id]: e.target.value })
                        }
                      />
                    </label>
                    <div className="form-field form-submit">
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => saveRename(a.id)}
                      >
                        Rename
                      </button>
                    </div>
                    <div className="form-field form-submit">
                      <button
                        type="button"
                        className="btn-danger-sm"
                        style={{ padding: "6px 14px", fontSize: 13 }}
                        onClick={() => deleteAccount(a.id, a.name)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Balance info */}
                  <div
                    style={{
                      display: "flex",
                      gap: 24,
                      fontSize: 13,
                      color: "var(--muted)",
                      marginBottom: 14,
                    }}
                  >
                    <span>
                      <strong style={{ color: "var(--text)" }}>Latest:</strong>{" "}
                      {fmt(a.total ?? 0)}
                    </span>
                    {opening && (
                      <span>
                        <strong style={{ color: "var(--text)" }}>Opening:</strong>{" "}
                        {fmt(opening.value)} on {opening.date}
                      </span>
                    )}
                  </div>

                  {/* Seed / opening balance form */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        color: "var(--muted)",
                        letterSpacing: "0.05em",
                        marginBottom: 8,
                      }}
                    >
                      {opening ? "Add / update opening balance" : "Set opening balance"}
                    </div>
                    <div className="form-row" style={{ flexWrap: "nowrap" }}>
                      <label className="form-field">
                        <span>Amount (£)</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={openingField(a.id, "amount")}
                          onChange={(e) => setOpeningField(a.id, "amount", e.target.value)}
                          style={{ width: 120 }}
                        />
                      </label>
                      <label className="form-field">
                        <span>Date</span>
                        <input
                          type="date"
                          value={openingField(a.id, "date") || new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setOpeningField(a.id, "date", e.target.value)}
                        />
                      </label>
                      <div className="form-field form-submit">
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => saveOpeningBalance(a.id)}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Savings target ── */}
      <div className="card">
        <h3>Savings Target</h3>
        <p style={{ color: "var(--muted)", margin: "0 0 14px", fontSize: 13 }}>
          {target
            ? `Currently set to ${fmt(target)}.`
            : "No target set yet."}
        </p>
        <form onSubmit={saveTarget} className="form-row">
          <label className="form-field">
            <span>Target amount (£)</span>
            <input
              type="number"
              step="1"
              min="1"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="e.g. 100000"
              required
            />
          </label>
          <div className="form-field form-submit">
            <button type="submit" className="btn-primary">Save Target</button>
          </div>
        </form>
      </div>
    </div>
  )
}
