const express = require("express");
const router = express.Router();
const {
  getPortfolioSummary,
  executeTrade,
  rebalancePositions,
} = require("../controllers/portfolioController");

/**
 * Route: GET /api/portfolio
 * Description: Retrieves live portfolio metrics, cash balance, and open equity positions
 */
router.get("/", getPortfolioSummary);

/**
 * Route: POST /api/portfolio/trade
 * Description: Executes a market BUY or SELL order
 * Expected Body: { "symbol": "AAPL", "type": "BUY", "shares": 10 }
 */
router.post(
  "/trade",
  (req, res, next) => {
    const { symbol, type, shares } = req.body;

    // Validation check 1: Symbol must be a non-empty string
    if (!symbol || typeof symbol !== "string") {
      return res
        .status(400)
        .json({ error: 'Field "symbol" is required and must be a string.' });
    }

    // Validation check 2: Type must be BUY or SELL
    if (!type || !["BUY", "SELL"].includes(type.toUpperCase())) {
      return res
        .status(400)
        .json({ error: 'Field "type" must be either "BUY" or "SELL".' });
    }

    // Validation check 3: Shares must be a positive number
    if (shares === undefined || isNaN(Number(shares)) || Number(shares) <= 0) {
      return res
        .status(400)
        .json({ error: 'Field "shares" must be a positive number.' });
    }

    // Passed validation; proceed to controller
    next();
  },
  executeTrade,
);

/**
 * Route: POST /api/portfolio/rebalance
 * Description: Rebalances portfolio positions based on target allocation percentages
 * Expected Body: { "allocations": { "AAPL": 50, "MSFT": 50 } }
 */
router.post(
  "/rebalance",
  (req, res, next) => {
    const { allocations } = req.body;

    // Check that allocations exists and is an object
    if (
      !allocations ||
      typeof allocations !== "object" ||
      Array.isArray(allocations)
    ) {
      return res.status(400).json({
        error:
          'Field "allocations" is required and must be an object of symbol-percentage pairs.',
      });
    }

    // Passed validation; proceed to controller
    next();
  },
  rebalancePositions,
);

module.exports = router;
