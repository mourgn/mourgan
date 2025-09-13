import React, { useState } from 'react'

function MinesPanel({ balance, setBalance, pushResult, globalLock, setGlobalLock }) {
  const rows = 5, cols = 5, total = rows * cols
  const [mines, setMines] = useState(3)
  const [stake, setStake] = useState(10)
  const [tiles, setTiles] = useState([])
  const [revealed, setRevealed] = useState([])
  const [inGame, setInGame] = useState(false)
  const [safeClicks, setSafeClicks] = useState(0)

  function calcPayout(safeClicks, baseBet, minesCount, totalTiles) {
    const safeTiles = totalTiles - minesCount
    if (safeClicks === 0) return baseBet

    const odds = (safeTiles - safeClicks + 1) / (totalTiles - safeClicks + 1)
    const stakeLikeMultiplier = (1 / odds) * 0.99

    const penaltyStretch = Math.max(3, Math.floor((25 - minesCount) / 2))

    if (safeClicks <= penaltyStretch) {
      const forced = 0.6 + (safeClicks / penaltyStretch) * 0.35
      return baseBet * forced
    }

    const scaling = 0.5 + safeClicks / (safeTiles * 0.9)
    return baseBet * (stakeLikeMultiplier * scaling)
  }

  function startGame() {
    if (globalLock || stake > balance) return
    setGlobalLock(true)
    setBalance(b => b - stake)
    const minePositions = new Set()
    while (minePositions.size < mines) {
      minePositions.add(Math.floor(Math.random() * total))
    }
    setTiles(Array.from(minePositions))
    setRevealed([])
    setSafeClicks(0)
    setInGame(true)
    setGlobalLock(false)
  }

  function clickTile(idx) {
    if (!inGame || revealed.includes(idx)) return
    setRevealed(r => [...r, idx])
    if (tiles.includes(idx)) {
      setInGame(false)
      pushResult(-stake)
    } else {
      const newSafe = safeClicks + 1
      setSafeClicks(newSafe)
      const payout = calcPayout(newSafe, stake, mines, total)
      if (newSafe === total - mines) {
        setInGame(false)
        setBalance(b => b + payout)
        pushResult(payout - stake)
      }
    }
  }

  function cashOut() {
    if (!inGame) return
    const payout = calcPayout(safeClicks, stake, mines, total)
    setBalance(b => b + payout)
    pushResult(payout - stake)
    setInGame(false)
  }

  return (
    <div className="p-4 flex flex-col items-center">
      <div className="grid grid-cols-5 gap-2 w-full max-w-lg">
        {Array.from({ length: total }).map((_, idx) => {
          const isRevealed = revealed.includes(idx)
          const isMine = tiles.includes(idx)
          return (
            <button
              key={idx}
              onClick={() => clickTile(idx)}
              disabled={!inGame}
              className="aspect-square w-full rounded-2xl bg-purple-900/30 backdrop-blur-md hover:scale-105 transition-transform text-2xl flex items-center justify-center"
            >
              {isRevealed ? (isMine ? '💣' : '✓') : ''}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex gap-4 items-center">
        {!inGame ? (
          <button className="btn primary" onClick={startGame}>Start</button>
        ) : (
          <button className="btn primary" onClick={cashOut}>Cash Out</button>
        )}
        <input
          type="number"
          value={stake}
          min={1}
          onChange={e => setStake(Number(e.target.value))}
          className="input"
        />
        <input
          type="number"
          value={mines}
          min={1}
          max={24}
          onChange={e => setMines(Number(e.target.value))}
          className="input"
        />
      </div>
    </div>
  )
}

export default MinesPanel
