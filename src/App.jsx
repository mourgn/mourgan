
import React, { useState, useEffect } from 'react';

export default function App() {
  const [multiplier, setMultiplier] = useState(1.0);
  const [running, setRunning] = useState(false);
  const [intervalId, setIntervalId] = useState(null);
  const [cashout, setCashout] = useState(null);
  const [profit, setProfit] = useState(0);

  useEffect(() => {
    if (running) {
      const id = setInterval(() => {
        setMultiplier(prev => {
          const next = prev + 0.01;
          return parseFloat(next.toFixed(3));
        });
      }, 100);
      setIntervalId(id);
    } else {
      if (intervalId) clearInterval(intervalId);
    }
    return () => intervalId && clearInterval(intervalId);
  }, [running]);

  const startGame = () => {
    setMultiplier(0.000);
    setCashout(null);
    setRunning(true);
  };

  const cashOutGame = () => {
    setRunning(false);
    setCashout(multiplier);
    // Fixed formula: payout = bet * multiplier, no +1
    const bet = 10;
    setProfit((multiplier * bet) - bet);
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif', color: 'white', background: 'black', height: '100vh' }}>
      <h1>Crash Game Fix</h1>
      <p>Multiplier: {multiplier.toFixed(3)}x</p>
      <button onClick={startGame} disabled={running}>Start</button>
      <button onClick={cashOutGame} disabled={!running}>Cash Out</button>
      {cashout && <p>Cashed out at: {cashout.toFixed(3)}x — Profit: {profit.toFixed(2)}</p>}
    </div>
  );
}
