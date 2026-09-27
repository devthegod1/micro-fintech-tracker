import React, { useState, useEffect, useCallback } from "react";
import {
  TrendingUp,
  DollarSign,
  Wallet,
  PieChart,
  RefreshCw,
} from "lucide-react";
import { fetchPortfolio } from "./services/api";
import MetricCard from "./components/MetricCard";
import OrderForm from "./components/OrderForm";
import PositionsTable from "./components/PositionsTable";
import "./App.css";

export default function App() {
  const [portfolio, setPortfolio] = useState({
    cashBalance: 0,
    equityValuation: 0,
    totalPortfolioValue: 0,
    totalUnrealizedPL: 0,
    totalUnrealizedPLPercent: 0,
    positions: [],
    marketPrices: {},
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadPortfolio = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await fetchPortfolio();
      setPortfolio(data);
      setError(null);
    } catch (err) {
      console.error("Error fetching portfolio:", err);
      setError(err.message || "Failed to connect to backend server.");
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  // Initial load and periodic 5-second market price drift polling
  useEffect(() => {
    loadPortfolio();
    const intervalId = setInterval(() => {
      loadPortfolio();
    }, 5000);

    return () => clearInterval(intervalId);
  }, [loadPortfolio]);

  const isProfit = portfolio.totalUnrealizedPL >= 0;
  const plTrend = isProfit ? "positive" : "negative";
  const plFormatted = `${isProfit ? "+" : ""}$${Math.abs(portfolio.totalUnrealizedPL).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const plPercentFormatted = `${isProfit ? "+" : ""}${portfolio.totalUnrealizedPLPercent.toFixed(2)}%`;

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="header">
        <div className="brand-title">
          <PieChart size={28} color="#2563eb" />
          <span>Micro-Fintech Equity Tracker</span>
        </div>
        <button
          className="refresh-btn"
          onClick={() => loadPortfolio(true)}
          disabled={refreshing}
          title="Refresh market prices"
        >
          <RefreshCw size={16} className={refreshing ? "spin" : ""} />
          <span>{refreshing ? "Updating..." : "Sync Prices"}</span>
        </button>
      </header>

      {/* Global Error Banner */}
      {error && (
        <div className="banner banner-error">
          <strong>Connection Notice:</strong> {error}
        </div>
      )}

      {/* Account KPI Ribbon */}
      <section className="metrics-grid">
        <MetricCard
          title="Total Portfolio Value"
          value={`$${portfolio.totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtext={`Equity: $${portfolio.equityValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign size={20} />}
          trend="neutral"
        />

        <MetricCard
          title="Available Cash"
          value={`$${portfolio.cashBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtext="Buying Power"
          icon={<Wallet size={20} />}
          trend="neutral"
        />

        <MetricCard
          title="Total Unrealized P&L"
          value={plFormatted}
          subtext={plPercentFormatted}
          icon={<TrendingUp size={20} />}
          trend={plTrend}
        />
      </section>

      {/* Main Content: Positions Ledger + Trade Execution */}
      <main className="dashboard-grid">
        <div className="grid-left">
          <PositionsTable positions={portfolio.positions} />
        </div>
        <div className="grid-right">
          <OrderForm
            marketPrices={portfolio.marketPrices}
            cashBalance={portfolio.cashBalance}
            onTradeSuccess={() => loadPortfolio(false)}
          />
        </div>
      </main>
    </div>
  );
}
