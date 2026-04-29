'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';

const CATS = [
  ['🍔','Comida'], ['🚗','Transporte'], ['🛒','Compras'], ['🏥','Salud'],
  ['🎬','Ocio'], ['💡','Servicios'], ['🏠','Hogar'], ['💪','Gym'], ['❓','Otro']
];
const CAT_RULES = {
  Comida: ['kiosco','panader','bar','cafe','café','resto','restaurant','mcdonald','burger','helado','pizzeria','pizza','comida','super','mercado'],
  Transporte: ['ypf','shell','axion','uber','cabify','taxi','colectivo','nafta','estacion','estación'],
  Compras: ['farmacity','ropa','tienda','shopping','mercadolibre','compra','electro','ferreter'],
  Salud: ['farmacia','odont','clinica','clínica','medico','médico','salud'],
  Ocio: ['cine','bar','boliche','netflix','spotify','juego','steam'],
  Servicios: ['luz','gas','agua','internet','claro','personal','movistar','servicio'],
  Hogar: ['alquiler','mueble','casa','hogar','limpieza'],
  Gym: ['gym','gimnasio','suplement','proteina','creatina']
};

function today() { return new Date().toISOString().slice(0,10); }
function fmt(n) { return Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
function monthKey(date = today()) { return String(date).slice(0,7); }
function catLabel(name) { const hit = CATS.find(c => c[1] === name || `${c[0]} ${c[1]}` === name); return hit ? `${hit[0]} ${hit[1]}` : '❓ Otro'; }
function downloadFile(name, content, type) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); }

