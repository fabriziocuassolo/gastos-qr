'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

const CATS = [['🍔','Comida'],['🚗','Transp.'],['🛒','Compras'],['🏥','Salud'],['🎬','Ocio'],['💡','Servic.'],['🏠','Hogar'],['❓','Otro']];

export default function Home() {
  const [screen,setScreen]=useState('home');
  const [expenses,setExpenses]=useState([]);
  const [form,setForm]=useState({amount:'',place:'',date:'',category:'❓ Otro',qrData:'',app:'none'});
  const [toast,setToast]=useState('');
  const [scanMsg,setScanMsg]=useState('');
  const videoRef=useRef(null); const streamRef=useRef(null); const rafRef=useRef(null);

  useEffect(()=>{ setExpenses(JSON.parse(localStorage.getItem('gq_expenses')||'[]')); },[]);
  useEffect(()=>{ localStorage.setItem('gq_expenses',JSON.stringify(expenses)); },[expenses]);
  useEffect(()=>()=>stopCamera(),[]);

  function notify(msg){ setToast(msg); setTimeout(()=>setToast(''),2600); }
  function fmt(n){ return Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function today(){ return new Date().toISOString().split('T')[0]; }

  function parseQR(qrText){
    const raw = qrText || '';
    let place = '';
    let amount = '';
    let category = '❓ Otro';

    try { const u = new URL(raw); place = u.hostname.replace('www.',''); } catch {}

    const lower = raw.toLowerCase();
    if (lower.includes('mercadopago') || lower.includes('mpago')) place = place || 'Mercado Pago';
    if (lower.includes('modo')) place = place || 'MODO';

    // Busca patrones típicos: amount=1234.56, monto=1234, total: 1234, $1234
    const patterns = [
      /(?:amount|monto|total|importe|amt)[=:\s]+([0-9]+(?:[\.,][0-9]{1,2})?)/i,
      /\$\s*([0-9]+(?:[\.,][0-9]{1,2})?)/i
    ];
    for (const p of patterns) {
      const m = raw.match(p);
      if (m) { amount = m[1].replace(',','.'); break; }
    }

    // Heurística de categoría por texto
    if (/cafe|bar|resto|restaurant|comida|burger|pizza|helado|panader/i.test(raw)) category='🍔 Comida';
    if (/taxi|uber|cabify|nafta|shell|ypf|estacion/i.test(raw)) category='🚗 Transp.';
    if (/farmacia|salud|hospital|clinica/i.test(raw)) category='🏥 Salud';
    if (/cine|teatro|juego|ocio/i.test(raw)) category='🎬 Ocio';
    if (/luz|gas|agua|internet|servicio/i.test(raw)) category='💡 Servic.';

    return { amount, place: place || raw.slice(0,45), category };
  }

  async function startScan(){
    setScreen('scan'); setScanMsg('');
    try{
      const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment',width:{ideal:1280}}});
      streamRef.current=stream;
      videoRef.current.srcObject=stream;
      await videoRef.current.play();
      tickScan();
    }catch(e){ notify('📵 No hay acceso a cámara. Probá subiendo una imagen.'); }
  }

  function stopCamera(){
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current=null;
    if(streamRef.current){ streamRef.current.getTracks().forEach(t=>t.stop()); streamRef.current=null; }
  }

  function tickScan(){
    const video=videoRef.current;
    if(!video || !window.jsQR){ rafRef.current=requestAnimationFrame(tickScan); return; }
    if(video.readyState < video.HAVE_ENOUGH_DATA){ rafRef.current=requestAnimationFrame(tickScan); return; }
    const canvas=document.createElement('canvas'); canvas.width=video.videoWidth; canvas.height=video.videoHeight;
    const ctx=canvas.getContext('2d'); ctx.drawImage(video,0,0);
    const img=ctx.getImageData(0,0,canvas.width,canvas.height);
    const code=window.jsQR(img.data,img.width,img.height,{inversionAttempts:'dontInvert'});
    if(code?.data){ setScanMsg('QR leído ✅'); stopCamera(); openConfirm(code.data); }
    else rafRef.current=requestAnimationFrame(tickScan);
  }

  function openConfirm(qrText=''){
    const p=parseQR(qrText);
    setForm({amount:p.amount, place:p.place, date:today(), category:p.category, qrData:qrText, app:'none'});
    setScreen('confirm');
  }

  function handleQRImage(e){
    const file=e.target.files?.[0]; if(!file) return; e.target.value='';
    const img=new Image(); const url=URL.createObjectURL(file);
    img.onload=()=>{
      const canvas=document.createElement('canvas'); canvas.width=img.width; canvas.height=img.height;
      const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0);
      const data=ctx.getImageData(0,0,canvas.width,canvas.height);
      const code=window.jsQR?.(data.data,data.width,data.height);
      URL.revokeObjectURL(url); stopCamera();
      if(code?.data) openConfirm(code.data); else { notify('No pude leer ese QR. Cargá el gasto manual.'); openConfirm(''); }
    };
    img.src=url;
  }

  function saveAndPay(app){
    const amount=parseFloat(String(form.amount).replace(',','.'));
    if(!amount || amount<=0) return notify('💰 Ingresá un monto válido');
    if(!form.place.trim()) return notify('📍 Ingresá el comercio');
    const exp={id:Date.now(), amount, place:form.place.trim(), date:form.date||today(), category:form.category||'❓ Otro', app, qrData:form.qrData};
    setExpenses([exp,...expenses]);
    notify('✅ Gasto guardado');
    if(app==='mp') setTimeout(()=>{ location.href='mercadopago://'; },500);
    if(app==='modo') setTimeout(()=>{ location.href='modo://'; },500);
    setScreen('home');
  }

  function del(id){ if(confirm('¿Eliminar este gasto?')) setExpenses(expenses.filter(e=>e.id!==id)); }
  const monthExpenses=expenses.filter(e=>{ const d=new Date(e.date+'T12:00:00'), n=new Date(); return d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear(); });
  const monthTotal=monthExpenses.reduce((s,e)=>s+e.amount,0);

  return <>
    <Script src="https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.min.js" strategy="afterInteractive" />
    <style>{CSS}</style>
    <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />

    {screen==='home' && <main className="screen active">
      <div className="topbar"><div className="topbar-title">Gasto<span>QR</span></div><button className="icon-btn" onClick={()=>setScreen('stats')}>📊</button></div>
      <section className="home-hero"><div className="label">Gastos este mes</div><div className="month-total">${fmt(monthTotal)}</div><div className="sub">{monthExpenses.length} registros</div></section>
      <button className="scan-fab" onClick={startScan}><span>📷 Escanear QR</span><b>→</b></button>
      <div className="section-label">Últimos gastos</div>
      <ExpenseList expenses={expenses.slice(0,8)} del={del} fmt={fmt}/>
      {!expenses.length && <div className="empty-home">Tocá el botón naranja para<br/>escanear tu primer QR 🧾</div>}
    </main>}

    {screen==='scan' && <main className="screen active scan-screen">
      <div className="scan-topbar"><button className="back-btn" onClick={()=>{stopCamera();setScreen('home')}}>←</button><h2>Escanear QR</h2><div/></div>
      <div className="qr-viewport"><video ref={videoRef} autoPlay playsInline muted/><div className="qr-overlay"><div className="qr-frame"/></div></div>
      <div className="scan-hint">Apuntá la cámara al QR del comercio</div>
      {scanMsg && <div className="analyzing">{scanMsg}</div>}
      <div className="scan-divider">o subí imagen del QR</div>
      <button className="scan-alt-btn" onClick={()=>document.getElementById('cameraInput').click()}>🖼️ Seleccionar imagen</button>
      <input type="file" id="cameraInput" accept="image/*" onChange={handleQRImage}/>
    </main>}

    {screen==='confirm' && <main className="screen active">
      <div className="confirm-header"><button className="icon-btn" onClick={()=>setScreen('home')}>←</button><h2>Confirmar gasto</h2></div>
      {!form.amount && <div className="no-amount-badge">✏️ No se detectó monto — completalo manualmente</div>}
      {form.amount && <div className="detected-badge">✅ Datos precargados desde el QR</div>}
      <section className="form-card">
        <label>💰 Monto<input className="finput amount-big" type="number" inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></label>
        <label>📍 Lugar / Comercio<input className="finput" value={form.place} onChange={e=>setForm({...form,place:e.target.value})} placeholder="Nombre del comercio"/></label>
        <label>📅 Fecha<input className="finput" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
        <div><label>🏷️ Categoría</label><div className="cats">{CATS.map(([e,n])=><button key={n} className={'cat-chip '+(form.category===`${e} ${n}`?'on':'')} onClick={()=>setForm({...form,category:`${e} ${n}`})}><span>{e}</span>{n}</button>)}</div></div>
      </section>
      <div className="pay-section"><div className="pay-label">Guardar y pagar con</div><div className="pay-btns"><button className="pay-btn btn-mp" onClick={()=>saveAndPay('mp')}>💳 Mercado Pago</button><button className="pay-btn btn-modo" onClick={()=>saveAndPay('modo')}>📱 MODO</button></div></div>
      <button className="btn-only-save" onClick={()=>saveAndPay('none')}>Solo guardar</button>
    </main>}

    {screen==='history' && <main className="screen active"><div className="topbar"><div className="topbar-title">Historial</div></div><ExpenseList expenses={expenses} del={del} fmt={fmt}/></main>}
    {screen==='stats' && <Stats expenses={expenses} fmt={fmt} setScreen={setScreen}/>} 

    {!['scan','confirm'].includes(screen) && <nav className="bottom-nav"><button onClick={()=>setScreen('home')}>🏠<span>Inicio</span></button><button onClick={startScan}>📷<span>Escanear</span></button><button onClick={()=>setScreen('history')}>📋<span>Historial</span></button><button onClick={()=>setScreen('stats')}>📊<span>Stats</span></button></nav>}
    <div className={'toast '+(toast?'show':'')}>{toast}</div>
  </>;
}

