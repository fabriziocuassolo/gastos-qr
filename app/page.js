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

    if (
      (Number(id) >= 26 && Number(id) <= 51) ||
      id === '62' ||
      id === '64' ||
      id === '80'
    ) {
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

  let cleaned = raw
    .replace(/[^\d.,]/g, '')
    .replace(/\s/g, '');

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
  const raw = String(text || '')
    .replace(/\s+/g, ' ')
    .replace(/[Oo]/g, '0');

  const lines = String(text || '')
    .split(/\n|\\n|\r/)
    .map(l => l.trim())
    .filter(Boolean);

  const priorityLines = lines.filter(l =>
    /(total|monto|importe|pagar|cobrar|valor|amount)/i.test(l)
  );

  const linePatterns = [
    /\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/,
  ];

  for (const line of priorityLines) {
    for (const p of linePatterns) {
      const m = line.match(p);
      if (m) {
        const amount = normalizeAmount(m[1]);
        if (amount) return amount;
      }
    }
  }

  const patterns = [
    /(?:total|monto|importe|pagar|cobrar|valor|amount)\s*[:\-]?\s*\$?\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/i,
    /\$\s*([0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?|[0-9]+(?:[.,][0-9]{1,2})?)/i
  ];

  for (const p of patterns) {
    const m = raw.match(p);
    if (m) {
      const amount = normalizeAmount(m[1]);
      if (amount) return amount;
    }
  }

  return '';
}

function inferFromText(text = '') {
  const raw = String(text || '');
  const decodedRaw = (() => {
    try { return decodeURIComponent(raw); } catch { return raw; }
  })();
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

      const candidates = [
        nested['59'],
        nested['02'],
        nested['01'],
        nested['00']
      ].filter(Boolean);

      const best = candidates.find(x => !/^com\.|^ar\.|^br\.|^https?:/i.test(x));
      if (best) {
        place = best;
        break;
      }
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
      if (m) {
        amount = normalizeAmount(m[1]);
        break;
      }
    }
  }

  if (!place) {
    try {
      const u = new URL(raw);
      place = u.hostname.replace(/^www\./, '');
    } catch {
      place = decodedRaw.slice(0, 44);
    }
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

export default function Home() {
  const [screen, setScreen] = useState('home');
  const [expenses, setExpenses] = useState([]);
  const [settings, setSettings] = useState({ budget: 0, alertPct: 80 });
  const [form, setForm] = useState({
    amount: '',
    place: '',
    date: today(),
    category: '❓ Otro',
    method: 'Manual',
    qrData: '',
    lat: null,
    lng: null
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

  useEffect(() => {
    localStorage.setItem('gq_expenses_v2', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('gq_settings_v2', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2400);
      return () => clearTimeout(t);
    }
  }, [toast]);

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

  const catTotals = useMemo(() => {
    const m = {};
    expenses.forEach(e => m[e.category] = (m[e.category] || 0) + Number(e.amount || 0));
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

  function notify(msg) {
    setToast(msg);
  }

  function navigate(s) {
    stopCamera(false);
    setScreen(s);
  }

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
    setForm({
      amount: '',
      place: '',
      date: today(),
      category: '❓ Otro',
      method: 'Manual',
      qrData: '',
      lat: null,
      lng: null
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })),
        () => {},
        { enableHighAccuracy: false, timeout: 4000 }
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

    setForm({
      amount: guess.amount || '',
      place: guess.place || '',
      date: today(),
      category: guess.category || '❓ Otro',
      method: 'Manual',
      qrData,
      lat: null,
      lng: null
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setForm(f => ({ ...f, lat: pos.coords.latitude, lng: pos.coords.longitude })),
        () => {},
        { enableHighAccuracy: false, timeout: 4000 }
      );
    }

    setScreen('confirm');

    if (!guess.amount && imageDataUrl) {
      const visibleAmount = await runOCRForVisibleAmount(imageDataUrl);
      if (visibleAmount) {
        setForm(f => ({ ...f, amount: visibleAmount }));
        notify('Monto detectado visualmente');
      } else {
        notify('No encontré monto en el QR. Cargalo manual.');
      }
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
        {
          fps: 15,
          qrbox: (vw, vh) => {
            const size = Math.floor(Math.min(vw, vh) * 0.78);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          disableFlip: false,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        },
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
      try {
        await qrRef.current.stop();
      } catch {}
      try {
        await qrRef.current.clear();
      } catch {}
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
      try {
        decodedText = await scanner.scanFile(file, true);
      } finally {
        try { await scanner.clear(); } catch {}
      }

      await stopCamera(false);
      await openConfirm(decodedText, imageDataUrl);
    } catch {
      await stopCamera(false);
      notify('No pude leer el QR. Probá con una foto más nítida y completa.');
    }
  }

  function buildExpense(methodOverride) {
    const amount = Number(String(form.amount).replace(',', '.'));

    if (!amount || amount <= 0) {
      notify('Ingresá un monto válido');
      return null;
    }

    if (!form.place.trim()) {
      notify('Ingresá el comercio/lugar');
      return null;
    }

    return {
      ...form,
      id: Date.now(),
      amount,
      place: form.place.trim(),
      method: methodOverride || form.method || 'Manual'
    };
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
    const markOpened = () => {
      if (document.hidden) opened = true;
    };

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
    const csv = [headers,...rows]
      .map(r => r.map(v => '"' + String(v ?? '').replace(/"/g,'""') + '"').join(','))
      .join('\n');

    downloadFile(`gastos-qr-${today()}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
  }

  function backupJSON() {
    downloadFile(
      `backup-gastoqr-${today()}.json`,
      JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), settings, expenses }, null, 2),
      'application/json'
    );
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
      } catch {
        notify('Backup inválido');
      }
    };
    r.readAsText(file);
  }

  return (
    <>
      <style>{`
        :root{--bg:#070707;--surface:#121212;--surface2:#1b1b1b;--ink:#f6f3ed;--muted:#a6a09a;--border:#2b2b2b;--orange:#ff6b2b;--green:#00d084;--red:#ff4d4d;--shadow:0 18px 60px rgba(0,0,0,.35)}
        *{box-sizing:border-box}
        body{margin:0;background:var(--bg);color:var(--ink);font-family:Inter,system-ui,-apple-system,Segoe UI,sans-serif}
        button,input,select{font:inherit}
        .app{min-height:100dvh;padding:calc(env(safe-area-inset-top) + 18px) 18px 96px;background:radial-gradient(circle at 80% 0%,rgba(255,107,43,.18),transparent 30%),radial-gradient(circle at 0% 20%,rgba(0,208,132,.12),transparent 28%),var(--bg)}
        .top{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
        .brand{font-size:26px;font-weight:900;letter-spacing:-.06em}
        .brand span{color:var(--orange)}
        .iconbtn,.pillbtn{border:1px solid var(--border);background:var(--surface);color:var(--ink);border-radius:16px;padding:12px 14px;box-shadow:var(--shadow)}
        .hero{background:linear-gradient(135deg,#151515,#0f0f0f);border:1px solid var(--border);border-radius:28px;padding:24px;box-shadow:var(--shadow)}
        .label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:800}
        .total{font-size:44px;font-weight:950;letter-spacing:-.08em;margin:5px 0}
        .muted{color:var(--muted);font-size:13px}
        .progress{height:9px;background:#252525;border-radius:99px;overflow:hidden;margin-top:16px}
        .progress div{height:100%;background:linear-gradient(90deg,var(--green),var(--orange));border-radius:99px}
        .scan{width:100%;margin:18px 0;border:0;border-radius:24px;background:var(--orange);color:white;padding:19px 20px;font-weight:900;font-size:18px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 18px 40px rgba(255,107,43,.28)}
        .grid{display:grid;gap:12px}
        .card{background:rgba(18,18,18,.92);border:1px solid var(--border);border-radius:22px;padding:16px;box-shadow:var(--shadow)}
        .row{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .expense{display:flex;gap:12px;align-items:center}
        .emoji{width:46px;height:46px;background:var(--surface2);border-radius:16px;display:grid;place-items:center;font-size:23px}
        .title{font-weight:850}
        .amount{font-weight:950}
        .small{font-size:12px;color:var(--muted)}
        .nav{position:fixed;left:0;right:0;bottom:0;display:flex;background:rgba(7,7,7,.86);border-top:1px solid var(--border);backdrop-filter:blur(18px);padding:8px 0 calc(env(safe-area-inset-bottom) + 8px);z-index:10}
        .nav button{flex:1;background:transparent;color:var(--muted);border:0;padding:8px 4px;font-size:11px}
        .nav b{display:block;color:var(--ink);font-size:22px}
        .form{display:grid;gap:14px}
        .field label{display:block;margin-bottom:7px}
        .input{width:100%;background:var(--surface2);color:var(--ink);border:1px solid var(--border);border-radius:16px;padding:14px;outline:none}
        .chips{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
        .chip{border:1px solid var(--border);background:var(--surface2);color:var(--muted);border-radius:16px;padding:11px 6px}
        .chip.on{border-color:var(--orange);color:var(--orange);background:rgba(255,107,43,.1)}
        .primary{background:var(--green);color:#001b10;border:0;border-radius:18px;padding:16px;font-weight:950}
        .secondary{background:var(--surface2);color:var(--ink);border:1px solid var(--border);border-radius:18px;padding:15px;font-weight:800}
        .paygrid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .paybtn{border:0;border-radius:18px;padding:15px 10px;color:white;display:grid;gap:4px;text-align:center;box-shadow:var(--shadow)}
        .paybtn b{font-size:13px}
        .paybtn span{font-size:11px;opacity:.82}
        .paybtn.mp{background:linear-gradient(135deg,#009ee3,#0069ff)}
        .paybtn.nx{background:linear-gradient(135deg,#ff6b2b,#00d084);color:#08100c}
        .danger{color:var(--red)}
        .videoBox{aspect-ratio:1;border-radius:28px;overflow:hidden;background:#000;position:relative;border:1px solid var(--border)}
        #qr-reader{width:100%;height:100%;background:#000}
        #qr-reader video{width:100%!important;height:100%!important;object-fit:cover!important}
        #qr-reader__scan_region{display:none!important}
        #qr-reader__dashboard{display:none!important}
        #qr-file-reader{display:none}
        .frame{position:absolute;inset:16%;border:3px solid var(--orange);border-radius:24px;box-shadow:0 0 0 999px rgba(0,0,0,.35);pointer-events:none}
        .filters{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .toast{position:fixed;left:50%;bottom:92px;transform:translateX(-50%);background:var(--ink);color:#111;padding:12px 18px;border-radius:99px;font-weight:800;z-index:30;white-space:nowrap}
        .barrow{display:grid;grid-template-columns:90px 1fr 75px;gap:10px;align-items:center;margin:10px 0}
        .bar{height:8px;border-radius:99px;background:#242424;overflow:hidden}
        .bar div{height:100%;background:var(--orange)}
        .field{min-width:0;width:100%}
        .field .input{width:100%;min-width:0;max-width:100%}
        .input[type="date"]{width:100%;min-width:0;max-width:100%;overflow:hidden;-webkit-appearance:none;appearance:none;text-align:left}
        .filters{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(0,1fr)!important;gap:12px!important;align-items:end}
        .filters .field{min-width:0}
        .filters .input{min-width:0;width:100%}
        .card.form{overflow:hidden}
        @media(max-width:420px){
          .filters{grid-template-columns:1fr!important}
        }

        .hint{margin-top:12px;text-align:center;line-height:1.45}
      `}</style>

      <div id="qr-file-reader" />

      <div className="app">
        {screen === 'home' && (
          <>
            <div className="top">
              <div className="brand">Gasto<span>QR</span></div>
              <button className="iconbtn" onClick={() => navigate('settings')}>⚙️</button>
            </div>

            <div className="hero">
              <div className="label">Gastos este mes</div>
              <div className="total">${fmt(monthTotal)}</div>
              <div className="muted">{thisMonth.length} registros · presupuesto {settings.budget ? `$${fmt(settings.budget)}` : 'sin definir'}</div>
              {settings.budget > 0 && <div className="progress"><div style={{ width: `${budgetPct}%` }} /></div>}
            </div>

            <button className="scan" onClick={startCamera}>
              <span>📷 Escanear QR</span><span>→</span>
            </button>

            <button className="secondary" style={{ width: '100%', marginTop: -6, marginBottom: 16 }} onClick={openManualExpense}>
              ✍️ Ingresar gasto manualmente
            </button>

            {insights.map((x,i) => <div className="card" key={i} style={{ marginBottom: 10 }}>💡 {x}</div>)}

            <div className="label" style={{ margin: '20px 0 10px' }}>Últimos gastos</div>
            <div className="grid">{expenses.slice(0,8).map(e => <Expense key={e.id} e={e} del={del} />)}</div>
            {!expenses.length && <div className="card muted">Todavía no hay gastos. Escaneá o cargá uno manual.</div>}
          </>
        )}

        {screen === 'scan' && (
          <>
            <div className="top">
              <button className="iconbtn" onClick={() => stopCamera(true)}>←</button>
              <div className="title">Escanear QR</div>
              <span />
            </div>

            <div className="videoBox">
              <div id="qr-reader" />
              <div className="frame" />
            </div>

            <p className="muted hint">
              {ocrBusy ? 'Analizando monto visible...' : scanStatus}
              <br />
              Para leer el monto por OCR, apuntá un poco más lejos para incluir el total y el QR.
            </p>

            <button className="secondary" style={{ width: '100%' }} onClick={() => fileRef.current.click()}>
              🖼️ Subir imagen completa del QR
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => readQRImage(e.target.files?.[0])} />
          </>
        )}

        {screen === 'confirm' && (
          <>
            <div className="top">
              <button className="iconbtn" onClick={() => navigate('home')}>←</button>
              <div className="title">Nuevo gasto</div>
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
                  {CATS.map(([em,n]) => (
                    <button key={n} className={`chip ${form.category.includes(n) ? 'on' : ''}`} onClick={() => setForm({ ...form, category: `${em} ${n}` })}>
                      {em}<br />{n}
                    </button>
                  ))}
                </div>
              </div>

              {form.lat && <div className="small">📍 Ubicación guardada aproximada</div>}

              <div className="paygrid">
                <button className="paybtn mp" onClick={() => saveAndOpenPayment('mp')}>
                  <b>💙 Mercado Pago</b><span>Guardar y abrir</span>
                </button>
                <button className="paybtn nx" onClick={() => saveAndOpenPayment('nx')}>
                  <b>🧡 NaranjaX</b><span>Guardar y abrir</span>
                </button>
              </div>

              <button className="primary" onClick={saveExpense}>Solo guardar gasto</button>
            </div>
          </>
        )}

        {screen === 'history' && (
          <>
            <div className="top">
              <div className="brand">Historial</div>
              <button className="iconbtn" onClick={() => setScreen('confirm')}>＋</button>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="form">
                <input className="input" placeholder="Buscar comercio/categoría" value={query} onChange={e => setQuery(e.target.value)} />
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

            <div className="grid">{filtered.map(e => <Expense key={e.id} e={e} del={del} />)}</div>
          </>
        )}

        {screen === 'stats' && (
          <>
            <div className="top">
              <div className="brand">Stats</div>
              <button className="iconbtn" onClick={exportCSV}>CSV</button>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="label">Total histórico</div>
              <div className="total">${fmt(expenses.reduce((s,e)=>s+Number(e.amount||0),0))}</div>
              <div className="muted">{expenses.length} gastos registrados</div>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="label">Por categoría</div>
              {catTotals.map(([c,v]) => (
                <div className="barrow" key={c}>
                  <span className="small">{c}</span>
                  <div className="bar"><div style={{ width: `${catTotals[0]?.[1] ? v/catTotals[0][1]*100 : 0}%` }} /></div>
                  <b>${fmt(v)}</b>
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

        {screen === 'settings' && (
          <>
            <div className="top">
              <button className="iconbtn" onClick={() => navigate('home')}>←</button>
              <div className="title">Configuración</div>
              <span />
            </div>

            <div className="card form">
              <div className="field">
                <label className="label">Presupuesto mensual</label>
                <input className="input" inputMode="numeric" value={settings.budget} onChange={e => setSettings({ ...settings, budget: Number(e.target.value || 0) })} />
              </div>

              <div className="field">
                <label className="label">Alerta al porcentaje</label>
                <input className="input" inputMode="numeric" value={settings.alertPct} onChange={e => setSettings({ ...settings, alertPct: Number(e.target.value || 0) })} />
              </div>

              <button className="secondary" onClick={backupJSON}>Descargar backup</button>
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
    <div className="card row" onClick={() => del(e.id)}>
      <div className="expense">
        <div className="emoji">{emoji}</div>
        <div>
          <div className="title">{e.place}</div>
          <div className="small">{e.date} · {e.category} · {e.method || 'Sin método'}</div>
        </div>
      </div>
      <div className="amount">${fmt(e.amount)}</div>
    </div>
  );
}
