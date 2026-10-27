// ===== 市場引擎：盤中走勢、時鐘、委託撮合、帳戶 =====
const M = window.MARKET;
const START_CASH = 1000000;
const SESSION_MIN = 270;               // 09:00–13:30
const REAL_SECONDS = 300;              // 一個交易日 = 5 分鐘（1 倍速）
const FEE = 0.001425, TAX_STOCK = 0.003, TAX_ETF = 0.001;

function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s) { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

// 台股升降單位（tick size）
function tick(p, etf) {
  if (etf) return p < 50 ? 0.01 : 0.05;
  return p < 10 ? 0.01 : p < 50 ? 0.05 : p < 100 ? 0.1 : p < 500 ? 0.5 : p < 1000 ? 1 : 5;
}
function roundTick(p, etf) { const t = tick(p, etf); return Math.round(Math.round(p / t) * t * 100) / 100; }

const STOCK = {}; M.stocks.forEach((s, i) => { s.i = i; STOCK[s.code] = s; });

// ---- 盤中走勢：一定從真實開盤價出發、碰到真實最高與最低價、停在真實收盤價 ----
const pathCache = new Map();
function intraday(code, d) {
  const key = code + '@' + d;
  if (pathCache.has(key)) return pathCache.get(key);
  const s = STOCK[code], O = s.o[d], H = s.h[d], L = s.l[d], C = s.c[d];
  const n = SESSION_MIN + 1, p = new Float64Array(n);
  if (O == null) { pathCache.set(key, null); return null; }
  const r = rng(hash(key));
  if (H - L < 1e-9) { p.fill(C); pathCache.set(key, p); return p; }
  // 先碰高點還是低點：收紅較常先探低、收黑較常先衝高
  const lowFirst = r() < (C >= O ? 0.62 : 0.38);
  let t1 = 8 + Math.floor(r() * 150), t2 = Math.min(262, t1 + 20 + Math.floor(r() * (250 - t1)));
  const anchors = [[0, O], [t1, lowFirst ? L : H], [t2, lowFirst ? H : L], [SESSION_MIN, C]];
  // 若開盤就是高點或低點，讓錨點對齊
  if (Math.abs(O - H) < 1e-9) anchors[lowFirst ? 2 : 1][0] = 0;
  if (Math.abs(O - L) < 1e-9) anchors[lowFirst ? 1 : 2][0] = 0;
  anchors.sort((a, b) => a[0] - b[0]);
  const sig = (H - L) / 7;
  for (let k = 0; k < anchors.length - 1; k++) {
    const [ta, va] = anchors[k], [tb, vb] = anchors[k + 1], len = tb - ta;
    if (len <= 0) { p[ta] = vb; continue; }
    // Brownian bridge
    let w = 0; const W = [0];
    for (let i = 1; i <= len; i++) { w += gauss(r) * sig / Math.sqrt(Math.max(len, 1)) * 1.6; W.push(w); }
    for (let i = 0; i <= len; i++) {
      const f = i / len, bridge = W[i] - f * W[len];
      p[ta + i] = va + (vb - va) * f + bridge * 0.9;
    }
  }
  for (let i = 0; i < n; i++) p[i] = roundTick(Math.min(H, Math.max(L, p[i])), s.etf);
  for (const [t, v] of anchors) p[t] = v;
  p[0] = O; p[SESSION_MIN] = C;
  pathCache.set(key, p);
  return p;
}
// 成交量分布：開盤、收盤量大，中午量小（U 型）
const VOLW = (() => { const w = []; let s = 0; for (let m = 0; m <= SESSION_MIN; m++) { const x = m / SESSION_MIN; const v = 0.35 + 2.2 * Math.exp(-x * 9) + 1.4 * Math.exp(-(1 - x) * 12); w.push(v); s += v; } return w.map(v => v / s); })();

// ---- 遊戲狀態 ----
const SAVE_KEY = 'atelier-bourse-' + M.dates[M.startIdx] + '-' + M.stocks.length;
function newGame() {
  return {
    v: 1, day: M.startIdx, phase: 'research', minute: 0, cash: START_CASH, reserved: 0,
    pos: {}, orders: [], fills: [], realized: 0, fees: 0, taxes: 0,
    equity: [{ d: M.startIdx, v: START_CASH }], intraEq: [],
    quiz: { right: 0, total: 0, asked: [] }, terms: [], viewedFin: [], badges: [], speed: 1, watch: ['2330', '2408', '8046', '0050'],
    selected: '2330', started: Date.now()
  };
}
let G;
try { G = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); } catch (e) { G = null; }
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(G)); } catch (e) { } }

