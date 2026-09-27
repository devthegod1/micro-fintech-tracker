const { getDb } = require("../db");

// Realistic baseline prices for US equities
const MARKET_PRICES = {
  AAPL: 224.5,
  MSFT: 448.2,
  GOOGL: 178.9,
  AMZN: 186.4,
  TSLA: 252.1,
  NVDA: 128.75,
};

/**
 * Helper to simulate real-time price tick fluctuations (±0.5% drift)
 */
function getLivePrice(symbol) {
  const base = MARKET_PRICES[symbol.toUpperCase()];
  if (!base) return null;
  // Apply a small deterministic/random micro-fluctuation to mimic a live ticker
  const drift = (Math.random() - 0.5) * 0.01; // between -0.5% and +0.5%
  return Number((base * (1 + drift)).toFixed(2));
}

/**
 * Controller: Get live valuations, positions, cash, and unrealized P&L
 */
async function getPortfolioSummary(req, res) {
  try {
    const db = await getDb();

    // 1. Fetch current cash balance
    const summary = await db.get(
      "SELECT cash_balance FROM portfolio_summary WHERE id = 1",
    );
    const cash = summary ? summary.cash_balance : 0;

    // 2. Fetch all historical trades ordered chronologically
    const trades = await db.all(
      "SELECT * FROM trades ORDER BY timestamp ASC, id ASC",
    );

    // 3. Aggregate net positions and weighted average cost basis
    const positionsMap = {};

    for (const trade of trades) {
      const sym = trade.symbol.toUpperCase();
      if (!positionsMap[sym]) {
        positionsMap[sym] = {
          symbol: sym,
          shares: 0,
          totalInvested: 0, // running cost pool for active shares
        };
      }

      const pos = positionsMap[sym];

      if (trade.type === "BUY") {
        pos.shares += trade.shares;
        pos.totalInvested += trade.total_cost;
      } else if (trade.type === "SELL") {
        if (pos.shares > 0) {
          // Average cost per share before selling
          const avgCostPerShare = pos.totalInvested / pos.shares;
          pos.shares -= trade.shares;
          // Reduce invested cost pool proportionally
          pos.totalInvested -= trade.shares * avgCostPerShare;
          if (pos.shares <= 0.00001) {
            pos.shares = 0;
            pos.totalInvested = 0;
          }
        }
      }
    }

    // 4. Calculate live metrics and unrealized P&L for open positions
    const openPositions = [];
    let totalInvestedCapital = 0;
    let totalEquityValuation = 0;

    for (const sym in positionsMap) {
      const pos = positionsMap[sym];
      if (pos.shares > 0.0001) {
        const livePrice = getLivePrice(sym) || 100.0;
        const avgCost = pos.totalInvested / pos.shares;
        const marketValue = pos.shares * livePrice;
        const unrealizedPL = marketValue - pos.totalInvested;
        const unrealizedPLPercent =
          pos.totalInvested > 0 ? (unrealizedPL / pos.totalInvested) * 100 : 0;

        totalInvestedCapital += pos.totalInvested;
        totalEquityValuation += marketValue;

        openPositions.push({
          symbol: sym,
          shares: Number(pos.shares.toFixed(4)),
          avgCost: Number(avgCost.toFixed(2)),
          currentPrice: Number(livePrice.toFixed(2)),
          marketValue: Number(marketValue.toFixed(2)),
          unrealizedPL: Number(unrealizedPL.toFixed(2)),
          unrealizedPLPercent: Number(unrealizedPLPercent.toFixed(2)),
        });
      }
    }

    const totalPortfolioValue = cash + totalEquityValuation;
    const totalUnrealizedPL = totalEquityValuation - totalInvestedCapital;
    const totalUnrealizedPLPercent =
      totalInvestedCapital > 0
        ? (totalUnrealizedPL / totalInvestedCapital) * 100
        : 0;

    res.json({
      cashBalance: Number(cash.toFixed(2)),
      equityValuation: Number(totalEquityValuation.toFixed(2)),
      totalPortfolioValue: Number(totalPortfolioValue.toFixed(2)),
      totalUnrealizedPL: Number(totalUnrealizedPL.toFixed(2)),
      totalUnrealizedPLPercent: Number(totalUnrealizedPLPercent.toFixed(2)),
      positions: openPositions,
      marketPrices: MARKET_PRICES,
    });
  } catch (error) {
    console.error("Error calculating portfolio summary:", error);
    res.status(500).json({ error: "Failed to retrieve portfolio metrics" });
  }
}