function ExpenseList({expenses,del,fmt}){
  return <div className="expense-list">{expenses.map(e=>{ const emoji=e.category.split(' ')[0]; return <article className="expense-card" key={e.id} onClick={()=>del(e.id)}><div className="exp-icon">{emoji}</div><div className="exp-info"><div className="exp-place">{e.place}</div><div className="exp-meta">{new Date(e.date+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'short'})} · {e.category.replace(emoji,'').trim()}</div></div><div className="exp-right"><div className="exp-amount">${fmt(e.amount)}</div><div className="exp-app">{e.app==='mp'?'MP':e.app==='modo'?'MODO':'guardado'}</div></div></article>})}</div>
}
function Stats({expenses,fmt,setScreen}){
  const total=expenses.reduce((s,e)=>s+e.amount,0);
  const byCat={}; expenses.forEach(e=>byCat[e.category]=(byCat[e.category]||0)+e.amount);
  return <main className="screen active"><div className="topbar"><div className="topbar-title">Estadísticas</div><button className="icon-btn" onClick={()=>setScreen('home')}>✕</button></div><section className="stats-card"><h3>Total cargado</h3><div className="big-num">${fmt(total)}</div><p>{expenses.length} gastos</p></section><section className="stats-card"><h3>Por categoría</h3>{Object.entries(byCat).sort((a,b)=>b[1]-a[1]).map(([k,v])=><p key={k}>{k}: <b>${fmt(v)}</b></p>)}</section></main>
}

