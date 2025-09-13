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
    const totalTiles = rows * cols
    const safeTiles = totalTiles - minesCount
    if (safeClicks === 0) return 0

    // Base fair odds
    let multiplier =
      (totalTiles / safeTiles) *
      (safeTiles / (safeTiles - 1)) ** (safeClicks - 1)

    // Apply house edge
    multiplier *= 0.99

    // Force negative EV early
    if (safeClicks === 1) multiplier *= 0.65
    if (safeClicks === 2) multiplier *= 0.75
    if (safeClicks === 3) multiplier *= 0.9

    // Later picks scale more with fewer mines
    if (safeClicks > 3) {
      const boost = 1 + (5 - minesCount) * 0.02 * safeClicks
      multiplier *= boost
    }

    return parseFloat((baseBet * multiplier).toFixed(2))
  }

  // UI + logic (placeholder for brevity)
  return (
    <div className="p-4">
      <h2>Mines</h2>
      <p>Stake: {stake}</p>
      <p>Profit: {profit}</p>
    </div>
  )
}

export default MinesPanel
