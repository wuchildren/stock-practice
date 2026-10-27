// ===== 圖表（純 canvas，無外部套件） =====
const C = {
  ink: '#1B2A41', muted: '#7A7468', line: '#E6DFD2', paper: '#FBF8F2', up: '#A23B3B', down: '#2F6B57', gold: '#B08D57', navy: '#1B2A41',
  font: '"Inter","Noto Sans TC",system-ui,sans-serif', serif: '"Cormorant Garamond","Noto Serif TC",Georgia,serif'
};
function setup(cv) {
  const dpr = Math.min(2, window.devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
  return { g, w, h };
}
function niceTicks(min, max, n = 4) {
  const span = max - min || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag, out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

// 盤中走勢（一天）
function drawIntraday(cv, path, upto, ref, opts = {}) {
  const { g, w, h } = setup(cv);
  const padL = 8, padR = 58, padT = 14, padB = 26, vh = opts.vol ? 46 : 0;
  const shown = path ? Array.from(path.slice(0, Math.floor(upto) + 1)) : [];
  let lo = ref * 0.985, hi = ref * 1.015;
  for (const v of shown) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const X = m => padL + m / SESSION_MIN * (w - padL - padR), Y = v => padT + (hi - v) / (hi - lo) * (h - padT - padB - vh);
  g.font = '11px ' + C.font; g.fillStyle = C.muted; g.strokeStyle = C.line; g.lineWidth = 1;
  const tks = niceTicks(lo, hi, 4), stp = tks.length > 1 ? Math.abs(tks[1] - tks[0]) : 10000, dec = stp >= 10000 ? 0 : stp >= 1000 ? 1 : 2;
  for (const t of tks) { const y = Math.round(Y(t)) + .5; g.beginPath(); g.moveTo(padL, y); g.lineTo(w - padR, y); g.stroke(); g.fillText(fmtPx(t), w - padR + 6, y + 4); }
  [[0, '09:00'], [90, '10:30'], [180, '12:00'], [270, '13:30']].forEach(([m, l]) => { g.fillText(l, Math.min(w - padR - 30, Math.max(padL, X(m) - 14)), h - 8); });
  // 昨收虛線
  g.setLineDash([4, 4]); g.strokeStyle = C.gold; g.beginPath(); g.moveTo(padL, Y(ref)); g.lineTo(w - padR, Y(ref)); g.stroke(); g.setLineDash([]);
  g.fillStyle = C.gold; g.fillText(tr('昨收 ', 'Prev close ') + fmtPx(ref), padL + 4, Y(ref) - 5);
  if (shown.length < 2) { if (shown.length) { g.fillStyle = C.ink; g.beginPath(); g.arc(X(0), Y(shown[0]), 3, 0, 7); g.fill(); } return; }
  const last = shown[shown.length - 1], col = last >= ref ? C.up : C.down;
  // 面積漸層
  const grad = g.createLinearGradient(0, padT, 0, h - padB - vh);
  grad.addColorStop(0, col + '33'); grad.addColorStop(1, col + '00');
  g.beginPath(); g.moveTo(X(0), Y(shown[0])); shown.forEach((v, i) => g.lineTo(X(i), Y(v)));
  g.lineTo(X(shown.length - 1), h - padB - vh); g.lineTo(X(0), h - padB - vh); g.closePath(); g.fillStyle = grad; g.fill();
  g.beginPath(); shown.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.strokeStyle = col; g.lineWidth = 1.8; g.stroke();
  // 目前價格點
  const lx = X(shown.length - 1), ly = Y(last);
  g.fillStyle = col; g.beginPath(); g.arc(lx, ly, 3.5, 0, 7); g.fill();
  g.globalAlpha = .18; g.beginPath(); g.arc(lx, ly, 9, 0, 7); g.fill(); g.globalAlpha = 1;
  g.fillStyle = col; g.fillRect(w - padR + 2, ly - 9, padR - 4, 18); g.fillStyle = '#fff'; g.font = '600 11px ' + C.font; g.fillText(fmtPx(last), w - padR + 6, ly + 4);
  if (opts.vol) {
    const vols = shown.map((_, i) => VOLW[i]), mx = Math.max(...VOLW);
    g.fillStyle = C.ink + '33';
    vols.forEach((v, i) => { const bh = v / mx * (vh - 8); g.fillRect(X(i), h - padB - bh, Math.max(1, (w - padL - padR) / SESSION_MIN - .5), bh); });
  }
  // 委託價位線
  (opts.orders || []).forEach(o => { const y = Y(o.price); if (y < padT || y > h - padB - vh) return; g.setLineDash([2, 3]); g.strokeStyle = o.side === 'buy' ? C.up : C.down; g.beginPath(); g.moveTo(padL, y); g.lineTo(w - padR, y); g.stroke(); g.setLineDash([]); g.fillStyle = g.strokeStyle; g.fillText((o.side === 'buy' ? tr('買 ', 'Buy ') : tr('賣 ', 'Sell ')) + fmtPx(o.price), w - padR - 70, y - 3); });
}

// 日 K 線（只畫到玩家已知的日子）＋ 20 日均線 ＋ 成交量 ＋ 新聞標記
function drawCandles(cv, s, from, to, today, opts = {}) {
  const { g, w, h } = setup(cv);
  const padL = 8, padR = 58, padT = 14, padB = 26, vh = 52;
  const idx = []; for (let d = from; d <= to; d++) if (s.c[d] != null) idx.push(d);
  const bars = idx.map(d => ({ d, o: s.o[d], h: s.h[d], l: s.l[d], c: s.c[d], v: s.v[d] }));
  if (today) bars.push(today);
  if (!bars.length) return;
  let lo = Math.min(...bars.map(b => b.l)), hi = Math.max(...bars.map(b => b.h)); const pad = (hi - lo) * .06; lo -= pad; hi += pad;
  const n = bars.length, bw = (w - padL - padR) / n;
  const X = i => padL + i * bw + bw / 2, Y = v => padT + (hi - v) / (hi - lo) * (h - padT - padB - vh);
  g.font = '11px ' + C.font; g.fillStyle = C.muted; g.strokeStyle = C.line; g.lineWidth = 1;
  for (const t of niceTicks(lo, hi, 4)) { const y = Math.round(Y(t)) + .5; g.beginPath(); g.moveTo(padL, y); g.lineTo(w - padR, y); g.stroke(); g.fillText(fmtPx(t), w - padR + 6, y + 4); }
  let lastM = '';
  bars.forEach((b, i) => { const dt = M.dates[b.d] || ''; const m = dt.slice(0, 7); if (m !== lastM && i > 0) { g.fillStyle = C.muted; g.fillText(isEN() ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+dt.slice(5, 7) - 1] : +dt.slice(5, 7) + '月', X(i) - 8, h - 8); g.strokeStyle = C.line; g.setLineDash([2, 4]); g.beginPath(); g.moveTo(X(i), padT); g.lineTo(X(i), h - padB); g.stroke(); g.setLineDash([]); } lastM = m; });
  const mv = Math.max(...bars.map(b => b.v || 0)) || 1;
  bars.forEach((b, i) => {
    const up = b.c >= b.o, col = up ? C.up : C.down, x = X(i);
    g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, Y(b.h)); g.lineTo(x, Y(b.l)); g.stroke();
    const y1 = Y(Math.max(b.o, b.c)), y2 = Y(Math.min(b.o, b.c)), bwid = Math.max(1, bw * .62);
    g.fillRect(x - bwid / 2, y1, bwid, Math.max(1, y2 - y1));
    const vhh = (b.v || 0) / mv * (vh - 10); g.globalAlpha = .35; g.fillRect(x - bwid / 2, h - padB - vhh, bwid, vhh); g.globalAlpha = 1;
  });
  // 20 日均線
  g.strokeStyle = C.gold; g.lineWidth = 1.4; g.beginPath(); let started = false;
  bars.forEach((b, i) => { const all = []; for (let k = Math.max(0, i - 19); k <= i; k++) all.push(bars[k].c); if (i >= 19) { const ma = all.reduce((a, c) => a + c, 0) / all.length; started ? g.lineTo(X(i), Y(ma)) : (g.moveTo(X(i), Y(ma)), started = true); } });
  g.stroke();
  // 新聞標記
  (opts.news || []).forEach(nw => { const i = bars.findIndex(b => b.d === nw.d); if (i < 0) return; g.fillStyle = C.navy; g.beginPath(); g.moveTo(X(i), padT + 2); g.lineTo(X(i) - 5, padT - 6 + 2); g.lineTo(X(i) + 5, padT - 6 + 2); g.closePath(); g.fill(); g.globalAlpha = .25; g.fillRect(X(i) - .5, padT, 1, h - padT - padB - vh); g.globalAlpha = 1; });
  cv._bars = bars; cv._X = X; cv._bw = bw;
}

