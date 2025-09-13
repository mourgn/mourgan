import React, { useState, useEffect, useRef } from 'react'
import { crashDistribution } from './config'

/* ================= CrashPanel ================= */
function CrashPanel({balance,setBalance,pushResult,globalLock,setGlobalLock}){
  const [phase,setPhase] = useState('idle')
  const [multiplier,setMultiplier] = useState(0)
  const [stake,setStake] = useState(10)
  const [cashoutAt,setCashoutAt] = useState(null)
  const animRef = useRef(null)

  useEffect(()=>{
    if(phase==='playing'){
      let start = performance.now()
      function frame(now){
        let t = (now-start)/1000
        let val = t*0.8
        setMultiplier(parseFloat(val.toFixed(2)))
        if(val < crashDistribution()){
          animRef.current = requestAnimationFrame(frame)
        }else{
          setPhase('crashed')
          pushResult({game:'Crash',result:`-${stake}`})
          setBalance(b=>b-stake)
          setGlobalLock(false)
        }
      }
      animRef.current = requestAnimationFrame(frame)
      return ()=>cancelAnimationFrame(animRef.current)
    }
  },[phase])

  useEffect(()=>{
    if(phase==='playing' && cashoutAt && multiplier>=cashoutAt){
      handleCashout()
    }
  },[multiplier])

  function handleStart(){
    if(globalLock) return
    setGlobalLock(true)
    setBalance(b=>b-stake)
    setPhase('playing')
    setMultiplier(0)
    setCashoutAt(null)
  }

  function handleCashout(){
    if(phase!=='playing') return
    const profit = parseFloat((stake*multiplier).toFixed(2))
    setBalance(b=>b+profit)
    pushResult({game:'Crash',result:`+${profit}`})
    setPhase('idle')
    setGlobalLock(false)
  }

  const primaryAction = phase==='idle'?handleStart:handleCashout

  return (
    <div className="p-4">
      <div className="text-center text-3xl font-bold mb-4">{multiplier.toFixed(2)}x</div>
      <div style={{display:'flex',gap:12,alignItems:'center',justifyContent:'center'}}>
        <button className="btn primary" onClick={primaryAction}>
          {phase==='idle'?'Start': phase==='playing'?'Cash Out':'New Game'}
        </button>
      </div>
    </div>
  )
}

/* ================= MinesPanel ================= */
function MinesPanel({balance,setBalance,pushResult,globalLock,setGlobalLock}){
  const rows=5,cols=5,total=rows*cols
  const [mines,setMines] = useState(3)
  const [stake,setStake] = useState(10)
  const [revealed,setRevealed] = useState([])
  const [minePositions,setMinePositions] = useState([])
  const [phase,setPhase] = useState('idle')

  function start(){
    if(globalLock) return
    setGlobalLock(true)
    setBalance(b=>b-stake)
    setRevealed([])
    const mineSet=new Set()
    while(mineSet.size<mines){
      mineSet.add(Math.floor(Math.random()*total))
    }
    setMinePositions([...mineSet])
    setPhase('playing')
  }

  function calcProfit(safeClicks){
    if(safeClicks<=4) return parseFloat((stake* (0.05*safeClicks)).toFixed(2))
    return parseFloat((stake* Math.pow(1.15,safeClicks)).toFixed(2))
  }

  function clickTile(idx){
    if(phase!=='playing') return
    if(revealed.includes(idx)) return
    if(minePositions.includes(idx)){
      setRevealed([...revealed,idx,...minePositions])
      setPhase('lost')
      pushResult({game:'Mines',result:`-${stake}`})
      setGlobalLock(false)
    }else{
      const newRev=[...revealed,idx]
      setRevealed(newRev)
    }
  }

  function cashout(){
    if(phase!=='playing') return
    const profit=calcProfit(revealed.length)
    setBalance(b=>b+profit)
    setRevealed([...revealed,...minePositions]) // reveal bombs on cashout
    setPhase('idle')
    pushResult({game:'Mines',result:`+${profit}`})
    setGlobalLock(false)
  }

  return (
    <div className="p-4 flex flex-col items-center">
      <div className="grid gap-3" style={{gridTemplateColumns:`repeat(${cols},85px)`}}>
        {Array.from({length:total}).map((_,idx)=>{
          const isRevealed=revealed.includes(idx)
          const isMine=minePositions.includes(idx)
          return (
            <button key={idx}
              onClick={()=>clickTile(idx)}
              className="aspect-square w-20 h-20 rounded-xl bg-purple-900/30 backdrop-blur-md hover:scale-105 transition-transform text-3xl flex items-center justify-center">
              {isRevealed ? (isMine?'💣':'✓') : ''}
            </button>
          )
        })}
      </div>
      <div className="mt-4 flex justify-center">
        <button className="btn primary" onClick={phase==='playing'?cashout:start}>
          {phase==='playing'?'Cash Out':'Start'}
        </button>
      </div>
    </div>
  )
}

export default function App(){
  const [tab,setTab] = useState('crash')
  const [balance,setBalance] = useState(1000)
  const [history,setHistory] = useState([])
  const [globalLock,setGlobalLock] = useState(false)

  function pushResult(r){
    setHistory(h=>[r,...h.slice(0,9)])
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-purple-900 to-purple-800 text-white">
      <div className="flex justify-center space-x-4 p-4">
        <button className={`btn ${tab==='crash'?'primary':''}`} onClick={()=>setTab('crash')}>Crash</button>
        <button className={`btn ${tab==='mines'?'primary':''}`} onClick={()=>setTab('mines')}>Mines</button>
        <button className={`btn ${tab==='history'?'primary':''}`} onClick={()=>setTab('history')}>History</button>
      </div>
      <div className="text-center mb-4">Balance: ${balance.toFixed(2)}</div>
      {tab==='crash' && <CrashPanel balance={balance} setBalance={setBalance} pushResult={pushResult} globalLock={globalLock} setGlobalLock={setGlobalLock}/>}
      {tab==='mines' && <MinesPanel balance={balance} setBalance={setBalance} pushResult={pushResult} globalLock={globalLock} setGlobalLock={setGlobalLock}/>}
      {tab==='history' && (
        <div className="p-4">
          {history.map((h,i)=>(<div key={i} className={h.result.startsWith('+')?'text-green-400':'text-red-400'}>{h.game}: {h.result}</div>))}
        </div>
      )}
    </div>
  )
}
