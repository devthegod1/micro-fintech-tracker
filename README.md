# Micro-Fintech Equity & Portfolio Tracker

A full-stack fintech web application tracking real-time stock equity positions, portfolio valuation, cash balances, and unrealized Profit & Loss (P&L).

## Core Architecture
- **Backend:** Node.js, Express, SQLite3 (ACID transactions, weighted average cost basis)
- **Frontend:** React 18, Vite, Lucide Icons, CSS Custom Properties
- **Supported Tickers:** AAPL, MSFT, GOOGL, AMZN, TSLA, NVDA

## Getting Started

### 1. Clone & Environment Setup
```bash
git clone [https://github.com/devthegod1/micro-fintech-tracker.git](https://github.com/devthegod1/micro-fintech-tracker.git)
cd micro-fintech-tracker

# Copy environment templates
cp server/.env.example server/.env
cp client/.env.example client/.env
2. Install Dependencies
Bash
# Install root, backend, and frontend dependencies
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
3. Run Development Servers
Bash
npm run dev
Frontend: http://localhost:5173

Backend API: http://localhost:5000

Health Check: http://localhost:5000/health

API Endpoints
GET /api/portfolio - Fetch current cash balance, equity value, positions, and live prices.

POST /api/portfolio/trade - Execute market BUY / SELL orders ({ symbol, type, shares }).

POST /api/portfolio/rebalance - Automated target allocation rebalancing ({ allocations: { AAPL: 50, MSFT: 50 } }).
