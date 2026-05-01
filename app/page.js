'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../lib/useAuth';
import { useExpenses } from '../lib/useExpenses';
import { LoginScreen } from '../lib/LoginScreen';
import {
  Utensils,
  Car,
  ShoppingCart,
  HeartPulse,
  Clapperboard,
  Lightbulb,
  Home as HomeIcon,
  Dumbbell,
  CircleHelp,
  House,
  ScanLine,
  ClipboardList,
  BarChart3,
  UserRound,
  MapPin,
  Check,
  CreditCard,
  WalletCards,
  AlertTriangle,
  ArrowRight,
  LockKeyhole,
  Download,
  RotateCcw,
  LogOut
} from 'lucide-react';

const CATS = ['Comida', 'Transporte', 'Compras', 'Salud', 'Ocio', 'Servicios', 'Hogar', 'Gym', 'Otro'];

const CATEGORY_ICONS = {
  Comida: Utensils,
  Transporte: Car,
  Compras: ShoppingCart,
  Salud: HeartPulse,
  Ocio: Clapperboard,
  Servicios: Lightbulb,
  Hogar: HomeIcon,
  Gym: Dumbbell,
  Otro: CircleHelp
};

function categoryName(value = '') {
  const clean = String(value || '')
    .replace(/[🍔🚗🛒🏥🎬💡🏠💪❓]/gu, '')
    .trim();

  const hit = CATS.find(c => c.toLowerCase() === clean.toLowerCase());
  return hit || 'Otro';
}

function CategoryIcon({ name, size = 22 }) {
  const Icon = CATEGORY_ICONS[categoryName(name)] || CircleHelp;
  return <Icon size={size} strokeWidth={2.4} />;
}

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

function addMonthsToDate(dateStr, monthsToAdd = 0) {
  const [y, m, d] = String(dateStr || today()).split('-').map(Number);
  const baseYear = Number.isFinite(y) ? y : new Date().getFullYear();
  const baseMonth = Number.isFinite(m) ? m - 1 : new Date().getMonth();
  const baseDay = Number.isFinite(d) ? d : new Date().getDate();

  const target = new Date(baseYear, baseMonth + monthsToAdd, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(baseDay, lastDay));

  return target.toISOString().slice(0, 10);
}


function toDateInputValue(date) {
  return date.toISOString().slice(0, 10);
}

function startOfLocalDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0);
}

