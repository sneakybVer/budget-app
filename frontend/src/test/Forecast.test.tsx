import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import axios from "axios"
import Forecast from "../pages/Forecast"

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
  { id: 1, name: "ISA Alpha" },
  { id: 2, name: "ISA Beta" },
]

const mockContributions = [
  { id: 1, account_id: 1, amount: 13, date: "2026-01-01", recurring: true },
  { id: 2, account_id: 1, amount: 69, date: "2026-04-01", recurring: false },
]

const mockSummary = { total: 49, target: 420 }

function setupAxiosMocks() {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    if (url.includes("/future_contributions"))
      return Promise.resolve({ data: mockContributions })
    if (url.includes("/accounts"))
      return Promise.resolve({ data: mockAccounts })
    if (url.includes("/summary"))
      return Promise.resolve({ data: mockSummary })
    return Promise.reject(new Error(`Unexpected URL: ${url}`))
  })
  vi.mocked(axios.post).mockResolvedValue({ data: { id: 99, amount: 0, recurring: false } })
  vi.mocked(axios.delete).mockResolvedValue({ data: {} })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Forecast page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setupAxiosMocks()
  })

  // ── Rendering ──────────────────────────────────────────────────────────────

  it("shows a loading indicator before data arrives", () => {
    render(<Forecast />)
    expect(screen.getByText(/Loading/i)).toBeInTheDocument()
  })

  it("displays account names in the monthly rates section", async () => {
    render(<Forecast />)
    await screen.findByText("Monthly Contribution Rates")
    expect(screen.getAllByText("ISA Alpha").length).toBeGreaterThan(0)
    expect(screen.getAllByText("ISA Beta").length).toBeGreaterThan(0)
  })

  it("shows the correct recurring rate badge for each account", async () => {
    render(<Forecast />)
    await screen.findByText("Monthly Contribution Rates")
    // £13/mo appears in both the ISA Alpha badge and the Total badge
    expect(screen.getAllByText("£13/mo").length).toBeGreaterThan(0)
  })

  it("shows a £0/mo rate badge for accounts with no recurring contribution", async () => {
    render(<Forecast />)
    await screen.findByText("Monthly Contribution Rates")
    // HL ISA has no recurring entry → should show £0/mo
    expect(screen.getByText("£0/mo")).toBeInTheDocument()
  })

  it("lists planned one-off contributions with amount and date", async () => {
    render(<Forecast />)
    await screen.findByText(/Planned one-offs/i)
    expect(screen.getByText("£69")).toBeInTheDocument()
    expect(screen.getByText(/2026-04-01/)).toBeInTheDocument()
  })

  it("does not render the one-off list when there are no one-offs", async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.includes("/future_contributions"))
        // only recurring, no one-offs
        return Promise.resolve({
          data: [{ id: 1, account_id: 1, amount: 42, date: "2026-01-01", recurring: true }],
        })
      if (url.includes("/accounts"))
        return Promise.resolve({ data: mockAccounts })
      if (url.includes("/summary"))
        return Promise.resolve({ data: mockSummary })
      return Promise.reject(new Error(`Unexpected: ${url}`))
    })
    render(<Forecast />)
    await waitFor(() => expect(screen.queryByText(/Loading/i)).not.toBeInTheDocument())
    expect(screen.queryByText(/Planned one-offs/i)).not.toBeInTheDocument()
  })

  // ── Save recurring contribution ────────────────────────────────────────────

  it("calls POST /future_contributions with recurring=true when Save is clicked", async () => {
    const user = userEvent.setup()
    render(<Forecast />)
    await screen.findByText("Set Monthly Projected Contributions")

    // The first recurring-save form row is for Nutmeg ISA
    // Input is labelled "£ / month" — get all and use first
    const monthlyInputs = screen.getAllByPlaceholderText("0.00")
    // monthlyInputs[0] is under "Set Monthly Projected Contributions"
    await user.clear(monthlyInputs[0])
    await user.type(monthlyInputs[0], "700")

    const saveButtons = screen.getAllByRole("button", { name: /^Save$/ })
    await user.click(saveButtons[0])

    await waitFor(() =>
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
        expect.stringContaining("/future_contributions"),
        expect.objectContaining({ amount: 700, recurring: true, account_id: 1 })
      )
    )
  })

  it("shows a success notice after saving a recurring contribution", async () => {
    const user = userEvent.setup()
    render(<Forecast />)
    await screen.findByText("Set Monthly Projected Contributions")

    const monthlyInputs = screen.getAllByPlaceholderText("0.00")
    await user.clear(monthlyInputs[0])
    await user.type(monthlyInputs[0], "800")

    const saveButtons = screen.getAllByRole("button", { name: /^Save$/ })
    await user.click(saveButtons[0])

    await screen.findByText(/Monthly contribution saved/i)
  })

  // ── Add one-off ────────────────────────────────────────────────────────────

  it("calls POST /future_contributions with recurring=false when Add is clicked", async () => {
    const user = userEvent.setup()
    render(<Forecast />)
    await screen.findByText("Add One-off Projected Contribution")

    // Amount (£) label wraps the one-off input
    const amountInput = screen.getByLabelText(/Amount \(£\)/i)
    await user.clear(amountInput)
    await user.type(amountInput, "2000")

    await user.click(screen.getByRole("button", { name: /^Add$/ }))

    await waitFor(() =>
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
        expect.stringContaining("/future_contributions"),
        expect.objectContaining({ amount: 2000, recurring: false })
      )
    )
  })

  it("shows a success notice after adding a one-off", async () => {
    const user = userEvent.setup()
    render(<Forecast />)
    await screen.findByText("Add One-off Projected Contribution")

    const amountInput = screen.getByLabelText(/Amount \(£\)/i)
    await user.type(amountInput, "500")
    await user.click(screen.getByRole("button", { name: /^Add$/ }))

    await screen.findByText(/One-off contribution added/i)
  })

  // ── Delete one-off ─────────────────────────────────────────────────────────

  it("calls DELETE /future_contributions/{id} when Remove is clicked", async () => {
    const user = userEvent.setup()
    render(<Forecast />)
    const removeButton = await screen.findByRole("button", { name: /Remove/i })
    await user.click(removeButton)

    await waitFor(() =>
      expect(vi.mocked(axios.delete)).toHaveBeenCalledWith(
        expect.stringContaining("/future_contributions/2")
      )
    )
  })

  it("shows a success notice after removing a contribution", async () => {
    const user = userEvent.setup()
    render(<Forecast />)
    const removeButton = await screen.findByRole("button", { name: /Remove/i })
    await user.click(removeButton)

    await screen.findByText(/Contribution removed/i)
  })
})
