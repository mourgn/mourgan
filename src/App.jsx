
import React, { useEffect, useRef, useState } from 'react'

// Helpers for localStorage/sessionStorage
const LS_KEY = 'casino_v6_history_v2' // stores {stats, records}
const SESSION_BALANCE = 'casino_v6_balance'

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return { stats: { totalBet:0, totalWon:0, totalLost:0, totalToppedUp:0 }, records: [] }
    return JSON.parse(raw)
  }catch(e){ return { stats: { totalBet:0, totalWon:0, totalLost:0, totalToppedUp:0 }, records: [] } }
}
function saveState(obj){ try{ localStorage.setItem(LS_KEY, JSON.stringify(obj)) }catch(e){} }

export default function App(){
  const [view, setView] = useState('crash') // crash | mines | history
  const [data, setData] = useState(()=> loadState())
  const [balance, setBalance] = useState(()=> {
    const raw = sessionStorage.getItem(SESSION_BALANCE)
    return raw ? Number(raw) : 1000
  })
  useEffect(()=> sessionStorage.setItem(SESSION_BALANCE, String(balance)), [balance])

  // global lock to prevent multiple games simultaneously
  const [globalLock, setGlobalLock] = useState(false)

  // helper to push result into history & stats
  function pushResult(result){
    setData(prev=>{
      const next = { stats: {...prev.stats}, records: [...prev.records, result] }
      // update totals
      next.stats.totalBet = (next.stats.totalBet || 0) + (result.bet || 0)
      // count net profit only
      const net = (result.profit || 0)
      if (net > 0) next.stats.totalWon = (next.stats.totalWon || 0) + net
      if (net < 0) next.stats.totalLost = (next.stats.totalLost || 0) + Math.abs(net)
      saveState(next)
      return next
    })
  }

  // top up handler:  adds +100 and increments totalToppedUp
  function doTopUp(){
    setBalance(b => {
      const nb = Math.round((b + 100)*100)/100
      setData(prev=> {
        const copy = { stats: {...prev.stats}, records: [...prev.records] }
        copy.stats.totalToppedUp = (copy.stats.totalToppedUp || 0) + 100
        saveState(copy)
        return copy
      })
      return nb
    })
  }

  // helper to push record and also update stats totals for immediate UI (when top-up applied, we handled above; for wins/losses pushResult handles it)
  useEffect(()=> saveState(data), [data])

  return (
    <div className="app">
      <aside className="sidebar panel">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
          <div><strong style={{fontSize:18}}>GAMES</strong></div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <button className={'nav-btn ' + (view==='crash' ? 'active' : '')} onClick={()=>setView('crash')}>Crash</button>
          <button className={'nav-btn ' + (view==='mines' ? 'active' : '')} onClick={()=>setView('mines')}>Mines</button>
          <button className={'nav-btn ' + (view==='history' ? 'active' : '')} onClick={()=>setView('history')}>History</button>
        </div>

        <div style={{marginTop:18}} className="small">Recent</div>
        <div className="recent-list">
          {data.records.length === 0 && <div className="small" style={{padding:8}}>No plays yet</div>}
          {data.records.slice(-10).reverse().map((r, idx)=> (
            <div key={idx} className={'recent-item ' + (r.profit>=0? 'win' : 'loss')}>
              <div style={{fontSize:13}}>{r.game}</div>
              <div style={{fontSize:13}}>{r.profit>=0?`+${r.profit.toFixed(2)}`: `-${Math.abs(r.profit).toFixed(2)}`}</div>
            </div>
          ))}
        </div>
      </aside>

      <div style={{flex:1, display:'flex', flexDirection:'column'}}>
        <header className="header">
          <div style={{fontWeight:800, fontSize:18}}>Mourgan — </div>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <div style={{textAlign:'right'}} className="small"><div>Player1</div><div style={{fontWeight:800}}>${balance.toFixed(2)}</div></div>
            <div>
              <button className="btn primary" onClick={doTopUp}>+ TOP UP</button>
            </div>
          </div>
        </header>

        <main className="main">
          <div className="panel" style={{flex:1, minHeight:440}}>
            {view==='crash' && <CrashPanel balance={balance} setBalance={setBalance} pushResult={pushResult} globalLock={globalLock} setGlobalLock={setGlobalLock} />}
            {view==='mines' && <MinesPanel balance={balance} setBalance={setBalance} pushResult={pushResult} globalLock={globalLock} setGlobalLock={setGlobalLock} />}
            {view==='history' && <HistoryPanel data={data} />}
          </div>
        </main>
      </div>
    </div>
  )
}

