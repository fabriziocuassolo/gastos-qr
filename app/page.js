'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const CATS = ['🍔 Comida','🚗 Transporte','🛒 Compras','🏥 Salud','🎬 Ocio','💡 Servicios','🏠 Hogar','❓ Otro'];
const PAY = ['Mercado Pago','NaranjaX','Efectivo','Débito','Crédito','Transferencia'];
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function uid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
function money(n){ return Number(n||0).toLocaleString('es-AR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
function today(){ return new Date().toISOString().slice(0,10); }
function monthKey(d=today()){ return d.slice(0,7); }

export default function Home(){
  const [tab,setTab]=useState('inicio');
  const [expenses,setExpenses]=useState([]);
  const [settings,setSettings]=useState({budget:0,alertPct:80,userCode:''});
  const [q,setQ]=useState('');
  const [from,setFrom]=useState('');
  const [to,setTo]=useState('');
  const [form,setForm]=useState({amount:'',place:'',date:today(),category:'❓ Otro',payment:'Mercado Pago'});
  const [syncMsg,setSyncMsg]=useState('');

  useEffect(()=>{
    const saved = JSON.parse(localStorage.getItem('gq_expenses')||'[]');
    const st = JSON.parse(localStorage.getItem('gq_settings')||'{}');
    const userCode = st.userCode || localStorage.getItem('gq_user') || uid();
    const next = {...settings,...st,userCode};
    setSettings(next); setExpenses(saved);
    localStorage.setItem('gq_user', userCode);
    localStorage.setItem('gq_settings', JSON.stringify(next));
    if(supabase) syncDown(userCode);
  },[]);

  function persist(list){ setExpenses(list); localStorage.setItem('gq_expenses',JSON.stringify(list)); }
  function saveSettings(next){ setSettings(next); localStorage.setItem('gq_settings',JSON.stringify(next)); }

  async function syncDown(userCode=settings.userCode){
    if(!supabase) return;
    setSyncMsg('Sincronizando nube...');
    const {data,error}=await supabase.from('expenses').select('*').eq('owner_id',userCode).order('date',{ascending:false});
    if(error){ setSyncMsg('Error nube: '+error.message); return; }
    const mapped=(data||[]).map(x=>({id:x.id,amount:x.amount,place:x.place,date:x.date,category:x.category,payment:x.payment,notes:x.notes||''}));
    persist(mapped); setSyncMsg('Nube sincronizada ✅'); setTimeout(()=>setSyncMsg(''),2500);
  }
  async function syncOne(exp){
    if(!supabase) return;
    await supabase.from('expenses').upsert({id:exp.id,owner_id:settings.userCode,amount:Number(exp.amount),place:exp.place,date:exp.date,category:exp.category,payment:exp.payment,notes:exp.notes||''});
  }
  async function removeExpense(id){
    const list=expenses.filter(e=>e.id!==id); persist(list);
    if(supabase) await supabase.from('expenses').delete().eq('id',id).eq('owner_id',settings.userCode);
  }

  function addExpense(e){
    e?.preventDefault();
    const amount=Number(form.amount);
    if(!amount || !form.place.trim()) return alert('Completá monto y lugar');
    const exp={...form,id:uid(),amount,place:form.place.trim()};
    const list=[exp,...expenses]; persist(list); syncOne(exp);
    setForm({amount:'',place:'',date:today(),category:'❓ Otro',payment:'Mercado Pago'});
    setTab('inicio');
  }

  function parseQR(){
    const txt=prompt('Pegá el texto del QR para testear, o escribí: monto=2500&comercio=Kiosco');
    if(!txt) return;
    const amount=(txt.match(/(?:monto|amount|total)=?\s*\$?([0-9.,]+)/i)||[])[1];
    const place=(txt.match(/(?:comercio|merchant|lugar|place)=?\s*([^&\n]+)/i)||[])[1];
    setForm(f=>({...f,amount:amount?amount.replace('.','').replace(',','.'):f.amount,place:place?decodeURIComponent(place):f.place}));
    setTab('manual');
  }

  function openPay(payment){
    if(payment==='Mercado Pago') location.href='mercadopago://';
    if(payment==='NaranjaX') location.href='nx://';
    setTimeout(()=>{ if(payment==='Mercado Pago') window.open('https://www.mercadopago.com.ar','_blank'); if(payment==='NaranjaX') window.open('https://www.naranjax.com','_blank'); },900);
  }
  function saveAndOpen(e){ e.preventDefault(); const p=form.payment; addExpense(e); setTimeout(()=>openPay(p),250); }

  const monthTotal=useMemo(()=>expenses.filter(e=>monthKey(e.date)===monthKey()).reduce((s,e)=>s+Number(e.amount),0),[expenses]);
  const filtered=expenses.filter(e=>(!q||JSON.stringify(e).toLowerCase().includes(q.toLowerCase()))&&(!from||e.date>=from)&&(!to||e.date<=to));
  const pct=settings.budget?Math.round(monthTotal/settings.budget*100):0;

  function exportCSV(){
    const rows=[['Fecha','Lugar','Categoria','Monto','Metodo'],...expenses.map(e=>[e.date,e.place,e.category,e.amount,e.payment])];
    const csv='\uFEFF'+rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='gastos-qr.csv'; a.click();
  }
  function exportJSON(){
    const data=JSON.stringify({settings,expenses},null,2); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([data],{type:'application/json'})); a.download='backup-gastoqr.json'; a.click();
  }
  function importJSON(ev){
    const file=ev.target.files?.[0]; if(!file) return; const r=new FileReader();
    r.onload=()=>{ const data=JSON.parse(r.result); if(data.expenses) persist(data.expenses); if(data.settings) saveSettings({...settings,...data.settings}); alert('Backup restaurado');}; r.readAsText(file);
  }

  return <main>
    <style>{css}</style>
    <header><b>Gasto<span>QR</span></b><small>{supabase?'Nube activa':'Modo local'}</small></header>
    {syncMsg && <div className="notice">{syncMsg}</div>}

    {tab==='inicio' && <section>
      <div className="hero"><small>Gastos este mes</small><h1>${money(monthTotal)}</h1><p>{settings.budget?`${pct}% de tu presupuesto de $${money(settings.budget)}`:'Sin presupuesto configurado'}</p><div className="bar"><i style={{width:Math.min(pct,100)+'%'}}/></div>{settings.budget&&pct>=settings.alertPct&&<p className="warn">⚠️ Alerta: superaste el {settings.alertPct}% del presupuesto</p>}</div>
      <button className="primary" onClick={()=>setTab('manual')}>➕ Cargar gasto manual</button>
      <button className="secondary" onClick={parseQR}>📷 Escanear / probar QR</button>
      <h3>Últimos gastos</h3>{expenses.slice(0,6).map(e=><Card key={e.id} e={e} del={removeExpense}/>)}</section>}

    {tab==='manual' && <section><h2>Cargar gasto</h2><ExpenseForm form={form} setForm={setForm} onSave={addExpense} onPay={saveAndOpen}/></section>}

    {tab==='historial' && <section><h2>Historial</h2><div className="filters"><label>Buscar<input placeholder="Lugar, categoría, método..." value={q} onChange={e=>setQ(e.target.value)}/></label><label>Desde<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Hasta<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label></div>{filtered.map(e=><Card key={e.id} e={e} del={removeExpense}/>)}</section>}

    {tab==='stats' && <section><h2>Estadísticas</h2><button className="secondary" onClick={exportCSV}>📥 Descargar CSV</button><Stats expenses={expenses}/></section>}

    {tab==='config' && <section><h2>Configuración</h2><div className="panel"><label>Presupuesto mensual<input type="number" value={settings.budget} onChange={e=>saveSettings({...settings,budget:Number(e.target.value)})} placeholder="Ej: 300000"/></label><label>Alerta al % del presupuesto<input type="number" value={settings.alertPct} onChange={e=>saveSettings({...settings,alertPct:Number(e.target.value)})}/></label><label>Código de usuario para nube<input value={settings.userCode} onChange={e=>saveSettings({...settings,userCode:e.target.value})}/></label><p>El backup sirve para guardar una copia local de seguridad por si borrás Safari o cambiás el celular. Si activás Supabase, además queda en la nube.</p><button onClick={exportJSON}>💾 Descargar backup JSON</button><label className="upload">📤 Restaurar backup JSON<input type="file" accept="application/json" onChange={importJSON}/></label>{supabase&&<button onClick={()=>syncDown()}>☁️ Sincronizar nube</button>}</div></section>}

    <nav>{[['inicio','🏠'],['manual','➕'],['historial','📋'],['stats','📊'],['config','⚙️']].map(([t,i])=><button className={tab===t?'on':''} onClick={()=>setTab(t)} key={t}>{i}<small>{t}</small></button>)}</nav>
  </main>
}

function ExpenseForm({form,setForm,onSave,onPay}){return <form className="panel" onSubmit={onSave}>
  <label>Monto<input type="number" inputMode="decimal" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Ej: 2500"/></label>
  <label>Lugar / comercio<input value={form.place} onChange={e=>setForm({...form,place:e.target.value})} placeholder="Ej: Kiosco, súper, café"/></label>
  <label>Fecha<input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label>
  <label>Categoría<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATS.map(c=><option key={c}>{c}</option>)}</select></label>
  <label>Método de pago<select value={form.payment} onChange={e=>setForm({...form,payment:e.target.value})}>{PAY.map(p=><option key={p}>{p}</option>)}</select></label>
  <button className="primary" type="submit">Guardar gasto</button>
  {(form.payment==='Mercado Pago'||form.payment==='NaranjaX')&&<button className="secondary" onClick={onPay}>Guardar y abrir {form.payment}</button>}
</form>}
function Card({e,del}){return <div className="card"><div><b>{e.category.split(' ')[0]} {e.place}</b><small>{e.date} · {e.category} · {e.payment}</small></div><strong>${money(e.amount)}</strong><button onClick={()=>confirm('¿Eliminar?')&&del(e.id)}>🗑️</button></div>}
function Stats({expenses}){const by={}; expenses.forEach(e=>by[e.category]=(by[e.category]||0)+Number(e.amount)); return <div className="panel">{Object.entries(by).sort((a,b)=>b[1]-a[1]).map(([k,v])=><p key={k}><b>{k}</b> ${money(v)}</p>)}{!expenses.length&&<p>Sin gastos todavía.</p>}</div>}
const css=`body{margin:0;background:#070707;color:#f7f2ec;font-family:Inter,system-ui,sans-serif}main{max-width:560px;margin:auto;min-height:100dvh;padding-bottom:88px}header{display:flex;justify-content:space-between;align-items:end;padding:44px 20px 12px}header b{font-size:24px}header span{color:#ff6b2b}small{color:#aaa;display:block}.notice{margin:0 20px 12px;background:#0d2d22;color:#9fffd8;border:1px solid #00b87a55;padding:12px;border-radius:16px}section{padding:0 20px}.hero,.panel,.card{background:#121212;border:1px solid #262626;border-radius:22px;padding:18px;margin:12px 0;box-shadow:0 12px 35px #0005}.hero h1{font-size:42px;margin:6px 0;color:#fff}.hero p{color:#bbb}.bar{height:9px;background:#252525;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,#00b87a,#ff6b2b)}.warn{color:#ffb17f!important}.primary,.secondary,button,.upload{width:100%;border:0;border-radius:16px;padding:15px;margin:7px 0;font-weight:800;color:white;background:#ff6b2b;font-size:15px}.secondary,button{background:#1f1f1f;border:1px solid #333}.panel label{font-size:12px;color:#aaa;text-transform:uppercase;letter-spacing:.08em;margin:12px 0 4px;display:block}.panel input,.panel select,.filters input{width:100%;box-sizing:border-box;background:#080808;color:#fff;border:1px solid #333;border-radius:14px;padding:14px;font-size:16px;margin-top:7px}.filters{display:grid;gap:12px;background:#121212;border:1px solid #262626;border-radius:22px;padding:16px;margin:12px 0}.filters label{color:#bbb;font-size:13px}.card{display:grid;grid-template-columns:1fr auto 44px;gap:10px;align-items:center}.card b{display:block}.card strong{color:#00b87a}nav{position:fixed;left:0;right:0;bottom:0;background:#0c0c0cf2;backdrop-filter:blur(18px);display:flex;gap:4px;padding:8px 8px 22px;border-top:1px solid #222}nav button{font-size:20px;padding:8px 2px;margin:0;border-radius:14px;background:transparent}nav button.on{background:#ff6b2b22;color:#ff6b2b}nav small{font-size:10px;text-transform:capitalize}.upload input{display:none}h2,h3{margin-top:18px}`;