/**
 * Controller: Execute a Buy or Sell Market Order
 */
async function executeTrade(req, res) {
  const { symbol, type, shares } = req.body;

  // Validation: Check required fields
  if (!symbol || !type || !shares) {
    return res.status(400).json({
      error: "symbol, type (BUY/SELL), and positive shares are required.",
    });
  }

  const normalizedSymbol = symbol.trim().toUpperCase();
  const normalizedType = type.trim().toUpperCase();
  const parsedShares = Number(shares);

  if (!["BUY", "SELL"].includes(normalizedType)) {
    return res
      .status(400)
      .json({ error: "Order type must be either BUY or SELL." });
  }

  if (isNaN(parsedShares) || parsedShares <= 0) {
    return res
      .status(400)
      .json({ error: "Shares must be a valid positive number." });
  }

  // Check valid market price
  const executionPrice = getLivePrice(normalizedSymbol);
  if (!executionPrice) {
    return res.status(400).json({
      error: `Unsupported equity ticker: ${normalizedSymbol}. Available: ${Object.keys(
        MARKET_PRICES,
      ).join(", ")}`,
    });
  }

  const totalCost = Number((parsedShares * executionPrice).toFixed(2));

  try {
    const db = await getDb();

    // Start SQL atomic transaction
    await db.exec("BEGIN TRANSACTION");

    const summary = await db.get(
      "SELECT cash_balance FROM portfolio_summary WHERE id = 1",
    );
    const currentCash = summary ? summary.cash_balance : 0;

    if (normalizedType === "BUY") {
      if (currentCash < totalCost) {
        await db.exec("ROLLBACK");
        return res.status(400).json({
          error: `Insufficient funds. Cost is $${totalCost.toLocaleString()}, but cash available is $${currentCash.toLocaleString()}.`,
        });
      }

      // Deduct cash
      await db.run(
        "UPDATE portfolio_summary SET cash_balance = cash_balance - ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
        [totalCost],
      );
    } else if (normalizedType === "SELL") {
      // Calculate current shares owned for this ticker
      const tradeHistory = await db.all(
        "SELECT type, shares FROM trades WHERE symbol = ?",
        [normalizedSymbol],
      );

      let ownedShares = 0;
      for (const t of tradeHistory) {
        if (t.type === "BUY") ownedShares += t.shares;
        if (t.type === "SELL") ownedShares -= t.shares;
      }

      if (ownedShares < parsedShares) {
        await db.exec("ROLLBACK");
        return res.status(400).json({
          error: `Insufficient shares. You own ${ownedShares.toFixed(
            4,
          )} shares of ${normalizedSymbol}, but attempted to sell ${parsedShares}.`,
        });
      }

      // Add cash from proceeds
      await db.run(
        "UPDATE portfolio_summary SET cash_balance = cash_balance + ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1",
        [totalCost],
      );
    }

    // Insert trade ledger record
    const result = await db.run(
      `INSERT INTO trades (symbol, type, shares, price, total_cost) 
       VALUES (?, ?, ?, ?, ?)`,
      [
        normalizedSymbol,
        normalizedType,
        parsedShares,
        executionPrice,
        totalCost,
      ],
    );

    // Commit changes
    await db.exec("COMMIT");

    res.status(201).json({
      message: `Successfully executed ${normalizedType} order for ${parsedShares} shares of ${normalizedSymbol}.`,
      trade: {
        id: result.lastID,
        symbol: normalizedSymbol,
        type: normalizedType,
        shares: parsedShares,
        price: executionPrice,
        totalCost: totalCost,
      },
    });
  } catch (err) {
    const db = await getDb();
    await db.exec("ROLLBACK");
    console.error("Trade execution failed:", err);
    res
      .status(500)
      .json({ error: "Trade transaction failed and was rolled back." });
  }
}

/**
 * Controller: Rebalance portfolio positions to match target percentages
 */