/* ================= CrashPanel ================= */
function CrashPanel({balance, setBalance, pushResult, globalLock, setGlobalLock}){
  const [bet, setBet] = useState(10)
  const [isRunning, setIsRunning] = useState(false)
  const [multiplier, setMultiplier] = useState(1.00)
  const [cashedAt, setCashedAt] = useState(null)
  const rafRef = useRef(null)
  const lastRef = useRef(null)
  const multiplierRef = useRef(1.00)
  const [target, setTarget] = useState(2.0)
  const baseSpeedRef = useRef(0.7) // tuning value
  const accel = 1.6 // exponent for speed growth

  useEffect(()=>{
    return ()=>{ if(rafRef.current) cancelAnimationFrame(rafRef.current) }
  },[])

  function computeTargetFromSeed(){
    // generate a random-ish crash point using Math.random ()
    const r = Math.random()
    const val = 1 + Math.pow(1 - r, -1.1) * 0.6
    return Math.round(Math.max(1.01, val) * 1000) / 1000
  }

  function start(){
    if (isRunning || bet <= 0) return
    if (bet > balance){ alert('Insufficient balance'); return }
    // deduct bet immediately
    setBalance(b => Math.round((b - bet)*100)/100)
    setCashedAt(null)
    setIsRunning(true)
    setMultiplier(1.00)
    multiplierRef.current = 1.00
    lastRef.current = null
    const t = computeTargetFromSeed()
    setTarget(t)
    // start RAF
    rafRef.current = requestAnimationFrame(tick)
    setGlobalLock(true)
  }

  function tick(ts){
    if (!lastRef.current) lastRef.current = ts
    const dt = (ts - lastRef.current) / 1000
    lastRef.current = ts
    // speed grows as multiplier grows (not based on target)
    const speed = baseSpeedRef.current * Math.pow(Math.max(1, multiplierRef.current), accel - 1)
    const next = multiplierRef.current + dt * speed
    multiplierRef.current = Math.round(next * 1000) / 1000
    setMultiplier(multiplierRef.current)

    // bust check
    if (multiplierRef.current >= target){
      // bust event
      setIsRunning(false)
      setGlobalLock(false)
      // if player didn't cash out, they lose (bet already deducted)
      if (cashedAt === null){
        const record = { game: 'Crash', bet: bet, payout: 0, profit: -bet, time: Date.now() }
        pushResult(record)
      }
      // stop RAF and reset
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      lastRef.current = null
      return
    }
    // continue
    rafRef.current = requestAnimationFrame(tick)
  }

  function doCashout(){
    if (!isRunning || cashedAt !== null) return
    const m = multiplierRef.current || multiplier
    const payout = Math.round(bet * m * 100) / 100
    const profit = Math.round((payout - bet) * 100) / 100
    setBalance(b => Math.round((b + payout) * 100) / 100)
    setCashedAt(m)
    // record result now (user explicitly cashed out)
    pushResult({ game: 'Crash', bet: bet, payout: payout, profit: profit, time: Date.now() })
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <div style={{display:'flex',flexDirection:'column'}}>
          <label className="small">Bet</label>
          <input className="input" type="number" value={bet} onChange={e=>setBet(Number(e.target.value)||0)} />
        </div>
        <div style={{marginLeft:'auto'}} className="small">Target (hidden)</div>
        <div>
          <button className="btn primary" onClick={start} disabled={isRunning || globalLock}>Start</button>
        </div>
        <div>
          <button className="btn ghost" onClick={doCashout} disabled={!isRunning || cashedAt!==null}>Cash Out</button>
        </div>
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:220}} className="panel">
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:56,fontWeight:900}}>{(Math.max(0, multiplier - 1)).toFixed(3)}x</div>
          <div className="small" style={{marginTop:8}}>{isRunning ? 'RUNNING' : cashedAt ? `Cashed at ${Math.max(0, (cashedAt - 1)).toFixed(3)}x` : 'READY'}</div>
        </div>
      </div>
    </div>
  )
}