function monthLabel(year, monthIndex) {
  const d = new Date(year, monthIndex, 1);
  return d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

function getPeriodOptions() {
  const now = new Date();
  const current = startOfLocalDay(now);

  const day = current.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(current);
  weekStart.setDate(current.getDate() + mondayOffset);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const monthStart = new Date(current.getFullYear(), current.getMonth(), 1);
  const monthEnd = endOfMonth(current.getFullYear(), current.getMonth());

  const last30Start = new Date(current);
  last30Start.setDate(current.getDate() - 29);

  const options = [
    {
      value: 'week',
      label: 'Esta semana',
      from: toDateInputValue(weekStart),
      to: toDateInputValue(weekEnd)
    },
    {
      value: 'month',
      label: 'Este mes',
      from: toDateInputValue(monthStart),
      to: toDateInputValue(monthEnd)
    },
    {
      value: 'last30',
      label: 'Últimos 30 días',
      from: toDateInputValue(last30Start),
      to: toDateInputValue(current)
    }
  ];

  for (let i = 0; i < 12; i++) {
    const d = new Date(current.getFullYear(), current.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    options.push({
      value: `${y}-${String(m + 1).padStart(2, '0')}`,
      label: monthLabel(y, m),
      from: toDateInputValue(new Date(y, m, 1)),
      to: toDateInputValue(endOfMonth(y, m))
    });
  }

  return options;
}

function getYearsFromExpenses(expenses = []) {
  const currentYear = new Date().getFullYear();
  const years = new Set([currentYear, currentYear - 1]);
  expenses.forEach(e => {
    const y = Number(String(e.date || '').slice(0, 4));
    if (Number.isFinite(y) && y > 2000) years.add(y);
  });
  return Array.from(years).sort((a, b) => b - a);
}


function catLabel(name) {
  const clean = String(name || '')
    .replace(/[🍔🚗🛒🏥🎬💡🏠💪❓]/gu, '')
    .trim()
    .toLowerCase();

  const hit = CATS.find(c => c.toLowerCase() === clean);
  return hit || 'Otro';
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
  const original = String(text || '');

  // OCR suele confundir 0 con O/o/Q/D. Normalizamos antes de buscar montos.
  const normalizedText = original
    .replace(/[OoQ]/g, '0')
    .replace(/(?<=\d)[D](?=\d|\b)/g, '0')
    .replace(/[Il|]/g, '1')
    .replace(/\s+/g, ' ')
    .trim();

  const lines = original
    .split(/\n|\\n|\r/)
    .map(line => line
      .replace(/[OoQ]/g, '0')
      .replace(/(?<=\d)[D](?=\d|\b)/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/\s+/g, ' ')
      .trim()
    )
    .filter(Boolean);

  function cleanupAmountCandidate(value) {
    return String(value || '')
      .replace(/[OoQ]/g, '0')
      .replace(/D/g, '0')
      .replace(/[Il|]/g, '1')
      .replace(/[^\d.,]/g, '');
  }

  function isReliableAmount(value) {
    const cleaned = cleanupAmountCandidate(value);
    const amount = normalizeAmount(cleaned);
    if (!amount) return '';

    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return '';

    return amount;
  }

  function pickFromContext(source) {
    // Permite OCR imperfecto:
    // "$ 256O" => 2560
    // "Total 25O.OO" => 250.00
    // "Importe 2.56O" => 2560 si el separador corresponde
    // FIX OCR 2560: prioriza números de 4+ dígitos antes que tokens de 1-3 dígitos
    const amountToken = '([0-9OoQDIl|]{4,}(?:[.,][0-9OoQDIl|]{1,2})?|[0-9OoQDIl|]{1,3}(?:[.,][0-9OoQDIl|]{3})+(?:[.,][0-9OoQDIl|]{1,2})?|[0-9OoQDIl|]{1,3}(?:[.,][0-9OoQDIl|]{1,2})?)';

    const patterns = [
      new RegExp('(?:total|monto|importe|pagar|cobrar|valor|amount)\\s*[:\\-]?\\s*\\$?\\s*' + amountToken, 'i'),
      new RegExp('\\$\\s*' + amountToken, 'i')
    ];

    for (const pattern of patterns) {
      const match = String(source || '').match(pattern);
      if (match) {
        const amount = isReliableAmount(match[1]);
        if (amount) return amount;
      }
    }

    return '';
  }

  // 1) Primero buscamos líneas confiables: "Total $ 2560", "$ 256O", "Monto 2.560", etc.
  for (const line of lines) {
    if (/(total|monto|importe|pagar|cobrar|valor|amount|\$)/i.test(line)) {
      const amount = pickFromContext(line);
      if (amount) return amount;
    }
  }

  // 2) Después buscamos en todo el texto, pero siempre con contexto.
  const globalAmount = pickFromContext(normalizedText);
  if (globalAmount) return globalAmount;

  // 3) Si el OCR leyó solo números sueltos dentro del QR, no los usamos.
  // Mejor dejar el campo vacío antes que cargar un monto falso.
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

// Kuento Logo image component
function KuentoLogo({ size = 32 }) {
  return (
    <img
      src="/kuento-logo.png"
      alt="Kuento"
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(8, Math.round(size * 0.22)),
        objectFit: 'cover',
        display: 'block'
      }}
    />
  );
}

export default function Home() {
  const auth = useAuth();
  const {
    expenses,
    settings,
    ready,
    addExpense,
    removeExpense,
    saveSettings,
    setSettings
  } = useExpenses(auth.user?.uid);

  const [screen, setScreen] = useState('home');
  const [form, setForm] = useState({
    amount: '', place: '', date: today(), category: 'Otro',
    method: 'Manual', qrData: '', lat: null, lng: null,
    isCard: false, installments: '1', hasInterest: false, interestPct: ''
  });
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('Todas');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [scanStatus, setScanStatus] = useState('Apuntá al QR incluyendo el monto visible de arriba si aparece.');
  const [ocrBusy, setOcrBusy] = useState(false);

  const qrRef = useRef(null);
  const scanningRef = useRef(false);
  const processingRef = useRef(false);
  const fileRef = useRef(null);
  const restoreRef = useRef(null);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2400);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => () => stopCamera(false), []);

  const thisMonth = useMemo(() => expenses.filter(e => monthKey(e.date) === monthKey()), [expenses]);
  const monthTotal = useMemo(() => thisMonth.reduce((s,e) => s + Number(e.amount||0), 0), [thisMonth]);
  const budgetPctRaw = settings.budget ? Math.round(monthTotal / settings.budget * 100) : 0;
  const budgetPct = settings.budget ? Math.min(100, budgetPctRaw) : 0;
  const isBudgetExceeded = Boolean(settings.budget && monthTotal > settings.budget);
  const budgetExceededAmount = isBudgetExceeded ? monthTotal - settings.budget : 0;

  const periodOptions = useMemo(() => getPeriodOptions(), []);
  const periodRange = useMemo(
    () => periodOptions.find(p => p.value === periodFilter) || periodOptions[1],
    [periodOptions, periodFilter]
  );
  const availableYears = useMemo(() => getYearsFromExpenses(expenses), [expenses]);

  const filtered = useMemo(() => expenses.filter(e => {
    const q = query.toLowerCase().trim();
    const okQ = !q || [e.place,e.category,e.method].join(' ').toLowerCase().includes(q);
    const okC = catFilter === 'Todas' || categoryName(e.category) === catFilter;
    const okF = !periodRange?.from || e.date >= periodRange.from;
    const okT = !periodRange?.to || e.date <= periodRange.to;
    return okQ && okC && okF && okT;
  }), [expenses, query, catFilter, periodRange]);

  const catTotals = useMemo(() => {
    const m = {};
    expenses.forEach(e => m[e.category] = (m[e.category] || 0) + Number(e.amount || 0));
    return Object.entries(m).sort((a,b) => b[1]-a[1]);
  }, [expenses]);

  const insights = useMemo(() => {
    const arr = [];
    if (isBudgetExceeded) {
      arr.push(`ALERTA: estás excedido por $${fmt(budgetExceededAmount)} de tu presupuesto mensual.`);
    } else if (settings.budget && monthTotal >= settings.budget * (settings.alertPct/100)) {
      arr.push(`ALERTA: ya usaste ${budgetPct}% de tu presupuesto mensual.`);
    }
    if (catTotals[0]) arr.push(`Tu categoría más fuerte es ${categoryName(catTotals[0][0])} con $${fmt(catTotals[0][1])}.`);
    const todayTotal = expenses.filter(e => e.date===today()).reduce((s,e) => s+Number(e.amount||0), 0);
    if (todayTotal) arr.push(`Hoy llevás gastado $${fmt(todayTotal)}.`);
    return arr.length ? arr : ['Todavía no hay suficientes datos para insights.'];
  }, [expenses, settings, monthTotal, budgetPct, catTotals, isBudgetExceeded, budgetExceededAmount]);

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
    setForm({ amount: '', place: '', date: today(), category: 'Otro', method: 'Manual', qrData: '', lat: null, lng: null, isCard: false, installments: '1', hasInterest: false, interestPct: '' });
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
    setForm({ amount: guess.amount || '', place: guess.place || '', date: today(), category: guess.category || 'Otro', method: 'Manual', qrData, lat: null, lng: null, isCard: false, installments: '1', hasInterest: false, interestPct: '' });
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

  function buildExpenseItems(methodOverride) {
    const amount = Number(String(form.amount).replace(',', '.'));
    if (!amount || amount <= 0) { notify('Ingresá un monto válido'); return null; }
    if (!form.place.trim()) { notify('Ingresá el comercio/lugar'); return null; }

    const isCard = Boolean(form.isCard);
    const installments = isCard
      ? Math.max(1, Math.min(60, Number.parseInt(form.installments || '1', 10) || 1))
      : 1;
    const interestPct = isCard && form.hasInterest
      ? Math.max(0, Number(String(form.interestPct || '0').replace(',', '.')) || 0)
      : 0;

    const totalWithInterest = amount * (1 + interestPct / 100);
    const installmentAmount = Number((totalWithInterest / installments).toFixed(2));
    const basePlace = form.place.trim();
    const now = Date.now();

    return Array.from({ length: installments }, (_, index) => ({
      ...form,
      id: now + index,
      amount: installmentAmount,
      place: installments > 1 ? `${basePlace} (cuota ${index + 1}/${installments})` : basePlace,
      originalPlace: basePlace,
      date: addMonthsToDate(form.date, index),
      method: methodOverride || form.method || 'Manual',
      isCard,
      installments,
      installmentNumber: index + 1,
      totalAmount: Number(totalWithInterest.toFixed(2)),
      amountWithoutInterest: amount,
      interestPct
    }));
  }

  async function saveExpense() {
    const items = buildExpenseItems('Manual');
    if (!items) return;
    await Promise.all(items.map(item => addExpense(item)));
    notify(items.length > 1 ? `Gasto guardado en ${items.length} cuotas` : 'Gasto guardado');
    setScreen('home');
  }

  function openPaymentApp(app) {
    const cfg = app === 'nx'
      ? { name: 'NaranjaX', scheme: 'naranjax:///', fallback: 'https://app.naranjax.com/' }
      : { name: 'Mercado Pago', scheme: 'mercadopago://', fallback: 'https://www.mercadopago.com.ar/' };

    notify('Abriendo ' + cfg.name + '…');

    let opened = false;
    const markOpened = () => { if (document.hidden) opened = true; };
    document.addEventListener('visibilitychange', markOpened);

    // Importante: en iOS/PWA el deep link tiene que dispararse lo más cerca posible del click.
    window.location.href = cfg.scheme;

    setTimeout(() => {
      document.removeEventListener('visibilitychange', markOpened);
      if (!opened) window.location.href = cfg.fallback;
    }, 1500);
  }

  function saveAndOpenPayment(app) {
    const method = app === 'nx' ? 'NaranjaX' : 'Mercado Pago';
    const items = buildExpenseItems(method);
    if (!items) return;

    // No usamos await antes de abrir la app: iOS puede bloquear el deep link si se pierde el gesto del usuario.
    Promise.all(items.map(item => addExpense(item))).catch(() => notify('No se pudo guardar el gasto'));
    openPaymentApp(app);
    setTimeout(() => setScreen('home'), 500);
  }

  async function del(id) {
    if (confirm('¿Eliminar este gasto?')) await removeExpense(id);
  }

  function exportCSV() {
    return downloadBackupGastos();
  }

  function toCsvValue(value) {
    return '"' + String(value ?? '').replace(/"/g, '""') + '"';
  }

  function csvLine(values) {
    return values.map(toCsvValue).join(',');
  }

  function parseCSV(text = '') {
    const rows = [];
    let row = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i++;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === ',' && !inQuotes) {
        row.push(current);
        current = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && next === '\n') i++;
        row.push(current);
        rows.push(row);
        row = [];
        current = '';
        continue;
      }

      current += char;
    }

    row.push(current);
    rows.push(row);
    return rows.filter(r => r.some(v => String(v || '').trim()));
  }

  function buildGastosCSV(list = expenses, meta = {}) {
    const headers = ['Fecha', 'Lugar', 'Categoria', 'Monto', 'Metodo', 'Tarjeta', 'Cuota', 'Cuotas', 'Total', 'InteresPct', 'Lat', 'Lng', 'Id'];
    const rows = list.map(e => [
      e.date || '',
      e.place || '',
      categoryName(e.category || 'Otro'),
      e.amount || '',
      e.method || 'Manual',
      e.isCard ? 'Sí' : 'No',
      e.installmentNumber || '',
      e.installments || '',
      e.totalAmount || '',
      e.interestPct || '',
      e.lat || '',
      e.lng || '',
      e.id || ''
    ]);

    return [
      csvLine(['Kuento Backup Gastos']),
      csvLine(['Version', '3']),
      csvLine(['Exportado', new Date().toISOString()]),
      csvLine(['Rango', meta.label || 'Todos los gastos']),
      csvLine(['Total gastos', list.length]),
      '',
      csvLine(headers),
      ...rows.map(csvLine)
    ].join('\n');
  }

  function downloadBackupGastos() {
    if (!expenses.length) return notify('No hay gastos para descargar');
    const csv = buildGastosCSV(expenses, { label: 'Todos los gastos' });
    downloadFile(`kuento-backup-gastos-${today()}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
  }

  function downloadYearData(yearValue = selectedYear) {
    const year = String(yearValue || selectedYear);
    const list = expenses.filter(e => String(e.date || '').startsWith(year));
    if (!list.length) return notify(`No hay gastos cargados para ${year}`);

    const csv = buildGastosCSV(list, { label: `Gastos ${year}` });
    downloadFile(`kuento-gastos-${year}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
    notify(`Gastos ${year} descargados`);
  }

  function backupJSON() {
    return downloadBackupGastos();
  }

  async function saveBudgetSettings() {
    await saveSettings(settings);
    notify('✅ Presupuesto fijado correctamente');
  }

  async function restoreBackupGastos(file) {
    if (!file) return;

    const r = new FileReader();
    r.onload = async () => {
      try {
        const text = String(r.result || '').replace(/^\uFEFF/, '').trim();

        // Compatibilidad con backups viejos JSON.
        if (text.startsWith('{')) {
          const data = JSON.parse(text);
          if (!Array.isArray(data.expenses)) throw Error();
          for (const expense of data.expenses) await addExpense(expense);
          notify('Backup de gastos restaurado');
          return;
        }

        const rows = parseCSV(text);
        const headerIndex = rows.findIndex(row =>
          row.map(x => String(x || '').trim().toLowerCase()).includes('fecha') &&
          row.map(x => String(x || '').trim().toLowerCase()).includes('lugar')
        );

        if (headerIndex === -1) throw Error();

        const headers = rows[headerIndex].map(h => String(h || '').trim().toLowerCase());
        const idx = name => headers.indexOf(name);

        const iFecha = idx('fecha');
        const iLugar = idx('lugar');
        const iCategoria = idx('categoria');
        const iMonto = idx('monto');
        const iMetodo = idx('metodo');
        const iTarjeta = idx('tarjeta');
        const iCuota = idx('cuota');
        const iCuotas = idx('cuotas');
        const iTotal = idx('total');
        const iInteres = idx('interespct');
        const iLat = idx('lat');
        const iLng = idx('lng');

        let restored = 0;

        for (const row of rows.slice(headerIndex + 1)) {
          const amount = normalizeAmount(row[iMonto]);
          const place = String(row[iLugar] || '').trim();
          if (!amount || !place) continue;

          await addExpense({
            id: Date.now() + restored,
            date: String(row[iFecha] || today()).trim() || today(),
            place,
            category: catLabel(row[iCategoria] || 'Otro'),
            amount,
            method: String(row[iMetodo] || 'Manual').trim() || 'Manual',
            isCard: iTarjeta >= 0 ? String(row[iTarjeta] || '').toLowerCase().startsWith('s') : false,
            installmentNumber: iCuota >= 0 ? Number(row[iCuota] || 0) || '' : '',
            installments: iCuotas >= 0 ? Number(row[iCuotas] || 0) || '' : '',
            totalAmount: iTotal >= 0 ? Number(row[iTotal] || 0) || '' : '',
            interestPct: iInteres >= 0 ? Number(row[iInteres] || 0) || 0 : 0,
            lat: iLat >= 0 ? row[iLat] || '' : '',
            lng: iLng >= 0 ? row[iLng] || '' : ''
          });

          restored++;
        }

        if (!restored) throw Error();

        notify(`${restored} gastos restaurados`);
      } catch {
        notify('Backup inválido');
      }
    };

    r.readAsText(file);
  }

  function restoreJSON(file) {
    return restoreBackupGastos(file);
  }


  if (auth.user === undefined) {
    return (
      <div style={{ minHeight: '100dvh', background: '#1A2F3C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 44, height: 44, border: '3px solid rgba(51,255,204,.22)', borderTopColor: '#33FFCC', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const needsEmailVerification =
    auth.user &&
    auth.user.providerData?.some(provider => provider.providerId === 'password') &&
    !auth.user.emailVerified;

  if (needsEmailVerification) {
    return (
      <>
      <style>{`.toast{position:fixed;left:50%;bottom:40px;transform:translateX(-50%);background:#33FFCC;color:#0a1e27;padding:11px 18px;border-radius:999px;font-weight:800;z-index:40;white-space:nowrap}`}</style>
      <div style={{
        minHeight: '100dvh',
        background: 'radial-gradient(ellipse at 70% 0%, rgba(51,255,204,.14) 0%, transparent 50%), #1A2F3C',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'DM Sans, system-ui, sans-serif'
      }}>
        <div style={{
          width: '100%',
          maxWidth: 390,
          background: 'rgba(31,54,71,.86)',
          border: '1px solid rgba(51,235,195,.18)',
          borderRadius: 24,
          padding: 22,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 42, marginBottom: 10 }}>📩</div>
          <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>Verificá tu correo</h1>
          <p style={{ color: 'rgba(255,255,255,.6)', lineHeight: 1.45, marginBottom: 18 }}>
            Te enviamos un email a <b>{auth.user.email}</b>. Abrilo y confirmá tu cuenta para empezar a usar Kuento.
          </p>
          <button style={{ width: "100%", border: 0, borderRadius: 16, padding: 15, fontWeight: 900, background: "linear-gradient(135deg,#33EBC3,#33FFCC)", color: "#0a1e27", marginBottom: 10 }} onClick={async () => {
            await auth.refreshUser();
            if (auth.user.emailVerified) notify('✅ Email verificado');
            else notify('Todavía no aparece verificado');
          }}>
            Ya verifiqué mi correo
          </button>
          <button style={{ width: "100%", border: "1px solid rgba(51,235,195,.2)", borderRadius: 16, padding: 15, fontWeight: 800, background: "#1f3647", color: "#fff", marginBottom: 10 }} onClick={async () => {
            const ok = await auth.resendVerification();
            if (ok) notify('📩 Email reenviado. Revisá spam o correo no deseado');
          }}>
            Reenviar correo de verificación
          </button>
          <button style={{ width: "100%", border: "1px solid rgba(51,235,195,.2)", borderRadius: 16, padding: 15, fontWeight: 800, background: "#1f3647", color: "#fff" }} onClick={auth.logout}>Usar otra cuenta</button>
        </div>
        {toast && <div className="toast">{toast}</div>}
      </div>
      </>
    );
  }

  if (!auth.user) {
    return <LoginScreen {...auth} />;
  }

  if (!ready) {
    return (
      <div style={{ minHeight: '100dvh', background: '#1A2F3C', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#33FFCC', fontFamily: 'system-ui' }}>
        Cargando Kuento...
      </div>
    );
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

        button { font: inherit; }

        input,
        select,
        textarea {
          font-size: 16px !important;
          font-family: inherit;
        }

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

        .hero.budget-exceeded {
          background: linear-gradient(145deg, rgba(255,87,87,0.20), rgba(255,87,87,0.08));
          border-color: rgba(255,87,87,0.55);
          box-shadow: 0 0 0 1px rgba(255,87,87,0.12), 0 18px 46px rgba(255,87,87,0.16);
        }
        .hero.budget-exceeded::before {
          background: radial-gradient(circle, rgba(255,87,87,0.22), transparent 70%);
        }
        .hero.budget-exceeded .total {
          color: #ff7070;
          text-shadow: 0 0 18px rgba(255,87,87,0.25);
        }
        .budget-over-text {
          margin-top: 10px;
          padding: 10px 12px;
          border-radius: 14px;
          background: rgba(255,87,87,0.12);
          border: 1px solid rgba(255,87,87,0.35);
          color: #ff8585;
          font-weight: 800;
          font-size: 13px;
        }
        .budget-exceeded-list {
          background: rgba(255,87,87,0.08);
          border-color: rgba(255,87,87,0.35);
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
          flex-shrink: 0;
          border: 1px solid var(--border2);
          color: var(--neon);
        }
        .emoji svg { display: block; }

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
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .insight-card svg { flex-shrink: 0; color: var(--neon); }
        .insight-card.alert {
          background: rgba(255,87,87,0.08);
          border-color: rgba(255,87,87,0.3);
          color: var(--ink);
        }
        .insight-card.alert strong { color: #ff7070; }
        .insight-card.alert svg { color: #ff7070; }

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
        .nav b { display: flex; justify-content: center; margin-bottom: 2px; }
        .nav svg { display: block; }

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
          padding: 12px 6px;
          font-size: 13px;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
          display: grid;
          place-items: center;
          gap: 6px;
          min-height: 82px;
        }
        .chip svg {
          color: rgba(51,255,204,0.72);
          filter: drop-shadow(0 0 6px rgba(51,255,204,0.12));
        }
        .chip.on {
          border-color: var(--accent);
          color: var(--neon);
          background: rgba(51,235,195,0.1);
        }
        .chip.on svg { color: var(--neon); }

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
        .paybtn b { font-size: 13px; font-weight: 800; display:flex; align-items:center; justify-content:center; gap:6px; }
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
        input,
        select,
        textarea {
          font-size: 16px !important;
        }
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

            <div className={`hero ${isBudgetExceeded ? "budget-exceeded" : ""}`}>
              <div className="label">Gastos este mes</div>
              <div className="total">${fmt(monthTotal)}</div>
              <div className="muted">{thisMonth.length} registros · {settings.budget ? `$${fmt(settings.budget)} presupuesto` : 'sin presupuesto'}</div>
              {isBudgetExceeded && (
                <div className="budget-over-text">⚠️ Estás excedido por ${fmt(budgetExceededAmount)} de tu presupuesto</div>
              )}
              {settings.budget > 0 && (
                <div className="progress">
                  <div style={{ width: `${budgetPct}%` }} />
                </div>
              )}
            </div>

            <button className="scan" onClick={startCamera}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><ScanLine size={22} /> Escanear QR</span>
              <ArrowRight size={22} />
            </button>

            <button className="secondary" style={{ marginBottom: 16 }} onClick={openManualExpense}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ClipboardList size={18} /> Ingresar gasto manualmente</span>
            </button>

            {insights.map((x, i) => {
              const isAlert = String(x).startsWith('ALERTA:');
              return (
                <div className={`insight-card ${isAlert ? 'alert' : ''}`} key={i}>
                  {isAlert ? <AlertTriangle size={18} /> : <Lightbulb size={18} />}
                  {isAlert ? <strong>{x}</strong> : <span>{x}</span>}
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

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {auth.user.photoURL ? (
                <img src={auth.user.photoURL} alt="" referrerPolicy="no-referrer" style={{ width: 48, height: 48, borderRadius: '50%' }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--surface2)', display: 'grid', placeItems: 'center' }}>👤</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>{auth.user.displayName || 'Usuario'}</div>
                <div className="small">{auth.user.email}</div>
              </div>
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

              <div className="card" style={{ boxShadow: 'none', background: 'rgba(255,255,255,0.025)', padding: 14 }}>
                <div className="label" style={{ marginBottom: 10 }}>Pago con tarjeta</div>

                <div className="filters">
                  <div className="field">
                    <label className="label">¿Es un gasto con tarjeta?</label>
                    <select
                      className="input"
                      value={form.isCard ? 'si' : 'no'}
                      onChange={e => setForm({
                        ...form,
                        isCard: e.target.value === 'si',
                        installments: e.target.value === 'si' ? (form.installments ?? '1') : '1',
                        hasInterest: e.target.value === 'si' ? form.hasInterest : false,
                        interestPct: e.target.value === 'si' ? form.interestPct : ''
                      })}
                    >
                      <option value="no">No</option>
                      <option value="si">Sí</option>
                    </select>
                  </div>

                  {form.isCard && (
                    <div className="field">
                      <label className="label">Cantidad de cuotas</label>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max="60"
                        inputMode="numeric"
                        value={form.installments}
                        onChange={e => setForm({ ...form, installments: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {form.isCard && (
                  <>
                    <div className="filters">
                      <div className="field">
                        <label className="label">¿Tiene interés?</label>
                        <select
                          className="input"
                          value={form.hasInterest ? 'si' : 'no'}
                          onChange={e => setForm({
                            ...form,
                            hasInterest: e.target.value === 'si',
                            interestPct: e.target.value === 'si' ? form.interestPct : ''
                          })}
                        >
                          <option value="no">No</option>
                          <option value="si">Sí</option>
                        </select>
                      </div>

                      {form.hasInterest && (
                        <div className="field">
                          <label className="label">% de interés total</label>
                          <input
                            className="input"
                            inputMode="decimal"
                            placeholder="Ej: 20"
                            value={form.interestPct}
                            onChange={e => setForm({ ...form, interestPct: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    <div className="small">
                      {(() => {
                        const base = Number(String(form.amount || '0').replace(',', '.')) || 0;
                        const cuotas = Math.max(1, Number.parseInt(form.installments || '1', 10) || 1);
                        const interes = form.hasInterest ? (Number(String(form.interestPct || '0').replace(',', '.')) || 0) : 0;
                        const total = base * (1 + interes / 100);
                        const cuota = cuotas ? total / cuotas : total;
                        return `Se guardará como ${cuotas} cuota${cuotas > 1 ? 's' : ''} de $${fmt(cuota)}. Total: $${fmt(total)}.`;
                      })()}
                    </div>
                  </>
                )}
              </div>

              <div>
                <div className="label" style={{ marginBottom: 8 }}>Categoría</div>
                <div className="chips">
                  {CATS.map((n) => (
                    <button key={n} className={`chip ${categoryName(form.category) === n ? 'on' : ''}`} onClick={() => setForm({ ...form, category: n })}>
                      <CategoryIcon name={n} size={24} />
                      <span>{n}</span>
                    </button>
                  ))}
                </div>
              </div>

              {form.lat && <div className="small" style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPin size={14} /> Ubicación guardada</div>}

              <div className="paygrid">
                <button className="paybtn mp" onClick={() => saveAndOpenPayment('mp')}>
                  <b><CreditCard size={18} /> Mercado Pago</b><span>Guardar y abrir</span>
                </button>
                <button className="paybtn nx" onClick={() => saveAndOpenPayment('nx')}>
                  <b><WalletCards size={18} /> NaranjaX</b><span>Guardar y abrir</span>
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
                    <label className="label">Período</label>
                    <select className="input" value={periodFilter} onChange={e => setPeriodFilter(e.target.value)}>
                      {periodOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label className="label">Categoría</label>
                    <select className="input" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
                      <option>Todas</option>
                      {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="small">
                  Mostrando desde {periodRange?.from} hasta {periodRange?.to}
                </div>
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
              <button className="iconbtn" onClick={downloadBackupGastos}>CSV</button>
            </div>

            <div className="hero" style={{ marginBottom: 12 }}>
              <div className="label">Total histórico</div>
              <div className="total">${fmt(expenses.reduce((s,e) => s+Number(e.amount||0), 0))}</div>
              <div className="muted">{expenses.length} gastos registrados</div>
            </div>

            {isBudgetExceeded && (
              <div className="card budget-exceeded-list" style={{ marginBottom: 12 }}>
                <div className="label" style={{ color: '#ff8585' }}>Presupuesto excedido</div>
                <div style={{ fontWeight: 900, fontSize: 18, marginTop: 6 }}>⚠️ Te excediste por ${fmt(budgetExceededAmount)}</div>
                <div className="small" style={{ marginTop: 6 }}>
                  Presupuesto: ${fmt(settings.budget)} · Gastado este mes: ${fmt(monthTotal)}
                </div>
                {catTotals[0] && (
                  <div className="small" style={{ marginTop: 8 }}>
                    Mayor gasto acumulado: {categoryName(catTotals[0][0])} con ${fmt(catTotals[0][1])}
                  </div>
                )}
              </div>
            )}

            <div className="card" style={{ marginBottom: 12 }}>
              <div className="label" style={{ marginBottom: 12 }}>Por categoría</div>
              {catTotals.map(([c, v]) => (
                <div className="barrow" key={c}>
                  <span className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CategoryIcon name={c} size={14} /> {categoryName(c)}</span>
                  <div className="bar">
                    <div style={{ width: `${catTotals[0]?.[1] ? v/catTotals[0][1]*100 : 0}%` }} />
                  </div>
                  <b style={{ fontSize: 13, color: 'var(--neon)', textAlign: 'right' }}>${fmt(v)}</b>
                </div>
              ))}
            </div>

            <div className="card form">
              <button className="secondary" onClick={downloadBackupGastos}>Descargar backup gastos</button>
              <button className="secondary" onClick={() => restoreRef.current.click()}>Restaurar backup gastos</button>
              <input hidden ref={restoreRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={e => restoreBackupGastos(e.target.files?.[0])} />
            </div>
          </>
        )}

        {/* ── PROFILE ── */}
        {screen === 'settings' && (
          <>
            <div className="top">
              <button className="iconbtn" onClick={() => navigate('home')}>←</button>
              <span style={{ fontWeight: 700, fontSize: 17 }}>Perfil</span>
              <span />
            </div>

            <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              {auth.user.photoURL ? (
                <img src={auth.user.photoURL} alt="" referrerPolicy="no-referrer" style={{ width: 54, height: 54, borderRadius: '50%' }} />
              ) : (
                <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--surface2)', display: 'grid', placeItems: 'center', fontSize: 24 }}>👤</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 16 }}>{auth.user.displayName || 'Usuario Kuento'}</div>
                <div className="small">{auth.user.email}</div>
                <div className="small" style={{ color: auth.user.emailVerified ? 'var(--neon)' : 'var(--red)' }}>
                  {auth.user.emailVerified ? '✓ Email verificado' : '⚠️ Email sin verificar'}
                </div>
              </div>
            </div>

            <div className="card form" style={{ marginBottom: 12 }}>
              <div className="label">Presupuesto</div>
              <div className="field">
                <label className="label">Presupuesto mensual ($)</label>
                <input className="input" inputMode="numeric" value={settings.budget} onChange={e => setSettings({ ...settings, budget: Number(e.target.value || 0) })} />
              </div>

              <div className="field">
                <label className="label">Alerta al % del presupuesto</label>
                <input className="input" inputMode="numeric" value={settings.alertPct} onChange={e => setSettings({ ...settings, alertPct: Number(e.target.value || 0) })} />
              </div>

              <button className="primary" onClick={saveBudgetSettings}>Guardar configuración</button>
            </div>

            <div className="card form" style={{ marginBottom: 12 }}>
              <div className="label">Seguridad</div>

              {!auth.user.emailVerified && auth.user.providerData?.some(provider => provider.providerId === 'password') && (
                <button className="secondary" onClick={async () => {
                  const ok = await auth.resendVerification();
                  if (ok) notify('📩 Email de verificación enviado. Revisá spam o correo no deseado');
                }}>
                  Reenviar verificación de email
                </button>
              )}

              <button className="secondary" onClick={async () => {
                const ok = await auth.resetPassword(auth.user.email);
                if (ok) notify('📩 Email para restablecer contraseña enviado. Revisá spam o correo no deseado');
              }}>
                Restablecer contraseña
              </button>

              {auth.biometricOk && !auth.hasBiometric && (
                <button className="secondary" onClick={async () => {
                  const ok = await auth.enableBiometric();
                  if (ok) notify('✅ Face ID / Huella activado');
                }}>
                  Activar Face ID / Huella
                </button>
              )}

              {auth.hasBiometric && (
                <div className="card" style={{ background: 'rgba(51,235,195,.08)', boxShadow: 'none' }}>
                  🔒 Face ID / Huella activado en este dispositivo
                </div>
              )}
            </div>

            <div className="card form" style={{ marginBottom: 12 }}>
              <div className="label">Solicitar datos</div>
              <div className="field">
                <label className="label">Archivo anual</label>
                <select className="input" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
                  {availableYears.map(y => <option key={y} value={String(y)}>Gastos {y}</option>)}
                </select>
              </div>
              <button className="secondary" onClick={() => downloadYearData(selectedYear)}>
                Descargar gastos {selectedYear}
              </button>
              <div className="small">
                Se genera un archivo CSV compatible con Excel y también restaurable desde Kuento.
              </div>
            </div>

            <div className="card form">
              <div className="label">Datos</div>
              <button className="secondary" onClick={downloadBackupGastos}>Descargar backup gastos</button>
              <button className="secondary" onClick={() => restoreRef.current.click()}>Restaurar backup gastos</button>
              <input hidden ref={restoreRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={e => restoreBackupGastos(e.target.files?.[0])} />
              <button className="danger-btn" onClick={auth.logout}>Cerrar sesión</button>
            </div>
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}

      {screen !== 'scan' && screen !== 'confirm' && (
        <nav className="nav">
          <button onClick={() => navigate('home')}><b><House size={21} /></b>Inicio</button>
          <button onClick={startCamera}><b><ScanLine size={21} /></b>QR</button>
          <button onClick={() => navigate('history')}><b><ClipboardList size={21} /></b>Historial</button>
          <button onClick={() => navigate('stats')}><b><BarChart3 size={21} /></b>Stats</button>
          <button onClick={() => navigate('settings')}><b><UserRound size={21} /></b>Perfil</button>
        </nav>
      )}
    </>
  );
}

function Expense({ e, del }) {
  const name = categoryName(e.category || 'Otro');
  return (
    <div className="card row" onClick={() => del(e.id)} style={{ cursor: 'pointer' }}>
      <div className="expense">
        <div className="emoji"><CategoryIcon name={name} size={22} /></div>
        <div>
          <div className="exp-title">{e.place}</div>
          <div className="small">{e.date} · {name} · {e.method || 'Manual'}</div>
        </div>
      </div>
      <div className="exp-amount">${fmt(e.amount)}</div>
    </div>
  );
}
