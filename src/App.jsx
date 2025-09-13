
import React, { useState, useEffect } from 'react';
import { crashDistribution } from './config';

/* ================= CrashPanel ================= */
function CrashPanel({balance, setBalance, pushResult, globalLock, setGlobalLock}) {
  const [phase, setPhase] = useState('idle')
  const [multiplier, setMultiplier] = useState(0.00)
  const [intervalId, setIntervalId] = useState(null)
  const [stake, setStake] = useState(10)
  const [cashed, setCashed] = useState(false)

  useEffect(()=>{
    if (phase === 'playing'){
      let crashAt = crashDistribution()
      let start = Date.now()
      const id = setInterval(()=>{
        let elapsed = (Date.now() - start) / 1000
        let next = elapsed * 0.5
        if(next >= crashAt){
          clearInterval(id)
          setIntervalId(null)
          setPhase('crashed')
          if(!cashed){
            setBalance(b => b - stake)
            pushResult(-stake)
          }
        } else {
          setMultiplier(next)
        }
      }, 100)
      setIntervalId(id)
      return ()=>clearInterval(id)
    }
  }, [phase])

  function primaryAction(){
    if (globalLock) return
    if (phase === 'idle'){
      setGlobalLock(true)
      setPhase('playing')
      setMultiplier(0.00)
      setCashed(false)
    } else if (phase === 'playing'){
      let profit = parseFloat((stake * multiplier).toFixed(2))
      setBalance(b => b + profit)
      pushResult(profit)
      setCashed(true)
      setPhase('idle')
      setGlobalLock(false)
      if(intervalId) clearInterval(intervalId)
    } else {
      setPhase('idle')
      setGlobalLock(false)
    }
  }

  return (
    <div className="panel">
      <h2>Crash</h2>
      <div className="multiplier">{multiplier.toFixed(2)}x</div>
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <input type="number" value={stake} onChange={e=>setStake(Number(e.target.value))}/>
        <button className={'btn primary'} onClick={primaryAction}>
          {phase==='idle'?'Start': phase==='playing'?'Cash Out':'New Game'}
        </button>
      </div>
    </div>
  )
}

/* ================= MinesPanel ================= */
function MinesPanel({balance, setBalance, pushResult, globalLock, setGlobalLock}) {
  const rows = 5, cols = 5, total = rows * cols
  const [mines, setMines] = useState(3)
  const [stake, setStake] = useState(10)
  const [board, setBoard] = useState([])
  const [revealed, setRevealed] = useState([])
  const [playing, setPlaying] = useState(false)

  useEffect(()=>{
    if (!playing){
      setBoard([])
      setRevealed([])
    }
  }, [playing])

  function startGame(){
    if(globalLock) return
    setGlobalLock(true)
    let mineSet = new Set()
    while(mineSet.size < mines){
      mineSet.add(Math.floor(Math.random()*total))
    }
    setBoard(Array.from(mineSet))
    setRevealed([])
    setPlaying(true)
    setBalance(b => b - stake)
  }

  function stopGame(){
    let profit = calcPayout(revealed.length, stake, mines)
    setBalance(b => b + profit)
    pushResult(profit - stake)
    setPlaying(false)
    setGlobalLock(false)
  }

  function clickTile(idx){
    if(!playing) return
    if(revealed.includes(idx)) return
    if(board.includes(idx)){
      setRevealed(r => [...r, idx])
      setPlaying(false)
      setGlobalLock(false)
      pushResult(-stake)
    } else {
      setRevealed(r => [...r, idx])
    }
  }

  // Updated payout logic using Stake formula
  function calcPayout(safeClicks, baseBet, minesCount){
    const totalTiles = total
    const safeTiles = totalTiles - minesCount

    if (safeClicks === 0) return 0

    let numerator = 1
    let denominator = 1
    for (let i=0;i<safeClicks;i++){
      numerator *= (safeTiles - i)
      denominator *= (totalTiles - i)
    }
    let multiplier = numerator / denominator * (totalTiles / safeTiles)

    return parseFloat((baseBet * multiplier).toFixed(2))
  }

  return (
    <div className="panel">
      <h2>Mines</h2>
      <div style={{display:'grid',gridTemplateColumns:`repeat(${cols},1fr)`,gap:8}}>
        {Array.from({length:total}).map((_,idx)=>{
          const isRevealed = revealed.includes(idx)
          const isMine = board.includes(idx)
          return (
            <button
              key={idx}
              onClick={()=>clickTile(idx)}
              className="aspect-square w-full rounded-2xl bg-purple-900/30 backdrop-blur-md hover:scale-105 transition-transform text-2xl"
            >
              {isRevealed ? (isMine ? '💣' : '✓') : ''}
            </button>
          )
        })}
      </div>
      <div style={{display:'flex',gap:12,alignItems:'center',justifyContent:'center',marginTop:'12px'}}>
        <input type="number" value={stake} onChange={e=>setStake(Number(e.target.value))}/>
        {!playing ?
          <button className={'btn primary'} onClick={startGame}>Start</button> :
          <button className={'btn primary'} onClick={stopGame}>Cash Out</button>
        }
      </div>
    </div>
  )
}

/* ================= MainApp ================= */
export default function App(){
  const [balance, setBalance] = useState(1000)
  const [results, setResults] = useState([])
  const [globalLock, setGlobalLock] = useState(false)

  function pushResult(val){
    setResults(r => [val,...r].slice(0,10))
  }

  return (
    <div className="app">
      <h1 className="title">Mourgan Casino</h1>
      <div className="balance">Balance: ${balance.toFixed(2)}</div>
      <div className="game-panels">
        <CrashPanel balance={balance} setBalance={setBalance} pushResult={pushResult} globalLock={globalLock} setGlobalLock={setGlobalLock}/>
        <MinesPanel balance={balance} setBalance={setBalance} pushResult={pushResult} globalLock={globalLock} setGlobalLock={setGlobalLock}/>
      </div>
      <div className="recent">
        <h3>Recent</h3>
        <ul>
          {results.map((r,i)=>(
            <li key={i} style={{color:r>=0?'lime':'red'}}>{r>=0?`+${r.toFixed(2)}`:r.toFixed(2)}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
