
import React, { useState, useEffect, useRef } from 'react';
import { crashDistribution, minesConfig } from './config';

function CrashGame({ balance, setBalance }) {
  const [phase, setPhase] = useState('idle');
  const [multiplier, setMultiplier] = useState(0);
  const [bet, setBet] = useState(10);
  const [cashout, setCashout] = useState(null);
  const crashPoint = useRef(null);
  const interval = useRef(null);

  useEffect(() => {
    if (phase === 'playing') {
      crashPoint.current = Math.random() < crashDistribution.houseEdge
        ? 0
        : Math.max(0.6, -Math.log(Math.random()) * (1 - crashDistribution.houseEdge));
      setMultiplier(0);
      interval.current = setInterval(() => {
        setMultiplier(prev => {
          if (prev >= crashPoint.current) {
            clearInterval(interval.current);
            setPhase('crashed');
            if (!cashout) setBalance(b => b - bet);
            return prev;
          }
          return +(prev + 0.01).toFixed(2);
        });
      }, 100);
    }
    return () => clearInterval(interval.current);
  }, [phase]);

  const startOrCashout = () => {
    if (phase === 'idle') {
      setPhase('playing');
    } else if (phase === 'playing') {
      setCashout(multiplier);
      setBalance(b => b + bet * multiplier);
      setPhase('idle');
    }
  };

  return (
    <div className="p-4 glass rounded-2xl text-center">
      <h2>Crash</h2>
      <p>Multiplier: {multiplier.toFixed(2)}x</p>
      <button onClick={startOrCashout}>
        {phase === 'idle' ? 'Start' : 'Cash Out'}
      </button>
    </div>
  );
}

function MinesGame({ balance, setBalance }) {
  const rows = 5, cols = 5;
  const [revealed, setRevealed] = useState(Array(rows * cols).fill(false));
  const [stake, setStake] = useState(10);
  const [mines, setMines] = useState(3);
  const [safeClicks, setSafeClicks] = useState(0);

  const calcPayout = (safe) => {
    const totalTiles = rows * cols;
    const safeTiles = totalTiles - mines;
    let multiplier = minesConfig.baseMultiplier;
    for (let i = 0; i < safe; i++) {
      multiplier *= (safeTiles - i) / (totalTiles - i);
    }
    return +(multiplier * (1 - minesConfig.houseEdge)).toFixed(2);
  };

  const clickTile = (i) => {
    if (revealed[i]) return;
    setRevealed(r => {
      const newR = [...r];
      newR[i] = true;
      return newR;
    });
    if (Math.random() < mines / (rows * cols)) {
      setBalance(b => b - stake);
    } else {
      setSafeClicks(s => s + 1);
    }
  };

  const cashout = () => {
    const payout = stake * calcPayout(safeClicks);
    setBalance(b => b + payout);
    setSafeClicks(0);
    setRevealed(Array(rows * cols).fill(false));
  };

  return (
    <div className="p-4 glass rounded-2xl text-center">
      <h2>Mines</h2>
      <div className="grid grid-cols-5 gap-2">
        {revealed.map((r, i) => (
          <button key={i} onClick={() => clickTile(i)}
            className="aspect-square bg-purple-900/30 rounded-2xl">
            {r ? '✓' : ''}
          </button>
        ))}
      </div>
      <button onClick={cashout} className="mt-4">Cash Out</button>
    </div>
  );
}

export default function App() {
  const [balance, setBalance] = useState(100);

  return (
    <div className="p-6 grid gap-6">
      <h1 className="text-2xl font-bold">Mourgan Casino</h1>
      <p>Balance: ${balance.toFixed(2)}</p>
      <CrashGame balance={balance} setBalance={setBalance} />
      <MinesGame balance={balance} setBalance={setBalance} />
    </div>
  );
}
