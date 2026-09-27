import React from "react";
import { TrendingUp, TrendingDown, Layers } from "lucide-react";
import "./PositionsTable.css";

/**
 * PositionsTable: Displays open equity holdings with real-time valuation and P&L
 * @param {Array} positions - Array of active position objects from /api/portfolio
 */
export default function PositionsTable({ positions = [] }) {
  if (!positions || positions.length === 0) {
    return (
      <div className="card positions-card">
        <div className="card-title">
          <span>Active Positions</span>
          <span className="count-pill">0 Holdings</span>
        </div>
        <div className="empty-positions-state">
          <Layers size={36} className="empty-icon" />
          <p className="empty-title">No Open Positions</p>
          <p className="empty-desc">
            Use the order panel on the right to execute your first market order.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card positions-card">
      <div className="card-title">
        <span>Active Positions</span>
        <span className="count-pill">{positions.length} Holdings</span>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Shares</th>
              <th>Avg Cost</th>
              <th>Market Price</th>
              <th>Market Value</th>
              <th>Unrealized P&L</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((pos) => {
              const isProfit = pos.unrealizedPL >= 0;
              const formattedPL = isProfit
                ? `+$${pos.unrealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                : `-$${Math.abs(pos.unrealizedPL).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
              const formattedPercent = `${isProfit ? "+" : ""}${pos.unrealizedPLPercent.toFixed(2)}%`;

              return (
                <tr key={pos.symbol}>
                  <td>
                    <span className="ticker-badge">{pos.symbol}</span>
                  </td>
                  <td className="tabular-nums">
                    {pos.shares.toLocaleString()}
                  </td>
                  <td className="tabular-nums">${pos.avgCost.toFixed(2)}</td>
                  <td className="tabular-nums">
                    ${pos.currentPrice.toFixed(2)}
                  </td>
                  <td className="tabular-nums font-semibold">
                    $
                    {pos.marketValue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                    })}
                  </td>
                  <td>
                    <span className={`pl-tag ${isProfit ? "profit" : "loss"}`}>
                      {isProfit ? (
                        <TrendingUp size={14} />
                      ) : (
                        <TrendingDown size={14} />
                      )}
                      <span className="tabular-nums">
                        {formattedPL} ({formattedPercent})
                      </span>
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