async function rebalancePositions(req, res) {
  const { allocations } = req.body;
  // allocations format expected: { AAPL: 50, MSFT: 50 } (percentages summing to 100)

  if (!allocations || typeof allocations !== "object") {
    return res.status(400).json({
      error: 'Allocations object required (e.g. { "AAPL": 50, "MSFT": 50 }).',
    });
  }

  // Validate percentages sum to ~100%
  const totalPercent = Object.values(allocations).reduce(
    (acc, val) => acc + Number(val),
    0,
  );
  if (Math.abs(totalPercent - 100) > 0.01) {
    return res.status(400).json({
      error: `Allocations must sum to 100%. Currently sums to ${totalPercent}%.`,
    });
  }

  try {
    const db = await getDb();

    // 1. Calculate current total portfolio equity
    const summary = await db.get(
      "SELECT cash_balance FROM portfolio_summary WHERE id = 1",
    );
    let cash = summary ? summary.cash_balance : 0;

    const trades = await db.all("SELECT * FROM trades");
    const ownedSharesMap = {};

    for (const t of trades) {
      const sym = t.symbol.toUpperCase();
      ownedSharesMap[sym] =
        (ownedSharesMap[sym] || 0) + (t.type === "BUY" ? t.shares : -t.shares);
    }

    let equityValue = 0;
    for (const sym in ownedSharesMap) {
      if (ownedSharesMap[sym] > 0) {
        const p = getLivePrice(sym) || MARKET_PRICES[sym] || 100;
        equityValue += ownedSharesMap[sym] * p;
      }
    }

    const totalPortfolioValue = cash + equityValue;
    const actionsTaken = [];

    // Perform rebalance inside transaction
    await db.exec("BEGIN TRANSACTION");

    // 2. Execute sells first to free up cash
    for (const [sym, targetPercent] of Object.entries(allocations)) {
      const price = getLivePrice(sym);
      if (!price) continue;

      const targetValue = (targetPercent / 100) * totalPortfolioValue;
      const currentShares = ownedSharesMap[sym] || 0;
      const currentValue = currentShares * price;
      const diffValue = targetValue - currentValue;

      if (diffValue < -1) {
        // Needs selling
        const sharesToSell = Number((Math.abs(diffValue) / price).toFixed(4));
        const sellProceeds = Number((sharesToSell * price).toFixed(2));

        await db.run(
          "UPDATE portfolio_summary SET cash_balance = cash_balance + ? WHERE id = 1",
          [sellProceeds],
        );
        await db.run(
          'INSERT INTO trades (symbol, type, shares, price, total_cost) VALUES (?, "SELL", ?, ?, ?)',
          [sym, sharesToSell, price, sellProceeds],
        );
        actionsTaken.push(`Sold ${sharesToSell} ${sym} for $${sellProceeds}`);
        cash += sellProceeds;
      }
    }

    // 3. Execute buys with freed cash
    for (const [sym, targetPercent] of Object.entries(allocations)) {
      const price = getLivePrice(sym);
      if (!price) continue;

      const targetValue = (targetPercent / 100) * totalPortfolioValue;
      const currentShares = ownedSharesMap[sym] || 0;
      const currentValue = currentShares * price;
      const diffValue = targetValue - currentValue;

      if (diffValue > 1 && cash >= 1) {
        // Needs buying
        const investAmount = Math.min(diffValue, cash);
        const sharesToBuy = Number((investAmount / price).toFixed(4));
        const buyCost = Number((sharesToBuy * price).toFixed(2));

        if (sharesToBuy > 0 && buyCost <= cash) {
          await db.run(
            "UPDATE portfolio_summary SET cash_balance = cash_balance - ? WHERE id = 1",
            [buyCost],
          );
          await db.run(
            'INSERT INTO trades (symbol, type, shares, price, total_cost) VALUES (?, "BUY", ?, ?, ?)',
            [sym, sharesToBuy, price, buyCost],
          );
          actionsTaken.push(`Bought ${sharesToBuy} ${sym} for $${buyCost}`);
          cash -= buyCost;
        }
      }
    }

    await db.exec("COMMIT");

    res.json({
      message: "Portfolio successfully rebalanced to targets.",
      actions: actionsTaken,
    });
  } catch (err) {
    const db = await getDb();
    await db.exec("ROLLBACK");
    console.error("Rebalance failed:", err);
    res
      .status(500)
      .json({ error: "Rebalancing transaction failed and was rolled back." });
  }
}

module.exports = {
  getPortfolioSummary,
  executeTrade,
  rebalancePositions,
};