/* ================= MinesPanel ================= */
function MinesPanel({balance, setBalance, pushResult, globalLock, setGlobalLock}){
  const rows = 5, cols = 5, total = rows * cols
  const [mines, setMines] = useState(3)
  const [stake, setStake] = useState(10)
  const [revealed, setRevealed] = useState({})
  const [minePositions, setMinePositions] = useState([])
  const [phase, setPhase] = useState('idle') // idle | playing | cashed | lost
  const [lastPayout, setLastPayout] = useState(null)

  useEffect(()=> generatePositions(), [mines])

  function generatePositions(){
    const pos = new Set()
    while(pos.size < Math.max(1, Math.min(mines, total-1))) pos.add(Math.floor(Math.random()*total))
    setMinePositions(Array.from(pos))
    setRevealed({}); setPhase('idle'); setLastPayout(null)
  }

  function startRound(){
    if (phase === 'playing') return
    if (stake <= 0) return
    if (stake > balance){ alert('Insufficient balance'); return }
    // deduct stake immediately
    setBalance(b => Math.round((b - stake) * 100) / 100)
    setPhase('playing')
    setRevealed({})
    setLastPayout(null)
    setGlobalLock(true)
  }

  function clickTile(idx){
    if (phase !== 'playing') return
    if (revealed[idx]) return
    setRevealed(r => ({ ...r, [idx]: true }))
    if (minePositions.includes(idx)){
      // hit mine -> lost
      const all = {}
      for(let i=0;i<total;i++) all[i]=true
      setRevealed(all)
      setPhase('lost')
      setLastPayout(0)
      // record loss (stake already deducted)
      pushResult({ game: 'Mines', bet: stake, payout: 0, profit: -stake, time: Date.now() })
      setTimeout(()=>{ setGlobalLock(false); generatePositions() }, 700)
    }
  }

  function computeMultiplier(safeRevealed){
    // dynamic multiplier: lower profit for small mine counts
    const safeTotal = total - mines
    const mineFactor = 0.18 + (mines / total) * 1.1
    const perSafe = 0.28 * mineFactor
    const base = 1 + safeRevealed * perSafe * (safeTotal / Math.max(1, safeTotal))
    const multiplier = Math.max(0, base * (1 - 0.06))
    return multiplier
  }

  function computeLive(){
    const revealedCount = Object.keys(revealed).length
    const revealedMines = minePositions.filter(i => revealed[i]).length
    const safeRevealed = Math.max(0, revealedCount - revealedMines)
    const multiplier = computeMultiplier(safeRevealed)
    const payout = Math.round(stake * multiplier * 100) / 100
    const profit = Math.round((payout - stake) * 100) / 100
    return { safeRevealed, multiplier, payout, profit }
  }

  const live = computeLive()

  function primaryAction(){
    if (phase === 'idle') { startRound(); return }
    if (phase === 'playing') {
      // cash out
      const payout = live.payout
      const profit = live.profit
      setBalance(b => Math.round((b + payout) * 100) / 100)
      setPhase('cashed')
      setLastPayout(payout)
      pushResult({ game: 'Mines', bet: stake, payout: payout, profit: profit, time: Date.now() })
      setTimeout(()=>{ setGlobalLock(false); generatePositions() }, 700)
      return
    }
    if (phase === 'cashed' || phase === 'lost') {
      // New Game: reset positions and ready to start
      generatePositions(); return
    }
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <div style={{display:'flex',flexDirection:'column'}}>
          <label className="small">Bet</label>
          <input className="input" type="number" value={stake} onChange={e=>setStake(Number(e.target.value)||0)} />
        </div>
        <div style={{display:'flex',flexDirection:'column'}}>
          <label className="small">Mines</label>
          <input className="input small" type="number" min="1" max={total-1} value={mines} onChange={e=>setMines(Math.max(1, Math.min(total-1, Number(e.target.value)||1)))} />
        </div>
        <div style={{marginLeft:'auto'}} className="small">Seed: N/A</div>
      </div>

      <div className="small" style={{marginBottom:8}}>
        Potential payout: <strong>{live.payout.toFixed(2)} ({live.(Math.max(0, multiplier - 1)).toFixed(3)}x)</strong> — Potential profit: <strong style={{color: live.profit>=0? 'var(--win)': 'var(--loss)'}}>{live.profit>=0?`+${live.profit.toFixed(2)}`:live.profit.toFixed(2)}</strong>
      </div>

      <div className="grid mines" role="grid">
        {Array.from({length: total}).map((_, idx)=>{
          const isRevealed = !!revealed[idx]
          const isMine = minePositions.includes(idx)
          return <button key={idx} onClick={()=>clickTile(idx)} disabled={phase!=='playing'} className={'tile ' + (isRevealed ? (isMine ? 'mine' : 'safe') : '')}>{isRevealed ? (isMine ? '💣' : '✓') : ''}</button>
        })}
      </div>

      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <button className={'btn primary'} onClick={primaryAction}>{phase==='idle'?'Start': phase==='playing'?'Cash Out':'New Game'}</button>
        <div className="small">Note: Balance deducted when Start pressed. Cash Out to collect winnings.</div>
      </div>

      {phase==='cashed' && <div className="small" style={{marginTop:8}}>Payout: <strong>{lastPayout && lastPayout.toFixed(2)}</strong></div>}
    </div>
  )
}

