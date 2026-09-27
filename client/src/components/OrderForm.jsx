import React, { useState } from "react";
import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { placeTrade } from "../services/api";
import "./OrderForm.css";

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"];

export default function OrderForm({
  marketPrices = {},
  cashBalance = 0,
  onTradeSuccess,
}) {
  const [symbol, setSymbol] = useState("AAPL");
  const [type, setType] = useState("BUY");
  const [shares, setShares] = useState("1");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const currentPrice = marketPrices[symbol] || 0;
  const numShares = parseFloat(shares) || 0;
  const estimatedTotal = (numShares * currentPrice).toFixed(2);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (numShares <= 0) {
      setErrorMsg("Please enter a positive number of shares.");
      return;
    }

    if (type === "BUY" && Number(estimatedTotal) > cashBalance) {
      setErrorMsg(
        `Insufficient cash. Order costs $${estimatedTotal}, but you have $${cashBalance.toLocaleString()}.`,
      );
      return;
    }

    try {
      setLoading(true);
      const res = await placeTrade({
        symbol,
        type,
        shares: numShares,
      });

      setSuccessMsg(res.message || "Order executed successfully.");
      setShares("1");
      if (onTradeSuccess) onTradeSuccess();
    } catch (err) {
      setErrorMsg(err.message || "Failed to place trade.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card order-card">
      <div className="card-title">
        <span>Execute Trade</span>
        <span className="live-ticker-price tabular-nums">
          {symbol}: ${currentPrice.toFixed(2)}
        </span>
      </div>

      {errorMsg && <div className="banner banner-error">{errorMsg}</div>}
      {successMsg && <div className="banner banner-success">{successMsg}</div>}

      <form onSubmit={handleSubmit}>
        <div className="trade-type-toggle">
          <button
            type="button"
            className={`toggle-btn buy ${type === "BUY" ? "active" : ""}`}
            onClick={() => setType("BUY")}
          >
            <ArrowUpRight size={16} /> Buy
          </button>
          <button
            type="button"
            className={`toggle-btn sell ${type === "SELL" ? "active" : ""}`}
            onClick={() => setType("SELL")}
          >
            <ArrowDownRight size={16} /> Sell
          </button>
        </div>

        <div className="form-group">
          <label htmlFor="ticker-select">Ticker Symbol</label>
          <select
            id="ticker-select"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          >
            {DEFAULT_SYMBOLS.map((s) => (
              <option key={s} value={s}>
                {s} — ${marketPrices[s] ? marketPrices[s].toFixed(2) : "---"}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="share-count">Shares</label>
          <input
            id="share-count"
            type="number"
            step="any"
            min="0.0001"
            placeholder="0.00"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            required
          />
        </div>

        <div className="order-summary-box">
          <div className="summary-row">
            <span>Execution Price</span>
            <span className="tabular-nums">${currentPrice.toFixed(2)}</span>
          </div>
          <div className="summary-row total-row">
            <span>Estimated Total</span>
            <span className="tabular-nums">
              ${Number(estimatedTotal).toLocaleString()}
            </span>
          </div>
        </div>

        <button
          type="submit"
          className={`btn ${type === "BUY" ? "btn-success" : "btn-danger"}`}
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="spin" /> Executing...
            </>
          ) : (
            `${type} ${numShares} ${symbol}`
          )}
        </button>
      </form>
    </div>
  );
}