const FUTURE_DAYS = M.dates.length - 1 - M.startIdx;
// 玩家「已知」的最後一個交易日：盤前與盤中只知道到昨天，收盤後才知道今天
function knownDay() { return (G.phase === 'open' || G.phase === 'preopen') ? G.day - 1 : G.day; }
function priceNow(code) {
  if (G.phase === 'open') { const p = intraday(code, G.day); if (p) return p[Math.floor(G.minute)]; }
  return lastClose(code, knownDay());
}
function lastClose(code, d) { const s = STOCK[code]; for (let i = d; i >= 0; i--) if (s.c[i] != null) return s.c[i]; return null; }
// 漲跌比較基準：盤中＝昨收；收盤後＝今天跟昨天比；盤前＝昨天跟前天比
function refClose(code) { return lastClose(code, G.phase === 'open' ? G.day - 1 : knownDay() - 1); }
function dayChange(code) { const p = priceNow(code), r = refClose(code); return { p, r, chg: p - r, pct: r ? (p - r) / r * 100 : 0 }; }

function feeOf(amount, odd) { return Math.max(odd ? 1 : 20, Math.floor(amount * FEE)); }
function taxOf(amount, code) { return Math.floor(amount * (STOCK[code].etf ? TAX_ETF : TAX_STOCK)); }

function holdingsValue() { let v = 0; for (const [c, h] of Object.entries(G.pos)) v += h.qty * priceNow(c); return v; }
function totalAssets() { return G.cash + holdingsValue(); }
function availableQty(code) { const h = G.pos[code]; const res = G.orders.filter(o => o.status === 'open' && o.side === 'sell' && o.code === code).reduce((a, o) => a + o.qty, 0); return (h ? h.qty : 0) - res; }

// ---- 委託 ----
function placeOrder({ code, side, type, price, qty, odd }) {
  if (G.phase !== 'open') return { ok: false, msg: '現在不是交易時間（09:00–13:30）' };
  qty = Math.floor(qty);
  if (!(qty > 0)) return { ok: false, msg: '請輸入數量' };
  if (!odd && qty % 1000) return { ok: false, msg: '整股要以 1 張（1,000 股）為單位' };
  if (odd && qty >= 1000) return { ok: false, msg: '零股一次要少於 1,000 股' };
  const s = STOCK[code], now = priceNow(code), r = lastClose(code, G.day - 1);
  if (type === 'limit') {
    price = roundTick(+price, s.etf);
    if (!(price > 0)) return { ok: false, msg: '請輸入價格' };
    if (price > r * 1.1 + 1e-6 || price < r * 0.9 - 1e-6) return { ok: false, msg: '價格超過漲跌停範圍（昨收 ±10%）' };
  }
  const est = (type === 'limit' ? price : now) * qty;
  if (side === 'buy') {
    const need = est + feeOf(est, odd);
    if (need > G.cash - G.reserved + 1e-6) return { ok: false, msg: '現金不足，需要 ' + money(need) };
  } else if (availableQty(code) < qty) return { ok: false, msg: '庫存不足' };
  const o = { id: Math.random().toString(36).slice(2, 8), code, side, type, price: type === 'limit' ? price : null, qty, odd, t: G.minute, status: 'open', day: G.day };
  if (side === 'buy') { o.hold = est + feeOf(est, odd); G.reserved += o.hold; }
  G.orders.push(o);
  if (type === 'market') fill(o, now);
  else tryFill(o);
  persist();
  return { ok: true, order: o };
}
function cancelOrder(id) {
  const o = G.orders.find(x => x.id === id && x.status === 'open'); if (!o) return;
  o.status = 'cancelled'; if (o.hold) G.reserved -= o.hold; persist();
}
function tryFill(o) {
  const p = priceNow(o.code);
  if (o.side === 'buy' && p <= o.price) fill(o, o.price);
  else if (o.side === 'sell' && p >= o.price) fill(o, o.price);
}
function fill(o, px) {
  const amt = px * o.qty, fee = feeOf(amt, o.odd);
  if (o.hold) G.reserved -= o.hold;
  if (o.side === 'buy') {
    if (amt + fee > G.cash + 1e-6) { o.status = 'rejected'; return; }
    G.cash -= amt + fee;
    const h = G.pos[o.code] || (G.pos[o.code] = { qty: 0, cost: 0 });
    h.qty += o.qty; h.cost += amt + fee;
  } else {
    const tax = taxOf(amt, o.code), h = G.pos[o.code];
    const costPart = h.cost * o.qty / h.qty;
    G.cash += amt - fee - tax;
    const pnl = amt - fee - tax - costPart;
    G.realized += pnl; G.taxes += tax; o.pnl = pnl;
    h.qty -= o.qty; h.cost -= costPart; if (h.qty <= 0) delete G.pos[o.code];
  }
  G.fees += fee;
  o.status = 'filled'; o.fillPx = px; o.fillT = G.minute; o.fee = fee;
  G.fills.push({ ...o });
  if (typeof UI !== 'undefined') UI.onFill(o);
}