export default function Home() {
  const [screen, setScreen] = useState('home');
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({ budget: 0, alertPct: 80 });
  const [form, setForm] = useState({ amount:'', place:'', date:today(), category:'❓ Otro', method:'Mercado Pago', qrData:'', lat:null, lng:null });
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const fileRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    setExpenses(JSON.parse(localStorage.getItem('gq_expenses_v2') || localStorage.getItem('gq_expenses') || '[]'));
    setSettings(JSON.parse(localStorage.getItem('gq_settings_v2') || '{"budget":0,"alertPct":80}'));
  }, []);
  useEffect(() => { localStorage.setItem('gq_expenses_v2', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('gq_settings_v2', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { if (toast) { const t = setTimeout(()=>setToast(''), 2400); return () => clearTimeout(t); }}, [toast]);
  useEffect(() => () => stopCamera(false), []);

  const thisMonth = useMemo(() => expenses.filter(e => monthKey(e.date) === monthKey()), [expenses]);
  const monthTotal = useMemo(() => thisMonth.reduce((s,e)=>s+Number(e.amount||0),0), [thisMonth]);
  const budgetPct = settings.budget ? Math.min(100, Math.round(monthTotal / settings.budget * 100)) : 0;
  const filtered = useMemo(() => expenses.filter(e => {
    const q = query.toLowerCase().trim();
    const okQ = !q || [e.place,e.category,e.method].join(' ').toLowerCase().includes(q);
    const okC = catFilter === 'Todas' || e.category.includes(catFilter);
    const okF = !from || e.date >= from;
    const okT = !to || e.date <= to;
    return okQ && okC && okF && okT;
  }), [expenses, query, catFilter, from, to]);

  function notify(msg) { setToast(msg); }
  function navigate(s) { stopCamera(false); setScreen(s); }

  function inferFromText(text='') {
    const raw = String(text || '');
    let place = '';
    try { const u = new URL(raw); place = u.hostname.replace('www.',''); } catch { place = raw.slice(0,44); }
    const decoded = decodeURIComponent(raw).toLowerCase();
    const amountPatterns = [/(?:monto|amount|total|importe|value)[=: ]+\$?\s*([0-9]+(?:[\.,][0-9]{1,2})?)/i, /\$\s*([0-9]+(?:[\.,][0-9]{1,2})?)/i];
    let amount = '';
    for (const p of amountPatterns) { const m = raw.match(p); if (m) { amount = m[1].replace(',','.'); break; } }
    let category = '❓ Otro';
    Object.entries(CAT_RULES).forEach(([cat, words]) => { if (words.some(w => decoded.includes(w))) category = catLabel(cat); });
    return { place, amount, category };
  }
  function updatePlace(v) {
    let category = form.category;
    const low = v.toLowerCase();
    Object.entries(CAT_RULES).forEach(([cat, words]) => { if (words.some(w => low.includes(w))) category = catLabel(cat); });
    setForm(f => ({...f, place:v, category}));
  }
  function openConfirm(qrData='') {
    const guess = inferFromText(qrData);
    setForm({ amount: guess.amount || '', place: guess.place || '', date: today(), category: guess.category || '❓ Otro', method:'Mercado Pago', qrData, lat:null, lng:null });
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(pos => setForm(f=>({...f, lat: pos.coords.latitude, lng: pos.coords.longitude })), ()=>{}, {enableHighAccuracy:false, timeout:4000});
    setScreen('confirm');
  }

  async function startCamera() {
    setScreen('scan'); setCameraOn(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      scanTick();
    } catch { notify('Sin permiso de cámara. Probá subir imagen del QR.'); }
  }
  function stopCamera(goHome=false) {
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    loopRef.current = null; setCameraOn(false);
    if (streamRef.current) streamRef.current.getTracks().forEach(t=>t.stop());
    streamRef.current = null;
    if (goHome) setScreen('home');
  }
  function scanTick() {
    const video = videoRef.current;
    if (!video || !window.jsQR || video.readyState < 2) { loopRef.current = requestAnimationFrame(scanTick); return; }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d'); ctx.drawImage(video, 0, 0);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = window.jsQR(img.data, img.width, img.height);
    if (code?.data) { stopCamera(false); openConfirm(code.data); }
    else loopRef.current = requestAnimationFrame(scanTick);
  }
  function readQRImage(file) {
    if (!file) return;
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = window.jsQR?.(data.data, data.width, data.height);
      URL.revokeObjectURL(url); stopCamera(false);
      if (code?.data) openConfirm(code.data); else { openConfirm(''); notify('No pude leer el QR. Cargalo manual.'); }
    };
    img.src = url;
  }
  function buildExpense(methodOverride) {
    const amount = Number(String(form.amount).replace(',','.'));
    if (!amount || amount <= 0) { notify('Ingresá un monto válido'); return null; }
    if (!form.place.trim()) { notify('Ingresá el comercio/lugar'); return null; }
    return { ...form, id: Date.now(), amount, place: form.place.trim(), method: methodOverride || form.method };
  }

  function saveExpense() {
    const item = buildExpense();
    if (!item) return;
    setExpenses([item, ...expenses]);
    notify('Gasto guardado');
    setScreen('home');
  }

  function openPaymentApp(app) {
    const cfg = app === 'nx'
      ? { name: 'NaranjaX', scheme: 'naranjax://', fallback: 'https://www.naranjax.com/' }
      : { name: 'Mercado Pago', scheme: 'mercadopago://', fallback: 'https://www.mercadopago.com.ar/' };

    notify('Abriendo ' + cfg.name + '…');

    let opened = false;
    const markOpened = () => { if (document.hidden) opened = true; };
    document.addEventListener('visibilitychange', markOpened);

    setTimeout(() => {
      window.location.href = cfg.scheme;
      setTimeout(() => {
        document.removeEventListener('visibilitychange', markOpened);
        if (!opened) window.location.href = cfg.fallback;
      }, 1400);
    }, 350);
  }

  function saveAndOpenPayment(app) {
    const method = app === 'nx' ? 'NaranjaX' : 'Mercado Pago';
    const item = buildExpense(method);
    if (!item) return;
    setExpenses([item, ...expenses]);
    openPaymentApp(app);
    setTimeout(() => setScreen('home'), 500);
  }
  function del(id) { if (confirm('¿Eliminar este gasto?')) setExpenses(expenses.filter(e => e.id !== id)); }

  function exportCSV() {
    if (!expenses.length) return notify('No hay gastos');
    const headers = ['Fecha','Lugar','Categoria','Monto','Metodo','Lat','Lng'];
    const rows = expenses.map(e => [e.date,e.place,e.category,e.amount,e.method,e.lat||'',e.lng||'']);
    const csv = [headers,...rows].map(r => r.map(v => '"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\n');
    downloadFile(`gastos-qr-${today()}.csv`, '\uFEFF'+csv, 'text/csv;charset=utf-8');
  }
  function backupJSON() { downloadFile(`backup-gastoqr-${today()}.json`, JSON.stringify({version:2, exportedAt:new Date().toISOString(), settings, expenses}, null, 2), 'application/json'); }
  function restoreJSON(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => { try { const data = JSON.parse(r.result); if (!Array.isArray(data.expenses)) throw Error(); setExpenses(data.expenses); if(data.settings) setSettings(data.settings); notify('Backup restaurado'); } catch { notify('Backup inválido'); } };
    r.readAsText(file);
  }

  const catTotals = useMemo(() => {
    const m = {}; expenses.forEach(e => m[e.category] = (m[e.category]||0)+Number(e.amount||0));
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }, [expenses]);
  const insights = useMemo(() => {
    const arr = [];
    if (settings.budget && monthTotal >= settings.budget * (settings.alertPct/100)) arr.push(`Ojo: ya usaste ${budgetPct}% de tu presupuesto mensual.`);
    if (catTotals[0]) arr.push(`Tu categoría más fuerte es ${catTotals[0][0]} con $${fmt(catTotals[0][1])}.`);
    const todayTotal = expenses.filter(e=>e.date===today()).reduce((s,e)=>s+Number(e.amount||0),0);
    if (todayTotal) arr.push(`Hoy llevás gastado $${fmt(todayTotal)}.`);
    return arr.length ? arr : ['Todavía no hay suficientes datos para insights.'];
  }, [expenses, settings, monthTotal, budgetPct, catTotals]);

  return <>
    <Script src="https://cdnjs.cloudflare.com/ajax/libs/jsqr/1.4.0/jsQR.min.js" strategy="afterInteractive" />
    <style>{`
      :root{--bg:#070707;--surface:#121212;--surface2:#1b1b1b;--ink:#f6f3ed;--muted:#a6a09a;--border:#2b2b2b;--orange:#ff6b2b;--green:#00d084;--red:#ff4d4d;--shadow:0 18px 60px rgba(0,0,0,.35)}
      *{box-sizing:border-box} body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif} button,input,select{font:inherit} .app{min-height:100dvh;padding:calc(env(safe-area-inset-top) + 18px) 18px 96px;background:radial-gradient(circle at 80% 0%,rgba(255,107,43,.18),transparent 30%),radial-gradient(circle at 0% 20%,rgba(0,208,132,.12),transparent 28%),var(--bg)}
      .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}.brand{font-size:26px;font-weight:900;letter-spacing:-.06em}.brand span{color:var(--orange)}.iconbtn,.pillbtn{border:1px solid var(--border);background:var(--surface);color:var(--ink);border-radius:16px;padding:12px 14px;box-shadow:var(--shadow)}.hero{background:linear-gradient(135deg,#151515,#0f0f0f);border:1px solid var(--border);border-radius:28px;padding:24px;box-shadow:var(--shadow)}.label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:800}.total{font-size:44px;font-weight:950;letter-spacing:-.08em;margin:5px 0}.muted{color:var(--muted);font-size:13px}.progress{height:9px;background:#252525;border-radius:99px;overflow:hidden;margin-top:16px}.progress div{height:100%;background:linear-gradient(90deg,var(--green),var(--orange));border-radius:99px}.scan{width:100%;margin:18px 0;border:0;border-radius:24px;background:var(--orange);color:white;padding:19px 20px;font-weight:900;font-size:18px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 18px 40px rgba(255,107,43,.28)}.grid{display:grid;gap:12px}.card{background:rgba(18,18,18,.92);border:1px solid var(--border);border-radius:22px;padding:16px;box-shadow:var(--shadow)}.row{display:flex;align-items:center;justify-content:space-between;gap:10px}.expense{display:flex;gap:12px;align-items:center}.emoji{width:46px;height:46px;background:var(--surface2);border-radius:16px;display:grid;place-items:center;font-size:23px}.title{font-weight:850}.amount{font-weight:950}.small{font-size:12px;color:var(--muted)}.nav{position:fixed;left:0;right:0;bottom:0;display:flex;background:rgba(7,7,7,.86);border-top:1px solid var(--border);backdrop-filter:blur(18px);padding:8px 0 calc(env(safe-area-inset-bottom) + 8px);z-index:10}.nav button{flex:1;background:transparent;color:var(--muted);border:0;padding:8px 4px;font-size:11px}.nav b{display:block;color:var(--ink);font-size:22px}.form{display:grid;gap:14px}.field label{display:block;margin-bottom:7px}.input{width:100%;background:var(--surface2);color:var(--ink);border:1px solid var(--border);border-radius:16px;padding:14px;outline:none}.chips{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.chip{border:1px solid var(--border);background:var(--surface2);color:var(--muted);border-radius:16px;padding:11px 6px}.chip.on{border-color:var(--orange);color:var(--orange);background:rgba(255,107,43,.1)}.primary{background:var(--green);color:#001b10;border:0;border-radius:18px;padding:16px;font-weight:950}.secondary{background:var(--surface2);color:var(--ink);border:1px solid var(--border);border-radius:18px;padding:15px;font-weight:800}.paygrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.paybtn{border:0;border-radius:18px;padding:15px 10px;color:white;display:grid;gap:4px;text-align:center;box-shadow:var(--shadow)}.paybtn b{font-size:13px}.paybtn span{font-size:11px;opacity:.82}.paybtn.mp{background:linear-gradient(135deg,#009ee3,#0069ff)}.paybtn.nx{background:linear-gradient(135deg,#ff6b2b,#00d084);color:#08100c}.danger{color:var(--red)}.videoBox{aspect-ratio:1;border-radius:28px;overflow:hidden;background:#000;position:relative;border:1px solid var(--border)}video{width:100%;height:100%;object-fit:cover}.frame{position:absolute;inset:20%;border:3px solid var(--orange);border-radius:24px;box-shadow:0 0 0 999px rgba(0,0,0,.35)}.filters{display:grid;grid-template-columns:1fr 1fr;gap:8px}.toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);background:var(--ink);color:#111;padding:12px 18px;border-radius:99px;font-weight:800;z-index:30;white-space:nowrap}.barrow{display:grid;grid-template-columns:90px 1fr 75px;gap:10px;align-items:center;margin:10px 0}.bar{height:8px;border-radius:99px;background:#242424;overflow:hidden}.bar div{height:100%;background:var(--orange)}
    `}</style>
    <div className="app">
      {screen==='home' && <>
        <div className="top"><div className="brand">Gasto<span>QR</span></div><button className="iconbtn" onClick={()=>navigate('settings')}>⚙️</button></div>
        <div className="hero"><div className="label">Gastos este mes</div><div className="total">${fmt(monthTotal)}</div><div className="muted">{thisMonth.length} registros · presupuesto {settings.budget ? `$${fmt(settings.budget)}` : 'sin definir'}</div>{settings.budget>0&&<div className="progress"><div style={{width:`${budgetPct}%`}} /></div>}</div>
        <button className="scan" onClick={startCamera}><span>📷 Escanear QR</span><span>→</span></button>
        {insights.map((x,i)=><div className="card" key={i} style={{marginBottom:10}}>💡 {x}</div>)}
        <div className="label" style={{margin:'20px 0 10px'}}>Últimos gastos</div>
        <div className="grid">{expenses.slice(0,8).map(e=><Expense key={e.id} e={e} del={del}/>)}</div>
        {!expenses.length&&<div className="card muted">Todavía no hay gastos. Escaneá o cargá uno manual.</div>}
      </>}

      {screen==='scan' && <>
        <div className="top"><button className="iconbtn" onClick={()=>stopCamera(true)}>←</button><div className="title">Escanear QR</div><span/></div>
        <div className="videoBox"><video ref={videoRef} autoPlay playsInline muted/><div className="frame"/></div>
        <p className="muted" style={{textAlign:'center'}}>Apuntá al QR. Si no lee, subí una imagen.</p>
        <button className="secondary" style={{width:'100%'}} onClick={()=>fileRef.current.click()}>🖼️ Subir imagen del QR</button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e=>readQRImage(e.target.files?.[0])}/>
      </>}

      {screen==='confirm' && <>
        <div className="top"><button className="iconbtn" onClick={()=>navigate('home')}>←</button><div className="title">Nuevo gasto</div><span/></div>
        <div className="card form">
          <div className="field"><label className="label">Monto</label><input className="input" inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="0.00"/></div>
          <div className="field"><label className="label">Lugar / comercio</label><input className="input" value={form.place} onChange={e=>updatePlace(e.target.value)} placeholder="Kiosco, café, súper..."/></div>
          <div className="filters"><div className="field"><label className="label">Fecha</label><input className="input" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></div><div className="field"><label className="label">Método</label><select className="input" value={form.method} onChange={e=>setForm({...form,method:e.target.value})}><option>Mercado Pago</option><option>NaranjaX</option><option>Débito</option><option>Crédito</option><option>Efectivo</option><option>Otro</option></select></div></div>
          <div><div className="label" style={{marginBottom:8}}>Categoría</div><div className="chips">{CATS.map(([em,n])=><button key={n} className={`chip ${form.category.includes(n)?'on':''}`} onClick={()=>setForm({...form,category:`${em} ${n}`})}>{em}<br/>{n}</button>)}</div></div>
          {form.lat&&<div className="small">📍 Ubicación guardada aproximada</div>}
          <div className="paygrid">
            <button className="paybtn mp" onClick={()=>saveAndOpenPayment('mp')}><b>💙 Mercado Pago</b><span>Guardar y abrir</span></button>
            <button className="paybtn nx" onClick={()=>saveAndOpenPayment('nx')}><b>🧡 NaranjaX</b><span>Guardar y abrir</span></button>
          </div>
          <button className="primary" onClick={saveExpense}>Solo guardar gasto</button>
        </div>
      </>}

      {screen==='history' && <>
        <div className="top"><div className="brand">Historial</div><button className="iconbtn" onClick={()=>setScreen('confirm')}>＋</button></div>
        <div className="card" style={{marginBottom:12}}><div className="form"><input className="input" placeholder="Buscar comercio/categoría" value={query} onChange={e=>setQuery(e.target.value)}/><div className="filters"><input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)}/><input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div><select className="input" value={catFilter} onChange={e=>setCatFilter(e.target.value)}><option>Todas</option>{CATS.map(c=><option key={c[1]}>{c[1]}</option>)}</select></div></div>
        <div className="grid">{filtered.map(e=><Expense key={e.id} e={e} del={del}/>)}</div>
      </>}

      {screen==='stats' && <>
        <div className="top"><div className="brand">Stats</div><button className="iconbtn" onClick={exportCSV}>CSV</button></div>
        <div className="card" style={{marginBottom:12}}><div className="label">Total histórico</div><div className="total">${fmt(expenses.reduce((s,e)=>s+Number(e.amount||0),0))}</div><div className="muted">{expenses.length} gastos registrados</div></div>
        <div className="card" style={{marginBottom:12}}><div className="label">Por categoría</div>{catTotals.map(([c,v])=><div className="barrow" key={c}><span className="small">{c}</span><div className="bar"><div style={{width:`${catTotals[0]?.[1]?v/catTotals[0][1]*100:0}%`}}/></div><b>${fmt(v)}</b></div>)}</div>
        <div className="card form"><button className="secondary" onClick={exportCSV}>📥 Descargar CSV</button><button className="secondary" onClick={backupJSON}>💾 Descargar backup JSON</button><button className="secondary" onClick={()=>restoreRef.current.click()}>♻️ Restaurar backup</button><input hidden ref={restoreRef} type="file" accept="application/json" onChange={e=>restoreJSON(e.target.files?.[0])}/></div>
      </>}

      {screen==='settings' && <>
        <div className="top"><button className="iconbtn" onClick={()=>navigate('home')}>←</button><div className="title">Configuración</div><span/></div>
        <div className="card form"><div className="field"><label className="label">Presupuesto mensual</label><input className="input" inputMode="numeric" value={settings.budget} onChange={e=>setSettings({...settings,budget:Number(e.target.value||0)})}/></div><div className="field"><label className="label">Alerta al porcentaje</label><input className="input" inputMode="numeric" value={settings.alertPct} onChange={e=>setSettings({...settings,alertPct:Number(e.target.value||0)})}/></div><button className="secondary" onClick={backupJSON}>Descargar backup</button></div>
      </>}
    </div>
    {toast&&<div className="toast">{toast}</div>}
    {screen!=='scan'&&screen!=='confirm'&&<nav className="nav"><button onClick={()=>navigate('home')}><b>🏠</b>Inicio</button><button onClick={startCamera}><b>📷</b>QR</button><button onClick={()=>navigate('history')}><b>📋</b>Historial</button><button onClick={()=>navigate('stats')}><b>📊</b>Stats</button></nav>}
  </>;
}

function Expense({ e, del }) {
  const emoji = String(e.category || '❓').split(' ')[0];
  return <div className="card row" onClick={()=>del(e.id)}><div className="expense"><div className="emoji">{emoji}</div><div><div className="title">{e.place}</div><div className="small">{e.date} · {e.category} · {e.method || 'Sin método'}</div></div></div><div className="amount">${fmt(e.amount)}</div></div>;
}
