'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

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

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmt(n) {
  return Number(n || 0).toLocaleString('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function monthKey(date = today()) {
  return String(date).slice(0, 7);
}

function catLabel(name) {
  const clean = String(name || '').replace(/[^\p{L}\p{N}\s]/gu, '').trim().toLowerCase();
  const hit = CATS.find(c =>
    c[1].toLowerCase() === clean ||
    `${c[0]} ${c[1]}`.toLowerCase() === String(name || '').toLowerCase()
  );
  return hit ? `${hit[0]} ${hit[1]}` : '❓ Otro';
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function parseTLV(value = '') {
  const result = {};
  let i = 0;
  while (i + 4 <= value.length) {
    const id = value.slice(i, i + 2);
    const lenRaw = value.slice(i + 2, i + 4);
    const len = Number(lenRaw);
    if (!/^\d{2}$/.test(id) || !Number.isFinite(len) || len < 0) break;
    const start = i + 4;
    const end = start + len;
    if (end > value.length) break;
    const fieldValue = value.slice(start, end);
    result[id] = fieldValue;
    if ((Number(id) >= 26 && Number(id) <= 51) || id === '62' || id === '64' || id === '80') {
      const nested = parseTLV(fieldValue);
      if (Object.keys(nested).length) result[id + '_nested'] = nested;
    }
    i = end;
  }
  return result;
}

function normalizeAmount(v = '') {
  const raw = String(v || '').trim();
  if (!raw) return '';
  let cleaned = raw.replace(/[^\d.,]/g, '').replace(/\s/g, '');
  if (!cleaned) return '';
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    cleaned = cleaned.replace(',', '.');
  }
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(n);
}

function extractAmountFromText(text = '') {
  const raw = String(text || '').replace(/\s+/g, ' ').replace(/[Oo]/g, '0');
  const lines = String(text || '').split(/\n|\\n|\r/).map(l => l.trim()).filter(Boolean);
  const priorityLines = lines.filter(l => /(total|monto|importe|pagar|cobrar|valor|amount)/i.test(l));
  const linePatterns = [/\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/];
  for (const line of priorityLines) {
    for (const p of linePatterns) {
      const m = line.match(p);
      if (m) { const amount = normalizeAmount(m[1]); if (amount) return amount; }
    }
  }
  const patterns = [
    /(?:total|monto|importe|pagar|cobrar|valor|amount)\s*[:\-]?\s*\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/i,
    /\$\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/i
  ];
  for (const p of patterns) {
    const m = raw.match(p);
    if (m) { const amount = normalizeAmount(m[1]); if (amount) return amount; }
  }
  return '';
}

function inferFromText(text = '') {
  const raw = String(text || '');
  const decodedRaw = (() => { try { return decodeURIComponent(raw); } catch { return raw; } })();
  const decoded = decodedRaw.toLowerCase();
  let place = '';
  let amount = '';
  let category = '❓ Otro';
  try {
    const params = new URLSearchParams(raw.includes('?') ? raw.split('?').slice(1).join('?') : raw);
    const pMonto = params.get('monto') || params.get('amount') || params.get('importe') || params.get('total') || params.get('value');
    const pComercio = params.get('comercio') || params.get('merchant') || params.get('lugar') || params.get('place') || params.get('name');
    const pCategoria = params.get('categoria') || params.get('category');
    if (pMonto) amount = normalizeAmount(pMonto);
    if (pComercio) place = pComercio;
    if (pCategoria) category = catLabel(pCategoria);
  } catch {}
  const emv = parseTLV(raw);
  if (!amount && emv['54']) amount = normalizeAmount(emv['54']);
  if (!place && emv['59']) place = emv['59'];
  if (!place) {
    for (let id = 26; id <= 51; id++) {
      const nested = emv[String(id).padStart(2, '0') + '_nested'];
      if (!nested) continue;
      const candidates = [nested['59'], nested['02'], nested['01'], nested['00']].filter(Boolean);
      const best = candidates.find(x => !/^com\.|^ar\.|^br\.|^https?:/i.test(x));
      if (best) { place = best; break; }
    }
  }
  if (!place && emv['60']) place = emv['60'];
  if (!amount) {
    const amountPatterns = [
      /(?:monto|amount|total|importe|value)[=: ]+\$?\s*([0-9]+(?:[\.,][0-9]{1,2})?)/i,
      /\$\s*([0-9]+(?:[\.,][0-9]{1,2})?)/i
    ];
    for (const p of amountPatterns) {
      const m = decodedRaw.match(p);
      if (m) { amount = normalizeAmount(m[1]); break; }
    }
  }
  if (!place) {
    try { const u = new URL(raw); place = u.hostname.replace(/^www\./, ''); }
    catch { place = decodedRaw.slice(0, 44); }
  }
  if (category === '❓ Otro') {
    Object.entries(CAT_RULES).forEach(([cat, words]) => {
      if (words.some(w => decoded.includes(w))) category = catLabel(cat);
    });
  }
  return {
    place: String(place || '').replace(/\s+/g, ' ').trim(),
    amount,
    category
  };
}

function captureElementVideo(containerId) {
  const video = document.querySelector(`#${containerId} video`);
  if (!video || !video.videoWidth || !video.videoHeight) return '';
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.92);
}