// ---- 時鐘 ----
function minuteToClock(m) { const t = 9 * 60 + Math.floor(m); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
function step(dtSec) {
  if (G.phase !== 'open' || G.paused) return;
  const before = Math.floor(G.minute);
  G.minute = Math.min(SESSION_MIN, G.minute + dtSec * SESSION_MIN / REAL_SECONDS * G.speed);
  const after = Math.floor(G.minute);
  if (after !== before) {
    for (const o of G.orders) if (o.status === 'open' && o.type === 'limit') tryFill(o);
    if (after % 10 === 0) G.intraEq.push({ m: after, v: totalAssets() });
  }
  if (G.minute >= SESSION_MIN) closeDay();
}
function openDay() {
  G.phase = 'open'; G.minute = 0; G.paused = false; G.intraEq = [{ m: 0, v: totalAssets() }]; persist();
}
function closeDay() {
  G.minute = SESSION_MIN;
  // 收盤：未成交委託取消
  for (const o of G.orders) if (o.status === 'open') { o.status = 'expired'; if (o.hold) G.reserved -= o.hold; }
  G.reserved = 0;
  G.phase = 'closed';
  G.equity.push({ d: G.day, v: totalAssets() });
  persist();
  if (typeof UI !== 'undefined') UI.onClose();
}
function nextDay() {
  if (G.day >= M.dates.length - 1) { G.phase = 'ended'; persist(); return false; }
  G.day++; G.phase = 'preopen'; G.minute = 0; G.orders = G.orders.filter(o => o.status === 'open'); persist(); return true;
}
function isLastDay() { return G.day >= M.dates.length - 1; }

function money(n, sign) { const s = Math.round(n).toLocaleString('zh-TW'); return (sign && n > 0 ? '+' : '') + 'NT$' + s; }
function fmtPx(p) { if (p == null) return '—'; return p >= 1000 ? p.toLocaleString('zh-TW', { maximumFractionDigits: 0 }) : p.toLocaleString('zh-TW', { minimumFractionDigits: p < 50 ? 2 : p < 1000 ? 1 : 0, maximumFractionDigits: 2 }); }
function fmtPct(x) { return (x > 0 ? '+' : '') + x.toFixed(2) + '%'; }
function dateLabel(d) { const s = M.dates[d]; const dt = new Date(s + 'T00:00:00'); return dt.getFullYear() + ' 年 ' + (dt.getMonth() + 1) + ' 月 ' + dt.getDate() + ' 日（' + '日一二三四五六'[dt.getDay()] + '）'; }
