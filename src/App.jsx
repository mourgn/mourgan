import React, { useState } from 'react'

/* ================= MinesPanel ================= */
function MinesPanel({ balance, setBalance, pushResult, globalLock, setGlobalLock }) {
  const rows = 5, cols = 5, total = rows * cols
  const [mines, setMines] = useState(3)
  const [stake, setStake] = useState(10)
  const [revealed, setRevealed] = useState([])
  const [bombs, setBombs] = useState([])
  const [phase, setPhase] = useState('idle')
  const [profit, setProfit] = useState(0)

  function calcPayout(safeClicks, baseBet, minesCount) {
    const totalTiles = rows * cols;
    const safeTiles = totalTiles - minesCount;
    if (safeClicks === 0) return 0;

    // Base stake-like multiplier
    let multiplier =
      (totalTiles / safeTiles) *
      (safeTiles / (safeTiles - 1)) ** (safeClicks - 1);

    // Apply house edge
    multiplier *= 0.99;

    // Early loss stretch length depends on mine count
    const penaltyStretch = Math.max(2, 6 - minesCount);

    if (safeClicks <= penaltyStretch) {
      // Scale down progressively so it starts <1x and creeps upward
      const penaltyCurve = [0.65, 0.75, 0.9, 0.95];
      multiplier *= penaltyCurve[Math.min(safeClicks - 1, penaltyCurve.length - 1)];
    } else {
      // Ensure monotonic growth: never drop below previous payout
      const prev = calcPayout(safeClicks - 1, baseBet, minesCount) / baseBet;
      if (multiplier < prev) multiplier = prev * 1.05; // small upward bump
    }

    return parseFloat((baseBet * multiplier).toFixed(2));
  }

  return (
    <div className="p-4">
      <h2>Mines</h2>
      <p>Stake: {stake}</p>
      <p>Profit: {profit}</p>
    </div>
  )
}

export default MinesPanel