async function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Kuento Logo SVG component
function KuentoLogo({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="14" fill="#112233"/>
      <line x1="20" y1="14" x2="20" y2="50" stroke="url(#kGrad)" strokeWidth="5" strokeLinecap="round"/>
      <path d="M20 32 L44 14" stroke="url(#kGrad)" strokeWidth="5" strokeLinecap="round"/>
      <path d="M20 32 L38 50" stroke="url(#kGrad2)" strokeWidth="5" strokeLinecap="round"/>
      <path d="M38 50 Q44 50 44 44 L44 38" stroke="url(#kGrad2)" strokeWidth="5" strokeLinecap="round" fill="none"/>
      <polygon points="44,14 50,20 38,20" fill="#33FFCC"/>
      <circle cx="20" cy="50" r="3" fill="#33EBC3"/>
      <defs>
        <linearGradient id="kGrad" x1="20" y1="14" x2="44" y2="14" gradientUnits="userSpaceOnUse">
          <stop stopColor="#33FFCC"/>
          <stop offset="1" stopColor="#33EBC3"/>
        </linearGradient>
        <linearGradient id="kGrad2" x1="20" y1="32" x2="44" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#33EBC3"/>
          <stop offset="1" stopColor="#1db89a"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function Home() {
  const [screen, setScreen] = useState('home');
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({ budget: 0, alertPct: 80 });
  const [form, setForm] = useState({
    amount: '', place: '', date: today(), category: '❓ Otro',
    method: 'Manual', qrData: '', lat: null, lng: null
  });
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [scanStatus, setScanStatus] = useState('Apuntá al QR incluyendo el monto visible de arriba si aparece.');
  const [ocrBusy, setOcrBusy] = useState(false);

  const qrRef = useRef(null);
  const scanningRef = useRef(false);
  const processingRef = useRef(false);
  const fileRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    setExpenses(JSON.parse(localStorage.getItem('gq_expenses_v2') || localStorage.getItem('gq_expenses') || '[]'));
    setSettings(JSON.parse(localStorage.getItem('gq_settings_v2') || '{"budget":0,"alertPct":80}'));
  }, []);

  useEffect(() => { localStorage.setItem('gq_expenses_v2', JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem('gq_settings_v2', JSON.stringify(settings)); }, [settings]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2400);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => () => stopCamera(false), []);

  const thisMonth = useMemo(() => expenses.filter(e => monthKey(e.date) === monthKey()), [expenses]);
  const monthTotal = useMemo(() => thisMonth.reduce((s,e) => s + Number(e.amount||0), 0), [thisMonth]);
  const budgetPct = settings.budget ? Math.min(100, Math.round(monthTotal / settings.budget * 100)) : 0;

  const filtered = useMemo(() => expenses.filter(e => {
    const q = query.toLowerCase().trim();
    const okQ = !q || [e.place,e.category,e.method].join(' ').toLowerCase().includes(q);
    const okC = catFilter === 'Todas' || e.category.includes(catFilter);
    const okF = !from || e.date >= from;
    const okT = !to || e.date <= to;
    return okQ && okC && okF && okT;
  }), [expenses, query, catFilter, from, to]);

  const catTotals = useMemo(() => {
    const m = {};
    expenses.forEach(e => m[e.category] = (m[e.category] || 0) + Number(e.amount || 0));
    return Object.entries(m).sort((a,b) => b[1]-a[1]);
  }, [expenses]);

  const insights = useMemo(() => {
    const arr = [];
    if (settings.budget && monthTotal >= settings.budget * (settings.alertPct/100)) arr.push(`ALERTA: ya usaste ${budgetPct}% de tu presupuesto mensual.`);
    if (catTotals[0]) arr.push(`Tu categoría más fuerte es ${catTotals[0][0]} con $${fmt(catTotals[0][1])}.`);
    const todayTotal = expenses.filter(e => e.date===today()).reduce((s,e) => s+Number(e.amount||0), 0);
    if (todayTotal) arr.push(`Hoy llevás gastado $${fmt(todayTotal)}.`);
    return arr.length ? arr : ['Todavía no hay suficientes datos para insights.'];
  }, [expenses, settings, monthTotal, budgetPct, catTotals]);

  function notify(msg) { setToast(msg); }
  function navigate(s) { stopCamera(false); setScreen(s); }

  function updatePlace(v) {
    let category = form.category;
    const low = v.toLowerCase();
    Object.entries(CAT_RULES).forEach(([cat, words]) => {
      if (words.some(w => low.includes(w))) category = catLabel(cat);
    });
    setForm(f => ({ ...f, place: v, category }));
  }

  function openManualExpense() {
    stopCamera(false);
    setForm({ amount: '', place: '', date: today(), category: '❓ Otro', method: 'Manual', qrData: '', lat: null, lng: null });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })),
        () => {}, { enableHighAccuracy: false, timeout: 4000 }
      );
    }
    setScreen('confirm');
  }

  async function runOCRForVisibleAmount(imageDataUrl) {
    if (!imageDataUrl) return '';
    try {
      setOcrBusy(true);
      setScanStatus('QR leído. Buscando monto visible con OCR...');
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const result = await worker.recognize(imageDataUrl);
      await worker.terminate();
      const text = result?.data?.text || '';
      return extractAmountFromText(text);
    } catch {
      return '';
    } finally {
      setOcrBusy(false);
    }
  }

  async function openConfirm(qrData = '', imageDataUrl = '') {
    const guess = inferFromText(qrData);
    setForm({ amount: guess.amount || '', place: guess.place || '', date: today(), category: guess.category || '❓ Otro', method: 'Manual', qrData, lat: null, lng: null });
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })),
        () => {}, { enableHighAccuracy: false, timeout: 4000 }
      );
    }
    setScreen('confirm');
    if (!guess.amount && imageDataUrl) {
      const visibleAmount = await runOCRForVisibleAmount(imageDataUrl);
      if (visibleAmount) { setForm(f => ({ ...f, amount: visibleAmount })); notify('Monto detectado visualmente'); }
      else notify('No encontré monto en el QR. Cargalo manual.');
    }
  }

  async function startCamera() {
    stopCamera(false);
    setScreen('scan');
    setScanStatus('Apuntá al QR incluyendo el monto visible de arriba si aparece.');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader');
      qrRef.current = scanner;
      scanningRef.current = true;
      processingRef.current = false;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 15, qrbox: (vw, vh) => { const size = Math.floor(Math.min(vw, vh) * 0.78); return { width: size, height: size }; }, aspectRatio: 1.0, disableFlip: false, experimentalFeatures: { useBarCodeDetectorIfSupported: true } },
        async decodedText => {
          if (processingRef.current) return;
          processingRef.current = true;
          const frame = captureElementVideo('qr-reader');
          await stopCamera(false);
          await openConfirm(decodedText, frame);
        },
        () => {}
      );
    } catch (e) {
      notify('Sin permiso de cámara o error de lector. Probá subir imagen del QR.');
      setScanStatus('No pude abrir la cámara.');
    }
  }

  async function stopCamera(goHome = false) {
    scanningRef.current = false;
    processingRef.current = false;
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch {}
      try { await qrRef.current.clear(); } catch {}
    }
    qrRef.current = null;
    if (goHome) setScreen('home');
  }

  async function readQRImage(file) {
    if (!file) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const imageDataUrl = await imageFileToDataUrl(file);
      const scanner = new Html5Qrcode('qr-file-reader');
      let decodedText = '';
      try { decodedText = await scanner.scanFile(file, true); }
      finally { try { await scanner.clear(); } catch {} }
      await stopCamera(false);
      await openConfirm(decodedText, imageDataUrl);
    } catch {
      await stopCamera(false);
      notify('No pude leer el QR. Probá con una foto más nítida y completa.');
    }
  }

  function buildExpense(methodOverride) {
    const amount = Number(String(form.amount).replace(',', '.'));
    if (!amount || amount <= 0) { notify('Ingresá un monto válido'); return null; }
    if (!form.place.trim()) { notify('Ingresá el comercio/lugar'); return null; }
    return { ...form, id: Date.now(), amount, place: form.place.trim(), method: methodOverride || form.method || 'Manual' };
  }

  function saveExpense() {
    const item = buildExpense('Manual');
    if (!item) return;
    setExpenses([item, ...expenses]);
    notify('Gasto guardado');
    setScreen('home');
  }

  function openPaymentApp(app) {
    const cfg = app === 'nx'
      ? { name: 'NaranjaX', scheme: 'nx://', fallback: 'https://app.naranjax.com/' }
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

  function del(id) {
    if (confirm('¿Eliminar este gasto?')) setExpenses(expenses.filter(e => e.id !== id));
  }

  function exportCSV() {
    if (!expenses.length) return notify('No hay gastos');
    const headers = ['Fecha','Lugar','Categoria','Monto','Metodo','Lat','Lng'];
    const rows = expenses.map(e => [e.date,e.place,e.category,e.amount,e.method,e.lat||'',e.lng||'']);
    const csv = [headers,...rows].map(r => r.map(v => '"' + String(v ?? '').replace(/"/g,'""') + '"').join(',')).join('\n');
    downloadFile(`kuento-${today()}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
  }

  function backupJSON() {
    downloadFile(`backup-kuento-${today()}.json`, JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), settings, expenses }, null, 2), 'application/json');
  }

  function saveBudgetSettings() {
    localStorage.setItem('gq_settings_v2', JSON.stringify(settings));
    notify('✅ Presupuesto fijado correctamente');
  }

  function restoreJSON(file) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!Array.isArray(data.expenses)) throw Error();
        setExpenses(data.expenses);
        if (data.settings) setSettings(data.settings);
        notify('Backup restaurado');
      } catch { notify('Backup inválido'); }
    };
    r.readAsText(file);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;900&display=swap');

        :root {
          --bg: #1A2F3C;
          --bg2: #162738;
          --surface: #1f3647;
          --surface2: #243d50;
          --border: rgba(51,235,195,0.15);
          --border2: rgba(51,235,195,0.08);
          --ink: #FFFFFF;
          --muted: rgba(255,255,255,0.55);
          --accent: #33EBC3;
          --neon: #33FFCC;
          --neon-glow: rgba(51,255,204,0.25);
          --neon-glow2: rgba(51,255,204,0.12);
          --red: #ff5757;
          --shadow: 0 16px 48px rgba(0,0,0,0.35);
          --shadow-neon: 0 0 24px rgba(51,255,204,0.2), 0 8px 32px rgba(0,0,0,0.4);
        }

        * { box-sizing: border-box; }

        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
          font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        button, input, select { font: inherit; }

        .app {
          min-height: 100dvh;
          padding: calc(env(safe-area-inset-top) + 20px) 18px 100px;
          background:
            radial-gradient(ellipse at 85% -5%, rgba(51,255,204,0.12) 0%, transparent 45%),
            radial-gradient(ellipse at -10% 40%, rgba(51,235,195,0.07) 0%, transparent 40%),
            var(--bg);
        }

        /* TOP BAR */
        .top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 22px;
        }

        /* BRAND */
        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .brand-icon {
          width: 38px;
          height: 38px;
          border-radius: 11px;
          background: linear-gradient(145deg, #142030, #1c3548);
          border: 1px solid rgba(51,255,204,0.3);
          display: grid;
          place-items: center;
          box-shadow: 0 0 16px rgba(51,255,204,0.2), 0 4px 12px rgba(0,0,0,0.4);
        }

        .brand-name {
          font-size: 24px;
          font-weight: 900;
          letter-spacing: -0.04em;
          color: var(--ink);
        }

        .brand-name span { color: var(--neon); }

        /* ICON BUTTON */
        .iconbtn {
          background: var(--surface);
          border: 1px solid var(--border);
          color: var(--ink);
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 18px;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
        }
        .iconbtn:hover { border-color: var(--accent); background: var(--surface2); }

        /* HERO CARD */
        .hero {
          background: linear-gradient(145deg, var(--surface), var(--surface2));
          border: 1px solid var(--border);
          border-radius: 24px;
          padding: 24px;
          box-shadow: var(--shadow);
          position: relative;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .hero::before {
          content: '';
          position: absolute;
          top: -40px;
          right: -40px;
          width: 160px;
          height: 160px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(51,255,204,0.12), transparent 70%);
          pointer-events: none;
        }

        .label {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent);
          font-weight: 700;
          margin-bottom: 4px;
        }

        .total {
          font-size: 42px;
          font-weight: 900;
          letter-spacing: -0.06em;
          margin: 4px 0 6px;
          color: var(--ink);
        }

        .muted { color: var(--muted); font-size: 13px; }

        .progress {
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 99px;
          overflow: hidden;
          margin-top: 16px;
        }
        .progress div {
          height: 100%;
          background: linear-gradient(90deg, var(--accent), var(--neon));
          border-radius: 99px;
          box-shadow: 0 0 8px var(--neon-glow);
          transition: width 0.5s ease;
        }

        /* SCAN BUTTON */
        .scan {
          width: 100%;
          margin: 4px 0 10px;
          border: 0;
          border-radius: 20px;
          background: linear-gradient(135deg, var(--accent), var(--neon));
          color: #0a1e27;
          padding: 18px 20px;
          font-weight: 900;
          font-size: 17px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          box-shadow: 0 6px 28px var(--neon-glow), 0 2px 8px rgba(0,0,0,0.3);
          transition: transform 0.15s, box-shadow 0.15s;
          letter-spacing: -0.02em;
        }
        .scan:active { transform: scale(0.98); box-shadow: 0 3px 16px var(--neon-glow); }

        /* SECONDARY BUTTON */
        .secondary {
          background: var(--surface);
          color: var(--ink);
          border: 1px solid var(--border);
          border-radius: 18px;
          padding: 15px 20px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          width: 100%;
          text-align: center;
          transition: border-color 0.2s, background 0.2s;
        }
        .secondary:hover { border-color: var(--accent); background: var(--surface2); }

        /* CARDS */
        .grid { display: grid; gap: 10px; }

        .card {
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: 20px;
          padding: 16px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.2);
          transition: border-color 0.2s;
        }
        .card:hover { border-color: var(--border); }

        .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }

        /* EXPENSE ROW */
        .expense { display: flex; gap: 12px; align-items: center; }

        .emoji {
          width: 44px;
          height: 44px;
          background: var(--surface2);
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 22px;
          flex-shrink: 0;
          border: 1px solid var(--border2);
        }

        .exp-title { font-weight: 700; font-size: 15px; color: var(--ink); }
        .exp-amount { font-weight: 900; font-size: 16px; color: var(--neon); letter-spacing: -0.03em; }
        .small { font-size: 12px; color: var(--muted); margin-top: 2px; }

        /* INSIGHT CARDS */
        .insight-card {
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: 18px;
          padding: 14px 16px;
          margin-bottom: 10px;
          font-size: 14px;
          color: var(--muted);
        }
        .insight-card.alert {
          background: rgba(255,87,87,0.08);
          border-color: rgba(255,87,87,0.3);
          color: var(--ink);
        }
        .insight-card.alert strong { color: #ff7070; }

        /* NAV */
        .nav {
          position: fixed;
          left: 0; right: 0; bottom: 0;
          display: flex;
          background: rgba(20,36,48,0.92);
          border-top: 1px solid var(--border);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          padding: 10px 0 calc(env(safe-area-inset-bottom) + 10px);
          z-index: 10;
        }
        .nav button {
          flex: 1;
          background: transparent;
          color: var(--muted);
          border: 0;
          padding: 6px 4px;
          font-size: 11px;
          cursor: pointer;
          transition: color 0.2s;
          font-family: inherit;
        }
        .nav button:hover { color: var(--accent); }
        .nav b { display: block; font-size: 20px; margin-bottom: 2px; }

        /* FORM */
        .form { display: grid; gap: 14px; }

        .field { min-width: 0; width: 100%; }
        .field label { display: block; margin-bottom: 6px; }

        .input {
          width: 100%;
          min-width: 0;
          background: var(--bg2);
          color: var(--ink);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 13px 14px;
          outline: none;
          font-size: 15px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(51,235,195,0.12);
        }
        .input[type="date"] {
          -webkit-appearance: none;
          appearance: none;
          text-align: left;
          color-scheme: dark;
        }

        /* CATEGORY CHIPS */
        .chips { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
        .chip {
          border: 1px solid var(--border);
          background: var(--bg2);
          color: var(--muted);
          border-radius: 14px;
          padding: 10px 6px;
          font-size: 13px;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        .chip.on {
          border-color: var(--accent);
          color: var(--neon);
          background: rgba(51,235,195,0.1);
        }

        /* PRIMARY BUTTON */
        .primary {
          background: linear-gradient(135deg, var(--accent), var(--neon));
          color: #0a1e27;
          border: 0;
          border-radius: 16px;
          padding: 16px;
          font-weight: 900;
          font-size: 16px;
          cursor: pointer;
          width: 100%;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 4px 20px var(--neon-glow);
        }
        .primary:active { transform: scale(0.98); opacity: 0.9; }

        /* PAYMENT BUTTONS */
        .paygrid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .paybtn {
          border: 0;
          border-radius: 16px;
          padding: 14px 10px;
          color: white;
          display: grid;
          gap: 3px;
          text-align: center;
          box-shadow: var(--shadow);
          cursor: pointer;
          transition: transform 0.15s, opacity 0.15s;
        }
        .paybtn:active { transform: scale(0.97); }
        .paybtn b { font-size: 13px; font-weight: 800; }
        .paybtn span { font-size: 11px; opacity: 0.8; }
        .paybtn.mp { background: linear-gradient(135deg,#009ee3,#0069ff); }
        .paybtn.nx { background: linear-gradient(135deg,#ff6b2b,#ffaa00); color: #1a0900; }

        /* SCAN SCREEN */
        .videoBox {
          aspect-ratio: 1;
          border-radius: 24px;
          overflow: hidden;
          background: #000;
          position: relative;
          border: 1px solid var(--border);
          margin-bottom: 16px;
        }
        #qr-reader { width:100%; height:100%; background:#000; }
        #qr-reader video { width:100%!important; height:100%!important; object-fit:cover!important; }
        #qr-reader__scan_region { display:none!important; }
        #qr-reader__dashboard { display:none!important; }
        #qr-file-reader { display:none; }

        .frame {
          position: absolute;
          inset: 15%;
          border: 2px solid var(--neon);
          border-radius: 20px;
          box-shadow: 0 0 0 999px rgba(15,28,38,0.5), 0 0 24px var(--neon-glow);
          pointer-events: none;
        }
        .frame::before, .frame::after {
          content: '';
          position: absolute;
          width: 20px;
          height: 20px;
          border-color: var(--neon);
          border-style: solid;
        }
        .frame::before { top: -2px; left: -2px; border-width: 3px 0 0 3px; border-radius: 4px 0 0 0; }
        .frame::after { bottom: -2px; right: -2px; border-width: 0 3px 3px 0; border-radius: 0 0 4px 0; }

        /* FILTERS */
        .filters { display: grid!important; grid-template-columns: minmax(0,1fr) minmax(0,1fr)!important; gap: 12px!important; align-items: end; }
        .filters .field { min-width: 0; }
        .filters .input { min-width: 0; width: 100%; }
        @media(max-width:420px) { .filters { grid-template-columns: 1fr!important; } }

        /* TOAST */
        .toast {
          position: fixed;
          left: 50%;
          bottom: 96px;
          transform: translateX(-50%);
          background: var(--neon);
          color: #0a1e27;
          padding: 11px 20px;
          border-radius: 99px;
          font-weight: 800;
          font-size: 14px;
          z-index: 30;
          white-space: nowrap;
          box-shadow: 0 4px 20px var(--neon-glow);
          animation: toastIn 0.2s ease;
        }
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }

        /* STATS BARS */
        .barrow { display: grid; grid-template-columns: 90px 1fr 75px; gap: 10px; align-items: center; margin: 10px 0; }
        .bar { height: 6px; border-radius: 99px; background: var(--surface2); overflow: hidden; }
        .bar div { height: 100%; background: linear-gradient(90deg, var(--accent), var(--neon)); border-radius: 99px; }

        .hint { margin-top: 10px; text-align: center; line-height: 1.5; color: var(--muted); font-size: 13px; }
        .danger { color: var(--red); }

        .section-title { font-size: 13px; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.1em; margin: 20px 0 10px; }

        .danger-btn {
          background: rgba(255,87,87,0.1);
          border: 1px solid rgba(255,87,87,0.25);
          color: var(--red);
          border-radius: 16px;
          padding: 15px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          transition: background 0.2s;
        }
        .danger-btn:hover { background: rgba(255,87,87,0.18); }
      `}</style>

      <div id="qr-file-reader" />

      <div className="app">

        {/* ── HOME ── */}
        {screen === 'home' && (
          <>
            <div className="top">
              <div className="brand">
                <div className="brand-icon">
                  <KuentoLogo size={26} />
                </div>
                <span className="brand-name">Kuen<span>to</span></span>
              </div>
              <button className="iconbtn" onClick={() => navigate('settings')}>⚙️</button>
            </div>

            <div className="hero">
              <div className="label">Gastos este mes</div>
              <div className="total">${fmt(monthTotal)}</div>
              <div className="muted">{thisMonth.length} registros · {settings.budget ? `$${fmt(settings.budget)} presupuesto` : 'sin presupuesto'}</div>
              {settings.budget > 0 && (
                <div className="progress">
                  <div style={{ width: `${budgetPct}%` }} />
                </div>
              )}
            </div>

            <button className="scan" onClick={startCamera}>
              <span>📷 Escanear QR</span>
              <span style={{ fontSize: 20 }}>→</span>
            </button>

            <button className="secondary" style={{ marginBottom: 16 }} onClick={openManualExpense}>
              ✍️ Ingresar gasto manualmente
            </button>

            {insights.map((x, i) => {
              const isAlert = String(x).startsWith('ALERTA:');
              return (
                <div className={`insight-card ${isAlert ? 'alert' : ''}`} key={i}>
                  {isAlert ? '⚠️ ' : '💡 '}
                  {isAlert ? <strong>{x}</strong> : x}
                </div>
              );
            })}

            <div className="section-title">Últimos gastos</div>
            <div className="grid">
              {expenses.slice(0,8).map(e => <Expense key={e.id} e={e} del={del} />)}
            </div>
            {!expenses.length && (
              <div className="card muted" style={{ textAlign: 'center', padding: '24px 16px', color: 'rgba(255,255,255,0.4)' }}>
                Todavía no hay gastos.<br />Escaneá un QR o cargá uno manual.
              </div>
            )}
          </>
        )}

        {/* ── SCAN ── */}
        {screen === 'scan' && (
          <>
            <div className="top">
              <button className="iconbtn" onClick={() => stopCamera(true)}>←</button>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Escanear QR</span>
              <span />
            </div>

            <div className="videoBox">
              <div id="qr-reader" />
              <div className="frame" />
            </div>

            <p className="hint">
              {ocrBusy ? '🔍 Analizando monto visible...' : scanStatus}
            </p>

            <button className="secondary" onClick={() => fileRef.current.click()}>
              🖼️ Subir imagen completa del QR
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => readQRImage(e.target.files?.[0])} />
          </>
        )}

        {/* ── CONFIRM ── */}
        {screen === 'confirm' && (
          <>
            <div className="top">
              <button className="iconbtn" onClick={() => navigate('home')}>←</button>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Nuevo gasto</span>
              <span />
            </div>

            <div className="card form">
              <div className="field">
                <label className="label">Monto</label>
                <input className="input" inputMode="decimal" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" />
              </div>

              <div className="field">
                <label className="label">Lugar / comercio</label>
                <input className="input" value={form.place} onChange={e => updatePlace(e.target.value)} placeholder="Kiosco, café, súper..." />
              </div>

              <div className="field">
                <label className="label">Fecha</label>
                <input className="input" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>Categoría</div>
                <div className="chips">
                  {CATS.map(([em, n]) => (
                    <button key={n} className={`chip ${form.category.includes(n) ? 'on' : ''}`} onClick={() => setForm({ ...form, category: `${em} ${n}` })}>
                      {em}<br />{n}
                    </button>
                  ))}
                </div>
              </div>

              {form.lat && <div className="small">📍 Ubicación guardada</div>}

              <div className="paygrid">
                <button className="paybtn mp" onClick={() => saveAndOpenPayment('mp')}>
                  <b>💙 Mercado Pago</b><span>Guardar y abrir</span>
                </button>
                <button className="paybtn nx" onClick={() => saveAndOpenPayment('nx')}>
                  <b>🧡 NaranjaX</b><span>Guardar y abrir</span>
                </button>
              </div>

              <button className="primary" onClick={saveExpense}>✓ Solo guardar gasto</button>
            </div>
          </>
        )}

        {/* ── HISTORY ── */}
        {screen === 'history' && (
          <>
            <div className="top">
              <div className="brand">
                <div className="brand-icon"><KuentoLogo size={22} /></div>
                <span className="brand-name" style={{ fontSize: 20 }}>Historial</span>
              </div>
              <button className="iconbtn" onClick={() => setScreen('confirm')}>＋</button>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="form">
                <input className="input" placeholder="Buscar comercio o categoría…" value={query} onChange={e => setQuery(e.target.value)} />
                <div className="filters">
                  <div className="field">
                    <label className="label">Desde</label>
                    <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
                  </div>
                  <div className="field">
                    <label className="label">Hasta</label>
                    <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
                  </div>
                </div>
                <select className="input" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                  <option>Todas</option>
                  {CATS.map(c => <option key={c[1]}>{c[1]}</option>)}
                </select>
              </div>
            </div>

            <div className="grid">
              {filtered.map(e => <Expense key={e.id} e={e} del={del} />)}
            </div>
            {!filtered.length && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: 'rgba(255,255,255,0.3)' }}>Sin resultados</div>
            )}
          </>
        )}

        {/* ── STATS ── */}
        {screen === 'stats' && (
          <>
            <div className="top">
              <div className="brand">
                <div className="brand-icon"><KuentoLogo size={22} /></div>
                <span className="brand-name" style={{ fontSize: 20 }}>Stats</span>
              </div>
              <button className="iconbtn" onClick={exportCSV}>CSV</button>
            </div>

            <div className="hero" style={{ marginBottom: 12 }}>
              <div className="label">Total histórico</div>
              <div className="total">${fmt(expenses.reduce((s,e) => s+Number(e.amount||0), 0))}</div>
              <div className="muted">{expenses.length} gastos registrados</div>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="label" style={{ marginBottom: 12 }}>Por categoría</div>
              {catTotals.map(([c, v]) => (
                <div className="barrow" key={c}>
                  <span className="small">{c}</span>
                  <div className="bar">
                    <div style={{ width: `${catTotals[0]?.[1] ? v/catTotals[0][1]*100 : 0}%` }} />
                  </div>
                  <b style={{ fontSize: 13, color: 'var(--neon)', textAlign: 'right' }}>${fmt(v)}</b>
                </div>
              ))}
            </div>

            <div className="card form">
              <button className="secondary" onClick={exportCSV}>📥 Descargar CSV</button>
              <button className="secondary" onClick={backupJSON}>💾 Descargar backup JSON</button>
              <button className="secondary" onClick={() => restoreRef.current.click()}>♻️ Restaurar backup</button>
              <input hidden ref={restoreRef} type="file" accept="application/json" onChange={e => restoreJSON(e.target.files?.[0])} />
            </div>
          </>
        )}

        {/* ── SETTINGS ── */}
        {screen === 'settings' && (
          <>
            <div className="top">
              <button className="iconbtn" onClick={() => navigate('home')}>←</button>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Configuración</span>
              <span />
            </div>

            <div className="card form">
              <div className="field">
                <label className="label">Presupuesto mensual ($)</label>
                <input className="input" inputMode="numeric" value={settings.budget} onChange={e => setSettings({ ...settings, budget: Number(e.target.value || 0) })} />
              </div>

              <div className="field">
                <label className="label">Alerta al % del presupuesto</label>
                <input className="input" inputMode="numeric" value={settings.alertPct} onChange={e => setSettings({ ...settings, alertPct: Number(e.target.value || 0) })} />
              </div>

              <button className="primary" onClick={saveBudgetSettings}>✅ Guardar configuración</button>
            </div>
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      {screen !== 'scan' && screen !== 'confirm' && (
        <nav className="nav">
          <button onClick={() => navigate('home')}><b>🏠</b>Inicio</button>
          <button onClick={startCamera}><b>📷</b>QR</button>
          <button onClick={() => navigate('history')}><b>📋</b>Historial</button>
          <button onClick={() => navigate('stats')}><b>📊</b>Stats</button>
        </nav>
      )}
    </>
  );
}

function Expense({ e, del }) {
  const emoji = String(e.category || '❓').split(' ')[0];
  return (
    <div className="card row" onClick={() => del(e.id)} style={{ cursor: 'pointer' }}>
      <div className="expense">
        <div className="emoji">{emoji}</div>
        <div>
          <div className="exp-title">{e.place}</div>
          <div className="small">{e.date} · {e.category} · {e.method || 'Manual'}</div>
        </div>
      </div>
      <div className="exp-amount">${fmt(e.amount)}</div>
    </div>
  );
}
