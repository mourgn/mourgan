import React, { useState, useEffect, useRef } from 'react';

/* ================= MinesPanel ================= */
function MinesPanel({ balance, setBalance, pushResult, globalLock, setGlobalLock }) {
  const rows = 5, cols = 5, total = rows * cols;
  const [mines, setMines] = useState(3);
  const [stake, setStake] = useState(10);
  const [tiles, setTiles] = useState(Array(total).fill(null));
  const [revealed, setRevealed] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [profit, setProfit] = useState(0);

  function calcPayout(safeRevealed, baseBet, minesCount) {
    const totalTiles = rows * cols;
    const safeTiles = totalTiles - minesCount;

    let multiplier = 1;
    for (let i = 0; i < safeRevealed; i++) {
      multiplier *= (safeTiles - i) / (totalTiles - i);
    }

    // House edge
    multiplier *= 0.985;

    const payout = parseFloat((baseBet * multiplier).toFixed(2));
    const profit = parseFloat((payout - baseBet).toFixed(2));

    return { multiplier: multiplier.toFixed(2), payout, profit };
  }

  const startGame = () => {
    if (playing) return;
    if (stake > balance) return;
    setBalance(balance - stake);
    const minePositions = new Set();
    while (minePositions.size < mines) {
      minePositions.add(Math.floor(Math.random() * total));
    }
    setTiles(Array.from({ length: total }, (_, idx) =>
      minePositions.has(idx) ? 'M' : 'S'
    ));
    setRevealed([]);
    setProfit(0);
    setPlaying(true);
    setGlobalLock(true);
  };

  const clickTile = (idx) => {
    if (!playing || revealed.includes(idx)) return;
    const newRevealed = [...revealed, idx];
    setRevealed(newRevealed);
    if (tiles[idx] === 'M') {
      setPlaying(false);
      setGlobalLock(false);
      pushResult({ game: 'Mines', bet: stake, result: -stake });
    } else {
      const { profit } = calcPayout(newRevealed.length, stake, mines);
      setProfit(profit);
    }
  };

  const cashOut = () => {
    if (!playing) return;
    const { payout, profit } = calcPayout(revealed.length, stake, mines);
    setBalance(balance + payout);
    setPlaying(false);
    setGlobalLock(false);
    pushResult({ game: 'Mines', bet: stake, result: profit });
  };

  return (
    <div>
      <h2>Mines</h2>
      <div className="grid grid-cols-5 gap-2 max-w-md mx-auto">
        {tiles.map((tile, idx) => {
          const isRevealed = revealed.includes(idx);
          const isMine = tile === 'M';
          return (
            <button
              key={idx}
              onClick={() => clickTile(idx)}
              className="aspect-square w-16 rounded-2xl bg-purple-900/30 backdrop-blur-md hover:scale-105 transition-transform text-2xl"
            >
              {isRevealed ? (isMine ? '💣' : '✓') : ''}
            </button>
          );
        })}
      </div>
      <div className="flex justify-center mt-4 gap-4">
        {!playing ? (
          <button className="btn primary" onClick={startGame}>Start</button>
        ) : (
          <button className="btn primary" onClick={cashOut}>Cash Out (+{profit})</button>
        )}
      </div>
    </div>
  );
}

export default MinesPanel;