/* ================= HistoryPanel ================= */
function HistoryPanel({data}){
  const totals = data.stats || { totalBet:0, totalWon:0, totalLost:0, totalToppedUp:0 }
  const net = Math.round((totals.totalWon - totals.totalLost) * 100) / 100
  return (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{display:'flex',gap:12}}>
        <div className="panel" style={{flex:1}}>
          <div className="small">Total Bet</div>
          <div style={{fontWeight:800}}>${(totals.totalBet || 0).toFixed(2)}</div>
        </div>
        <div className="panel" style={{flex:1}}>
          <div className="small">Total Won</div>
          <div style={{fontWeight:800}}>${(totals.totalWon || 0).toFixed(2)}</div>
        </div>
        <div className="panel" style={{flex:1}}>
          <div className="small">Total Lost</div>
          <div style={{fontWeight:800}}>${(totals.totalLost || 0).toFixed(2)}</div>
        </div>
        <div className="panel" style={{flex:1}}>
          <div className="small">Net Profit</div>
          <div style={{fontWeight:800,color: net>=0? 'var(--win)': 'var(--loss)'}}>${net.toFixed(2)}</div>
        </div>
      </div>
      <div className="panel">
        <div className="small">Total Topped Up</div>
        <div style={{fontWeight:800}}>${(totals.totalToppedUp || 0).toFixed(2)}</div>
      </div>
      <div className="panel" style={{maxHeight:300,overflow:'auto'}}>
        <div className="small" style={{marginBottom:8}}>Session history (most recent first)</div>
        {data.records.slice().reverse().map((r, i)=>(
          <div key={i} style={{display:'flex',justifyContent:'space-between',padding:8,borderBottom:'1px solid rgba(255,255,255,0.02)'}}>
            <div style={{fontSize:13}}>{new Date(r.time).toLocaleString()} — {r.game}</div>
            <div style={{fontSize:13,color: r.profit>=0? 'var(--win)': 'var(--loss)'}}>{r.profit>=0? `+${r.profit.toFixed(2)}`: `-${Math.abs(r.profit).toFixed(2)}`}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
