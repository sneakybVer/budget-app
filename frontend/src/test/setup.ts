import "@testing-library/jest-dom"

// Recharts uses ResizeObserver internally; jsdom doesn't provide it.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