function drawSpark(cv, vals, ref) {
  const { g, w, h } = setup(cv); if (vals.length < 2) return;
  let lo = Math.min(...vals, ref), hi = Math.max(...vals, ref); if (hi - lo < 1e-9) hi = lo + 1;
  const X = i => i / (vals.length - 1) * w, Y = v => 2 + (hi - v) / (hi - lo) * (h - 4);
  g.setLineDash([2, 3]); g.strokeStyle = C.line; g.beginPath(); g.moveTo(0, Y(ref)); g.lineTo(w, Y(ref)); g.stroke(); g.setLineDash([]);
  g.strokeStyle = vals[vals.length - 1] >= ref ? C.up : C.down; g.lineWidth = 1.3; g.beginPath(); vals.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke();
}

// 資產曲線（你、AI、大盤）
function drawEquity(cv, series) {
  const { g, w, h } = setup(cv);
  const padL = 10, padR = 74, padT = 14, padB = 26;
  const all = series.flatMap(s => s.pts.map(p => p.v)); if (!all.length) return;
  let lo = Math.min(...all), hi = Math.max(...all); const pad = (hi - lo) * .1 || 10000; lo -= pad; hi += pad;
  const n = Math.max(...series.map(s => s.pts.length));
  const X = i => padL + i / Math.max(1, n - 1) * (w - padL - padR), Y = v => padT + (hi - v) / (hi - lo) * (h - padT - padB);
  g.font = '11px ' + C.font; g.strokeStyle = C.line; g.fillStyle = C.muted;
  const tks = niceTicks(lo, hi, 4), stp = tks.length > 1 ? Math.abs(tks[1] - tks[0]) : 10000, dec = stp >= 10000 ? 0 : stp >= 1000 ? 1 : 2;
  for (const t of tks) { const y = Math.round(Y(t)) + .5; g.beginPath(); g.moveTo(padL, y); g.lineTo(w - padR, y); g.stroke(); g.fillText(isEN() ? (t / 1e6).toFixed(dec + 2) + 'M' : (t / 10000).toFixed(dec) + ' 萬', w - padR + 6, y + 4); }
  g.setLineDash([3, 4]); g.strokeStyle = C.gold; g.beginPath(); g.moveTo(padL, Y(START_CASH)); g.lineTo(w - padR, Y(START_CASH)); g.stroke(); g.setLineDash([]);
  series.forEach(s => {
    g.strokeStyle = s.color; g.lineWidth = s.bold ? 2.6 : 1.6; if (s.dash) g.setLineDash([5, 4]);
    g.beginPath(); s.pts.forEach((p, i) => i ? g.lineTo(X(i), Y(p.v)) : g.moveTo(X(i), Y(p.v))); g.stroke(); g.setLineDash([]);
    const lp = s.pts[s.pts.length - 1]; if (lp) { g.fillStyle = s.color; g.beginPath(); g.arc(X(s.pts.length - 1), Y(lp.v), 3, 0, 7); g.fill(); }
  });
}