const CSS = `
:root{--bg:#f5f2ed;--ink:#1a1612;--ink2:#6b6560;--surface:#fff;--border:#e2ddd8;--mp:#009ee3;--modo:#7b3fff;--green:#00b87a;--accent:#ff6b2b;--r:20px;--shadow:0 2px 16px rgba(26,22,18,.08)}*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}body{font-family:Inter,sans-serif;background:var(--bg);color:var(--ink);min-height:100dvh}.screen{min-height:100dvh;padding-bottom:96px}.topbar{display:flex;align-items:center;justify-content:space-between;padding:52px 20px 16px}.topbar-title{font-family:Syne,sans-serif;font-size:22px;font-weight:800}.topbar-title span{color:var(--accent)}button{font-family:inherit}.icon-btn{width:40px;height:40px;background:var(--surface);border:1px solid var(--border);border-radius:12px;font-size:18px;box-shadow:var(--shadow)}.home-hero{margin:8px 20px 0;background:var(--ink);border-radius:24px;padding:28px 24px 24px;color:#fff}.label,.section-label,.pay-label{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--ink2)}.home-hero .label{color:#fff;opacity:.5}.month-total{font-family:Syne,sans-serif;font-size:40px;font-weight:800}.sub{font-size:12px;opacity:.45}.scan-fab{margin:20px;width:calc(100% - 40px);background:var(--accent);border:0;border-radius:20px;padding:20px 24px;color:#fff;font-family:Syne,sans-serif;font-size:17px;font-weight:700;display:flex;justify-content:space-between;box-shadow:0 6px 24px rgba(255,107,43,.35)}.section-label{padding:20px 20px 10px}.expense-list{padding:0 20px;display:flex;flex-direction:column;gap:10px}.expense-card{background:#fff;border-radius:16px;padding:14px 16px;display:flex;align-items:center;gap:14px;box-shadow:var(--shadow)}.exp-icon{width:44px;height:44px;border-radius:14px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:22px}.exp-info{flex:1;min-width:0}.exp-place{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.exp-meta,.exp-app{font-size:11px;color:var(--ink2);margin-top:2px}.exp-right{text-align:right}.exp-amount{font-family:Syne,sans-serif;font-size:16px;font-weight:700}.empty-home{text-align:center;padding:32px 20px;color:var(--ink2);font-size:13px;line-height:1.6}.scan-screen{background:var(--ink);color:#fff}.scan-topbar{display:flex;align-items:center;justify-content:space-between;padding:52px 20px 20px}.back-btn{background:rgba(255,255,255,.1);border:0;border-radius:12px;width:38px;height:38px;font-size:20px;color:#fff}.qr-viewport{margin:0 20px;border-radius:24px;overflow:hidden;position:relative;aspect-ratio:1;background:#000}.qr-viewport video{width:100%;height:100%;object-fit:cover}.qr-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}.qr-frame{width:60%;aspect-ratio:1;border:2.5px solid var(--accent);border-radius:16px;box-shadow:0 0 0 2000px rgba(0,0,0,.4)}.scan-hint{text-align:center;font-size:13px;color:rgba(255,255,255,.5);padding:16px}.scan-divider{display:flex;align-items:center;gap:12px;margin:18px 20px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,.3)}.scan-divider:before,.scan-divider:after{content:'';flex:1;height:1px;background:rgba(255,255,255,.12)}.scan-alt-btn{margin:0 20px;width:calc(100% - 40px);padding:15px;background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.12);border-radius:16px;color:#fff;font-size:14px}#cameraInput{display:none}.confirm-header{padding:52px 20px 12px;display:flex;align-items:center;gap:14px}.confirm-header h2{font-family:Syne,sans-serif;font-size:22px}.detected-badge,.no-amount-badge{margin:0 20px 16px;border-radius:14px;padding:12px 16px;font-size:13px;font-weight:500}.detected-badge{background:#e8faf3;border:1.5px solid #b3e8d6;color:#00705a}.no-amount-badge{background:#fff8f0;border:1.5px solid #ffd8b8;color:#b85000}.form-card{margin:0 20px;background:#fff;border-radius:var(--r);padding:20px;box-shadow:var(--shadow);display:flex;flex-direction:column;gap:16px}.form-card label{display:block;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:var(--ink2);margin-bottom:7px}.finput{width:100%;background:var(--bg);border:1.5px solid var(--border);border-radius:14px;padding:13px 15px;color:var(--ink);font-size:16px;outline:none;margin-top:7px}.amount-big{font-family:Syne,sans-serif;font-size:32px;font-weight:800}.cats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.cat-chip{padding:10px 4px;background:var(--bg);border:1.5px solid var(--border);border-radius:14px;font-size:11px;color:var(--ink2);display:flex;flex-direction:column;align-items:center;gap:4px}.cat-chip span{font-size:20px}.cat-chip.on{border-color:var(--accent);background:#fff4ef;color:var(--accent);font-weight:600}.pay-section{margin:20px 20px 0}.pay-label{margin-bottom:10px}.pay-btns{display:flex;gap:10px}.pay-btn{flex:1;padding:16px 12px;border:0;border-radius:18px;color:#fff;font-family:Syne,sans-serif;font-weight:700}.btn-mp{background:var(--mp)}.btn-modo{background:var(--modo)}.btn-only-save{width:calc(100% - 40px);margin:10px 20px 0;padding:16px;background:#fff;border:1.5px solid var(--border);border-radius:18px;font-size:14px;color:var(--ink2)}.stats-card{margin:0 20px 14px;background:#fff;border-radius:var(--r);padding:20px;box-shadow:var(--shadow)}.stats-card h3{font-family:Syne,sans-serif;font-size:13px;text-transform:uppercase;color:var(--ink2);margin-bottom:14px}.big-num{font-family:Syne,sans-serif;font-size:36px;font-weight:800}.bottom-nav{position:fixed;bottom:0;left:0;right:0;background:rgba(245,242,237,.92);backdrop-filter:blur(20px);border-top:1px solid var(--border);padding:8px 0 26px;display:flex}.bottom-nav button{flex:1;background:none;border:0;display:flex;flex-direction:column;align-items:center;gap:3px;font-size:22px}.bottom-nav span{font-size:10px;color:var(--ink2)}.toast{position:fixed;bottom:96px;left:50%;transform:translateX(-50%) translateY(20px);background:var(--ink);color:#fff;padding:11px 22px;border-radius:999px;font-size:13px;opacity:0;pointer-events:none;transition:all .3s;z-index:999;white-space:nowrap}.toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
`;