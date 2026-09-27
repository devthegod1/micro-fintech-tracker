const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

/**
 * Helper to process Fetch responses and extract error payloads
 */
async function handleResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const errorMsg =
      data.error ||
      data.message ||
      `Request failed with status ${response.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

/**
 * Fetches current cash, positions, valuation, and unrealized P&L
 */
export async function fetchPortfolio() {
  const res = await fetch(`${BASE_URL}/portfolio`);
  return handleResponse(res);
}

/**
 * Places a market BUY or SELL order
 * @param {Object} order - { symbol: string, type: 'BUY'|'SELL', shares: number }
 */
export async function placeTrade(order) {
  const res = await fetch(`${BASE_URL}/portfolio/trade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(order),
  });
  return handleResponse(res);
}

/**
 * Rebalances positions based on target allocation percentages
 * @param {Object} allocations - e.g. { AAPL: 50, MSFT: 50 }
 */
export async function rebalancePortfolio(allocations) {
  const res = await fetch(`${BASE_URL}/portfolio/rebalance`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ allocations }),
  });
  return handleResponse(res);
}
