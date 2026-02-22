import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axios from "axios"
import Progress from "../pages/Progress"

// ── Axios mock ────────────────────────────────────────────────────────────────

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

// ── Shared test data ──────────────────────────────────────────────────────────

const mockAccounts = [
  { id: 1, name: "ISA Alpha", total: 42 },
  { id: 2, name: "ISA Beta", total: 7 },
]

const mockValues = [
  { id: 1, account_id: 1, value: 42, date: "2026-01-01" },
  { id: 2, account_id: 2, value: 7, date: "2026-01-01" },
]

const mockSummary = {
  total: 49,
  target: 420,
  accounts: mockAccounts,
}

function setupAxiosMocks() {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url.includes("/summary")) return Promise.resolve({ data: mockSummary })
    if (url.includes("/values")) return Promise.resolve({ data: mockValues })
    return Promise.reject(new Error(`Unexpected URL: ${url}`))
  })
  vi.mocked(axios.post).mockResolvedValue({ data: {} })
  vi.mocked(axios.put).mockResolvedValue({ data: {} })
  vi.mocked(axios.delete).mockResolvedValue({ data: {} })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Progress page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAxiosMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("shows a loading indicator before data arrives", () => {
    render(<Progress />)
    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
  })

  it("displays total savings after data loads", async () => {
    render(<Progress />)
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument())
    expect(screen.getByText("£49")).toBeInTheDocument()
  })

  it("displays all account names and their latest values", async () => {
    render(<Progress />)
    // Account names and values appear in multiple places (stat card, table, etc.)
    // so use getAllBy to avoid "found multiple elements" errors
    expect((await screen.findAllByText("ISA Alpha")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("ISA Beta").length).toBeGreaterThan(0)
    expect(screen.getAllByText("£42").length).toBeGreaterThan(0)
    expect(screen.getAllByText("£7").length).toBeGreaterThan(0)
  })

  it("shows progress bar section when a target is set", async () => {
    render(<Progress />)
    await screen.findByText(/Progress to Target/i)
    // The remaining amount is unique on the page: 420 - 49 = 371
    expect(screen.getByText(/371 remaining/)).toBeInTheDocument()
  })

  it("does not show progress bar when there is no target", async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.includes("/summary"))
        return Promise.resolve({ data: { total: 42, target: null, accounts: [] } })
      if (url.includes("/values")) return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected: ${url}`))
    })
    render(<Progress />)
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument())
    expect(screen.queryByText(/Progress to Target/i)).not.toBeInTheDocument()
  })

  it("shows 'No entries yet' when there are no value records", async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.includes("/summary"))
        return Promise.resolve({ data: { total: 0, target: null, accounts: [] } })
      if (url.includes("/values")) return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected: ${url}`))
    })
    render(<Progress />)
    await screen.findByText(/No entries yet/i)
  })

  it("shows recent entries in the table", async () => {
    render(<Progress />)
    // 2026-01-01 appears in both rows - use getAllBy
    const dateCells = await screen.findAllByText("2026-01-01")
    expect(dateCells.length).toBeGreaterThan(0)
  })

  // ── Record value form ──────────────────────────────────────────────────────

  it("calls POST /values with correct payload when the form is submitted", async () => {
    const user = userEvent.setup()
    render(<Progress />)
    await screen.findByText("Record Account Value") // wait for load

    // Fill in the value amount (the first spinbutton with placeholder "0.00")
    const valueInput = screen.getByPlaceholderText("0.00")
    await user.clear(valueInput)
    await user.type(valueInput, "50000")

    await user.click(screen.getByRole("button", { name: /^Save$/ }))

    await waitFor(() =>
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
        expect.stringContaining("/values"),
        expect.objectContaining({ value: 50000 })
      )
    )
  })

  it("does not call POST /values if amount is left empty", async () => {
    const user = userEvent.setup()
    render(<Progress />)
    await screen.findByText("Record Account Value")

    // Leave the amount blank and submit
    await user.click(screen.getByRole("button", { name: /^Save$/ }))

    // The HTML `required` attribute should prevent submission; no axios call
    expect(vi.mocked(axios.post)).not.toHaveBeenCalled()
  })

  // ── Target form ────────────────────────────────────────────────────────────

  it("calls PUT /settings with the new target when the target form is submitted", async () => {
    const user = userEvent.setup()
    render(<Progress />)
    await screen.findByText("Savings Target")

    const targetInput = screen.getByPlaceholderText("200000")
    await user.clear(targetInput)
    await user.type(targetInput, "250000")

    await user.click(screen.getByRole("button", { name: /Save Target/i }))

    await waitFor(() =>
      expect(vi.mocked(axios.put)).toHaveBeenCalledWith(
        expect.stringContaining("/settings"),
        { total_target: 250000 }
      )
    )
  })

  // ── Delete ─────────────────────────────────────────────────────────────────

  it("calls DELETE /values/{id} when delete is confirmed", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true)
    const user = userEvent.setup()
    render(<Progress />)
    const deleteButtons = await screen.findAllByRole("button", { name: /Delete/i })
    await user.click(deleteButtons[0])

    await waitFor(() =>
      expect(vi.mocked(axios.delete)).toHaveBeenCalledWith(
        expect.stringContaining("/values/1")
      )
    )
  })

  it("does not call DELETE when the confirmation dialog is cancelled", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(false)
    const user = userEvent.setup()
    render(<Progress />)
    const deleteButtons = await screen.findAllByRole("button", { name: /Delete/i })
    await user.click(deleteButtons[0])
    expect(vi.mocked(axios.delete)).not.toHaveBeenCalled()
  })
})
