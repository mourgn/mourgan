import React, { useState, useRef, useEffect } from "react";

export default function App(){
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(10);
  const [running, setRunning] = useState(false);
  const [multiplier, setMultiplier] = useState(1.0); // internal multiplier (starts at 1)
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState([]); // {type, amount, profit}
  const recentListRef = useRef(null);

  useEffect(()=>{ // ensure recent list scroll top behavior when items added (list is column-reverse)
    if(recentListRef.current){
      // ensure newest (top) is visible by scrolling to bottom because layout is reversed
      recentListRef.current.scrollTop = recentListRef.current.scrollHeight;
    }
  }, [history.length]);

  function getCrashPoint(){
    // lower chances: weighted distribution
    const r = Math.random();
    if(r < 0.6) return Math.round((1 + Math.random()*2)*1000)/1000; // 1 - 3x
    if(r < 0.85) return Math.round((3 + Math.random()*2)*1000)/1000; // 3-5x
    if(r < 0.97) return Math.round((5 + Math.random()*5)*1000)/1000; //5-10x
    return Math.round((10 + Math.random()*40)*1000)/1000; //10-50x
  }

  useEffect(()=>{ // ticking loop
    let id;
    if(running){
      id = setInterval(()=>{
        setMultiplier(prev=>{
          // increase faster as multiplier grows, deterministic easing
          const next = prev + Math.max(0.01, prev*0.005);
          // round to 3 decimals
          const rounded = Math.round(next*1000)/1000;
          if(rounded >= crashPoint){
            // bust
            clearInterval(id);
            setRunning(false);
            // record loss
            const loss = -(bet);
            setHistory(h=>[{type:'crash', outcome:'bust', bet, profit: loss}, ...h].slice(0,100));
            setMultiplier(1.0);
            return 1.0;
          }
          return rounded;
        });
      }, 80);
    }
    return ()=> clearInterval(id);
  }, [running, crashPoint]);

  function startCrash(){
    if(running) return;
    if(bet > balance) return alert("Not enough balance");
    const cp = getCrashPoint();
    setCrashPoint(cp);
    setMultiplier(1.0);
    setRunning(true);
  }

  function cashoutCrash(){
    if(!running) return;
    // profit based on internal multiplier (starts at 1) => net = bet * (multiplier - 1)
    const net = Math.round((bet * (multiplier - 1)) * 100)/100;
    setBalance(b=>Math.round((b + net)*100)/100);
    setHistory(h=>[{type:'crash', outcome:'cashout', bet, profit: net, cashedAt: Math.round(multiplier*1000)/1000}, ...h].slice(0,100));
    setRunning(false);
    setMultiplier(1.0);
  }

  // small helper to format displayed multiplier (start display at 0.000)
  function displayMult(m){
    const d = Math.max(0, Math.round((m - 1)*1000)/1000);
    return d.toFixed(3);
  }

  // add recent entry UI trigger (CSS-only animation)
  useEffect(()=>{
    // add entry-anim class to the first child briefly
    const el = recentListRef.current?.firstElementChild;
    if(el){
      el.classList.add('entry-anim');
      // remove after animation so re-used later still works
      const t = setTimeout(()=> el.classList.remove('entry-anim'), 1800);
      return ()=> clearTimeout(t);
    }
  }, [history.length]);

  return (
    <div className="app">
      <div className="sidebar">
        <div className="panel header">
          <div style={{fontSize:20, textTransform:'lowercase', fontWeight:800}}>mourgan</div>
          <div style={{flex:1}}></div>
          <div className="balance">₿ {balance.toFixed(2)}</div>
        </div>
        <div className="panel">
          <div style={{fontWeight:700,marginBottom:8}}>GAMES</div>
          <button className="big-btn" onClick={()=>{}}>Crash</button>
          <button className="big-btn" style={{marginTop:8}} onClick={()=>{}}>Mines</button>
        </div>
        <div className="panel recent">
          <div style={{fontWeight:700, marginBottom:8}}>Recent</div>
          <div className="recent-list" ref={recentListRef}>
            {history.map((r, idx)=>(
              <div key={idx} className={`recent-item ${r.profit>0?'win-glow': r.profit<0?'loss-glow':''}`}>
                <div style={{fontSize:13}}>{r.type} — {r.outcome}</div>
                <div style={{fontSize:14,fontWeight:700}}>{r.profit>=0?`+${r.profit.toFixed(2)}`:r.profit.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="main">
        <div className="panel crash-panel">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div style={{fontWeight:700}}>Crash</div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <input type="number" value={bet} onChange={e=>setBet(Number(e.target.value)||0)} style={{width:100}} />
              <button className="big-btn" onClick={startCrash} disabled={running}>Start</button>
              <button className="big-btn" onClick={cashoutCrash} disabled={!running}>Cash Out</button>
            </div>
          </div>

          <div style={{marginTop:12,fontSize:32,fontWeight:800}}>{displayMult(multiplier)}x</div>
          <div style={{marginTop:8}}>
            Crash point: <strong>{crashPoint.toFixed(3)}x</strong>
          </div>
          <div style={{marginTop:8}}>
            <small>Note: display shows net multiplier starting at 0.000x (visual). Payout uses internal multiplier.</small>
          </div>
        </div>

        <div className="panel" style={{height:200}}>
          <div style={{fontWeight:700, marginBottom:8}}>History (last 10)</div>
          <div style={{display:'flex',flexDirection:'column',gap:8,overflowY:'auto', maxHeight:140}}>
            {history.slice(0,10).map((r,i)=>(
              <div key={i} style={{display:'flex',justifyContent:'space-between'}}>
                <div>{r.type} — {r.outcome}</div>
                <div style={{color: r.profit>=0?'var(--win)':'var(--loss)'}}>{r.profit>=0?`+${r.profit.toFixed(2)}`:r.profit.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
