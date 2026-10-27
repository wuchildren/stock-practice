// ===== 介面 =====
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cls = x => x > 1e-9 ? 'up' : x < -1e-9 ? 'down' : 'flat';
const arrow = x => x > 1e-9 ? '▲' : x < -1e-9 ? '▼' : '—';
const T = (term, label) => `<span class="term" data-term="${esc(term)}">${esc(label || gTerm(term))}</span>`;
const SECTORS = ['全部', '持有', ...[...new Set(M.stocks.map(s => s.sector))]];
M.news.forEach(n => n.d = M.dates.indexOf(n.date));

const UI = {
  view: 'trade', chartMode: 'intra', infoMode: 'stats', side: 'buy', lot: 'board', type: 'limit', sector: '全部', q: '',
  init() {
    this.renderCover();
    if (G && G.phase !== 'ended') $('btnContinue').hidden = false;
    $('btnNew').onclick = () => { G = newGame(); persist(); this.enter(true); };
    $('btnContinue').onclick = () => this.enter(false);
    // 分頁
    $('tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; this.show(b.dataset.v); };
    $('speedCtl').onclick = e => { const b = e.target.closest('button'); if (!b) return; const s = +b.dataset.s; if (s === 0) G.paused = !G.paused; else { G.speed = s; G.paused = false; } this.renderSpeed(); persist(); };
    $('btnSession').onclick = () => this.sessionButton();
    $('search').oninput = e => { this.q = e.target.value.trim(); this.renderList(true); };
    this.renderChips();
    $('sectorChips').onclick = e => { const b = e.target.closest('button'); if (!b) return; this.sector = b.dataset.s; [...$('sectorChips').children].forEach(x => x.classList.toggle('on', x === b)); this.renderList(true); };
    $('mlist').onclick = e => { const r = e.target.closest('.mrow'); if (r) this.select(r.dataset.c); };
    $('chartSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; this.chartMode = b.dataset.c; this.segOn('chartSeg', b); this.renderChart(); };
    $('infoSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; this.infoMode = b.dataset.i; this.segOn('infoSeg', b); this.renderInfo(); };
    $('sideSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; this.side = b.dataset.side; this.segOn('sideSeg', b); this.renderTicket(true); };
    $('lotSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; this.lot = b.dataset.lot; this.segOn('lotSeg', b); $('oQty').value = this.lot === 'board' ? 1 : 100; this.renderTicket(); };
    $('typeSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; this.type = b.dataset.type; this.segOn('typeSeg', b); this.renderTicket(); };
    $('pxFld').onclick = e => { const b = e.target.closest('button[data-step]'); if (!b) return; const s = STOCK[G.selected]; let p = +$('oPrice').value || priceNow(s.code); p = roundTick(p + (+b.dataset.step) * tick(p, s.etf), s.etf); $('oPrice').value = p; this.renderEst(); };
    document.querySelector('.ticket').addEventListener('click', e => { const b = e.target.closest('button[data-q]'); if (!b) return; $('oQty').value = Math.max(1, (+$('oQty').value || 0) + (+b.dataset.q) * (this.lot === 'odd' ? 10 : 1)); this.renderEst(); });
    $('quickQty').onclick = e => { const b = e.target.closest('button'); if (b) { $('oQty').value = b.dataset.v; this.renderEst(); } };
    $('oPrice').oninput = $('oQty').oninput = () => this.renderEst();
    $('btnOrder').onclick = () => this.submit();
    $('orderList').onclick = e => { const b = e.target.closest('button[data-cancel]'); if (b) { cancelOrder(b.dataset.cancel); this.renderOrders(); this.renderTop(); } };
    document.addEventListener('click', e => {
      const t = e.target.closest('.term');
      if (t) { this.pop(t.dataset.term, t); e.stopPropagation(); return; }
      if (!e.target.closest('.pop')) $('pop').hidden = true;
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') $('pop').hidden = true; if (e.key === ' ' && G && G.phase === 'open' && !/INPUT/.test(document.activeElement.tagName)) { e.preventDefault(); G.paused = !G.paused; this.renderSpeed(); } });
    addEventListener('resize', () => this.renderChart());
    this.last = performance.now();
    requestAnimationFrame(t => this.loop(t));
  },
  renderCover() {
    $('coverDate').textContent = isEN() ? dateLabel(M.startIdx) : dateLabel(M.startIdx).replace(/（.）/, '') + ' 收盤後';
    $('coverDays').textContent = FUTURE_DAYS; $('coverStocks').textContent = M.stocks.length;
    document.querySelector('.cover-notes div:nth-child(3) b').textContent = Object.keys(GLOSSARY).length;
  },
  renderChips() { $('sectorChips').innerHTML = SECTORS.map(s => `<button data-s="${s}" class="${s === this.sector ? 'on' : ''}">${esc(secName(s))}</button>`).join(''); },
  // 切換語言：重畫目前畫面上的所有東西，不動遊戲狀態
  relang() {
    this.renderCover(); this.renderChips();
    $('pop').hidden = true; $('toast').hidden = true;
    if (!G || $('app').hidden) return;
    const m = $('oMsg'); if (m.dataset.keep !== undefined || m.className !== 'msg') { m.className = 'msg'; m.textContent = ''; delete m.dataset.keep; }
    this.renderTop(); this.renderList(true); this.renderStock(); this.renderTicket(); this.renderOrders(); this.renderMiniHold(); this.renderTicker(); this.renderSpeed();
    this.show(this.view);
    if (!$('sheet').hidden && this._sheetFn) { const st = $('sheetBody').scrollTop; this._sheetFn(); $('sheetBody').scrollTop = st; }
  },
  segOn(id, b) { [...$(id).children].forEach(x => x.classList.toggle('on', x === b)); },
  enter(fresh) {
    $('cover').hidden = true; $('app').hidden = false;
    this.renderAll();
    if (G.phase === 'research') this.sheetWelcome();
    else if (G.phase === 'preopen') this.sheetMorning();
    else if (G.phase === 'closed') this.sheetClose();
    else if (G.phase === 'ended') this.sheetFinal();
  },
  show(v) {
    this.view = v; [...$('tabs').children].forEach(b => b.classList.toggle('on', b.dataset.v === v));
    document.querySelectorAll('.view').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
    if (v === 'portfolio') this.renderPortfolio(); if (v === 'news') this.renderNews(); if (v === 'glossary') this.renderGlossary(); if (v === 'rivals') this.renderRivals(); if (v === 'trade') this.renderChart();
  },
  loop(t) {
    const dt = Math.min(0.25, (t - this.last) / 1000); this.last = t;
    if (G && G.phase === 'open') {
      const before = Math.floor(G.minute);
      step(dt);
      if (G.phase === 'open' && Math.floor(G.minute) !== before) this.tickRender();
    }
    requestAnimationFrame(x => this.loop(x));
  },
  tickRender() {
    const now = performance.now();
    this.renderTop();
    if (now - (this.lastList || 0) > 700) { this.lastList = now; this.renderList(); this.renderMiniHold(); if (this.view === 'portfolio') this.renderPortfolio(); if (this.view === 'trade' && (this.infoMode || 'stats') === 'stats' && !$('pop').contains(document.activeElement)) this.renderInfo(); }
    if (this.view === 'trade' && this.chartMode === 'intra') this.renderChart();
    this.renderHead();
    if (now - (this.lastEst || 0) > 1000) { this.lastEst = now; this.renderEst(); }
  },
  renderAll() { this.renderTop(); this.renderList(true); this.renderStock(); this.renderTicket(true); this.renderOrders(); this.renderMiniHold(); this.renderTicker(); this.renderSpeed(); },

  // ----- 上方列 -----
  renderTop() {
    const ph = G.phase;
    $('tbDate').textContent = ph === 'research' ? dateLabel(G.day) + tr('・收盤後', ' · after the close') : dateLabel(G.day);
    const label = isEN() ? { research: 'Research', preopen: 'Pre-market', open: 'Trading', closed: 'Closed', ended: 'Settled' }[ph] : { research: '研究期', preopen: '盤前', open: '交易中', closed: '已收盤', ended: '結算' }[ph];
    $('tbPhase').textContent = label; $('tbPhase').className = 'pill' + (ph === 'open' ? ' live' : '');
    $('tbClock').textContent = ph === 'open' ? minuteToClock(G.minute) : ph === 'preopen' ? '08:45' : '13:30';
    $('tbProgress').style.width = (ph === 'open' ? G.minute / SESSION_MIN * 100 : ph === 'closed' || ph === 'research' ? 100 : 0) + '%';
    $('speedCtl').style.visibility = ph === 'open' ? 'visible' : 'hidden';
    const btn = $('btnSession');
    btn.textContent = isEN() ? { research: 'Start day 1', preopen: 'Open (09:00)', open: 'Skip to close', closed: isLastDay() ? 'Final results' : 'Next trading day', ended: 'View results' }[ph] : { research: '開始第一個交易日', preopen: '開盤（09:00）', open: '快轉到收盤', closed: isLastDay() ? '看最終結算' : '下一個交易日', ended: '看結算' }[ph];
    const a = totalAssets(), prevEq = G.equity.length ? G.equity[G.equity.length - (ph === 'closed' ? 2 : 1)]?.v ?? START_CASH : START_CASH;
    // 總損益＝所有持有部位的損益加總（現在市值 − 買進成本）
    let tot = 0, cost = 0; for (const [c, h] of Object.entries(G.pos)) { tot += priceNow(c) * h.qty - h.cost; cost += h.cost; }
    $('tbAssets').textContent = money(a); $('tbAssets').className = cls(a - START_CASH);
    $('tbToday').textContent = money(tot, true) + (cost ? tr('（', ' (') + fmtPct(tot / cost * 100) + tr('）', ')') : ''); $('tbToday').className = cls(tot);
    $('tbCash').textContent = money(G.cash - G.reserved);
  },
  renderSpeed() { [...$('speedCtl').children].forEach(b => b.classList.toggle('on', +b.dataset.s === 0 ? !!G.paused : (!G.paused && +b.dataset.s === G.speed))); },
  sessionButton() {
    const ph = G.phase;
    if (ph === 'research') { nextDay(); this.renderAll(); this.sheetMorning(); }
    else if (ph === 'preopen') { openDay(); $('sheet').hidden = true; this.renderAll(); this.toast(tr('09:00 開盤！', 'The market is open (09:00)!')); this.chime(); }
    else if (ph === 'open') { G.minute = SESSION_MIN - 0.001; step(1); }
    else if (ph === 'closed') { if (isLastDay()) { G.phase = 'ended'; persist(); this.sheetFinal(); } else { nextDay(); this.renderAll(); this.sheetMorning(); } }
    else this.sheetFinal();
  },

  // ----- 市場清單 -----
  listRows() {
    let arr = M.stocks;
    if (this.sector === '持有') arr = arr.filter(s => G.pos[s.code]);
    else if (this.sector !== '全部') arr = arr.filter(s => s.sector === this.sector);
    if (this.q) { const q = this.q.toLowerCase(); arr = arr.filter(s => s.code.includes(this.q) || s.name.includes(this.q) || (STOCK_EN[s.code] || '').toLowerCase().includes(q)); }
    return arr;
  },
  renderList(full) {
    const rows = this.listRows();
    if (full || !this._rowsKey || this._rowsKey !== rows.map(s => s.code).join()) {
      this._rowsKey = rows.map(s => s.code).join();
      let html = '', lastSec = '';
      for (const s of rows) {
        if (this.sector === '全部' && s.sector !== lastSec) { html += `<div class="sec-h">${esc(secName(s.sector))}</div>`; lastSec = s.sector; }
        html += `<div class="mrow${s.code === G.selected ? ' sel' : ''}" data-c="${s.code}"><div><div class="nm">${esc(sName(s))}${G.pos[s.code] ? `<span class="held">${tr('持有', 'Held')}</span>` : ''}</div><div class="cd">${s.code}</div></div><canvas></canvas><div><div class="px"></div><div class="pc"></div></div></div>`;
      }
      $('mlist').innerHTML = html || `<p class="empty" style="padding:14px">${tr('沒有符合的股票', 'No matching stocks')}</p>`;
      this._prevPx = {};
      // 只更新畫面上看得到的列，100 檔股票也不會拖慢電腦
      if (this._io) this._io.disconnect();
      this._vis = new Set();
      if ('IntersectionObserver' in window) {
        this._io = new IntersectionObserver(es => { for (const e of es) { if (e.isIntersecting) { this._vis.add(e.target.dataset.c); this.updRow(e.target); } else this._vis.delete(e.target.dataset.c); } }, { root: $('mlist'), rootMargin: '120px 0px' });
        for (const el of $('mlist').querySelectorAll('.mrow')) this._io.observe(el);
      } else this._vis = null;
    }
    for (const el of $('mlist').querySelectorAll('.mrow')) if (!this._vis || this._vis.has(el.dataset.c)) this.updRow(el);
  },
  updRow(el) {
    {
      const c = el.dataset.c, ch = dayChange(c), prev = this._prevPx[c];
      el.querySelector('.px').textContent = fmtPx(ch.p); el.querySelector('.px').className = 'px ' + cls(ch.chg);
      el.querySelector('.pc').textContent = fmtPct(ch.pct); el.querySelector('.pc').className = 'pc ' + cls(ch.chg);
      if (prev != null && prev !== ch.p) { el.classList.remove('flash-up', 'flash-down'); const k = ch.p > prev ? 'flash-up' : 'flash-down'; requestAnimationFrame(() => el.classList.add(k)); }
      this._prevPx[c] = ch.p;
      let vals;
      if (G.phase === 'open') { const p = intraday(c, G.day); vals = p ? Array.from(p.slice(0, Math.floor(G.minute) + 1)).filter((_, i) => i % 5 === 0) : []; }
      else { vals = []; const s = STOCK[c]; for (let d = Math.max(0, knownDay() - 20); d <= knownDay(); d++) if (s.c[d] != null) vals.push(s.c[d]); }
      drawSpark(el.querySelector('canvas'), vals, G.phase === 'open' ? ch.r : vals[0]);
    }
  },
  select(code) { G.selected = code; persist(); for (const r of $('mlist').querySelectorAll('.mrow')) r.classList.toggle('sel', r.dataset.c === code); this.renderStock(); this.renderTicket(true); this.renderMiniHold(); },

  // ----- 個股 -----
  renderStock() { this.renderHead(); this.renderChart(); this.renderInfo(); },
  renderHead() {
    const s = STOCK[G.selected], ch = dayChange(s.code);
    $('sCode').textContent = s.code + (s.etf ? '・ETF' : '');
    $('sName').textContent = sName(s); $('sSector').textContent = secName(s.sector);
    $('sPrice').textContent = fmtPx(ch.p); $('sPrice').className = 'big ' + cls(ch.chg);
    $('sChg').innerHTML = `<span class="${cls(ch.chg)}">${arrow(ch.chg)} ${fmtPx(Math.abs(ch.chg))}${tr('（', ' (')}${fmtPct(ch.pct)}${tr('）', ')')}</span>`;
  },
  renderChart() {
    if (this.view !== 'trade') return;
    const s = STOCK[G.selected], cv = $('chart');
    const news = M.news.filter(n => n.d >= 0 && n.d <= knownDay() && (n.codes.includes(s.code) || n.codes.includes('大盤'))).map(n => ({ d: n.d }));
    if (this.chartMode === 'intra') {
      const live = G.phase === 'open', d = live ? G.day : knownDay();
      const p = intraday(s.code, d), ref = lastClose(s.code, d - 1);
      const orders = G.orders.filter(o => o.status === 'open' && o.code === s.code && o.type === 'limit');
      drawIntraday(cv, p, live ? G.minute : SESSION_MIN, ref, { vol: true, orders });
      $('chartHint').textContent = live ? tr('盤中走勢：依當日真實開盤、最高、最低、收盤價產生', 'Intraday: generated from the day\'s real open, high, low and close') : (G.phase === 'preopen' ? tr('昨日走勢・今天 09:00 開盤', 'Yesterday\'s moves · today opens at 09:00') : tr('今日走勢（已收盤）', 'Today\'s moves (closed)'));
    } else {
      const to = knownDay(), from = this.chartMode === 'day' ? 0 : Math.max(0, to - 62);
      let today = null;
      if (G.phase === 'open') { const p = intraday(s.code, G.day); if (p) { const sl = p.slice(0, Math.floor(G.minute) + 1); today = { d: G.day, o: sl[0], h: Math.max(...sl), l: Math.min(...sl), c: sl[sl.length - 1], v: 0 }; } }
      drawCandles(cv, s, from, to, today, { news });
      $('chartHint').innerHTML = isEN() ? `${T('K線', 'Daily candles')} · gold line: ${T('均線', '20-day moving average')} · ▼ news day` : `${T('K線', '日 K 線')}・金線為 ${T('均線', '20 日均線')}・▼ 為新聞日`;
    }
  },
  renderInfo() {
    const s = STOCK[G.selected], el = $('info');
    if (this.infoMode === 'stats') {
      const d = knownDay(); let hi = -1, lo = 1e9, vsum = 0, vn = 0;
      for (let i = Math.max(0, d - 250); i <= d; i++) if (s.c[i] != null) { hi = Math.max(hi, s.h[i]); lo = Math.min(lo, s.l[i]); }
      for (let i = Math.max(0, d - 19); i <= d; i++) if (s.v[i] != null) { vsum += s.v[i]; vn++; }
      const bw = M.bw[s.code] || {}, f = M.fins[s.code];
      const p = priceNow(s.code), eps4 = bw.pe ? s.c[M.startIdx] / bw.pe : null, pe = eps4 ? p / eps4 : null;
      const yld = bw.yld != null && bw.pe != null ? bw.yld * s.c[M.startIdx] / p : bw.yld;
      const pb = f && f.nav ? p / f.nav : (bw.pb ? bw.pb * p / s.c[M.startIdx] : null);
      const sl_ = tr('／', ' / '), x_ = tr(' 倍', 'x');
      const cells = [
        [T('開盤價', tr('開盤', 'Open')), fmtPx(G.phase === 'open' ? intraday(s.code, G.day)?.[0] : s.o[d]), ''],
        [tr('今日最高／最低', 'Today\'s high / low'), G.phase === 'open' ? (() => { const sl = intraday(s.code, G.day).slice(0, Math.floor(G.minute) + 1); return fmtPx(Math.max(...sl)) + sl_ + fmtPx(Math.min(...sl)); })() : fmtPx(s.h[d]) + sl_ + fmtPx(s.l[d]), ''],
        [T('漲跌停', tr('漲停／跌停', 'Limit up / down')), fmtPx(roundTick(lastClose(s.code, G.phase === 'open' ? G.day - 1 : d) * 1.1, s.etf)) + sl_ + fmtPx(roundTick(lastClose(s.code, G.phase === 'open' ? G.day - 1 : d) * 0.9, s.etf)), tr('以昨收 ±10%', '±10% of previous close')],
        [T('成交量', tr('20 日均量', '20-day avg. volume')), Math.round(vsum / vn).toLocaleString() + tr(' 張', ' lots'), ''],
        [tr('52 週最高／最低', '52-week high / low'), fmtPx(hi) + sl_ + fmtPx(lo), p >= hi * 0.97 ? tr('接近一年高點', 'Near its 1-year high') : p <= lo * 1.03 ? tr('接近一年低點', 'Near its 1-year low') : ''],
        [T('本益比'), pe ? pe.toFixed(1) + x_ : '—', pe ? tr('用近四季 EPS 計算', 'Based on last 4 quarters\' EPS') : s.etf ? tr('ETF 不適用', 'Not applicable to ETFs') : tr('虧損或無資料', 'Loss-making or no data')],
        [T('殖利率'), yld != null ? yld.toFixed(2) + '%' : '—', tr('以最近一年股利', 'Based on last year\'s dividends')],
        [T('股價淨值比'), pb ? pb.toFixed(2) + x_ : '—', f && f.nav ? tr('每股淨值 ', 'Book value/share ') + fmtPx(f.nav) : '']
      ];
      el.innerHTML = `<div class="stats">${cells.map(c => `<div><span>${c[0]}</span><b>${c[1]}</b><small>${c[2]}</small></div>`).join('')}</div>` + this.explainStock(s, pe, yld, pb);
    } else if (this.infoMode === 'fin') {
      if (!G.viewedFin.includes(s.code)) { G.viewedFin.push(s.code); persist(); }
      const f = M.fins[s.code];
      if (!f) { el.innerHTML = `<p class="empty">${tr(`ETF 是一籃子股票，沒有自己的財報。可以到「術語辭典」看看 ${T('ETF')} 是什麼。`, `An ETF is a basket of stocks and has no financial statements of its own. Check the Glossary to see what an ${T('ETF')} is.`)}</p>`; return; }
      const pct = (a, b) => b ? (a / b * 100) : null, gm = pct(f.gp, f.rev), om = pct(f.op, f.rev), nm = pct(f.ni, f.rev), debt = pct(f.tl, f.ta), roe = f.eq ? f.ni / f.eq * 100 * 2 : null;
      const bar = v => v == null ? '' : `<span class="bar" style="width:${Math.max(2, Math.min(100, Math.abs(v)))}px;background:${v < 0 ? 'var(--up)' : 'var(--gold)'}"></span>`;
      const row = (k, v, extra = '') => `<tr><td>${k}</td><td>${v}</td><td>${extra}</td></tr>`;
      const amt = v => v == null || isNaN(v) ? '—' : isEN() ? (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + ' bn' : (v / 100).toLocaleString('zh-TW', { maximumFractionDigits: 1 }) + ' 億';
      const yuan = v => isEN() ? 'NT$' + v : v + ' 元';
      el.innerHTML = `<p class="muted" style="color:var(--muted);font-size:12.5px;margin:0 0 8px">${tr('2026 年上半年（第 1–2 季累計）合併財報・資料來源：臺灣證券交易所公開資料・金額單位：新台幣億元', 'H1 2026 (Q1–Q2 combined) consolidated financials · Source: Taiwan Stock Exchange public data · Amounts in NT$ billions')}</p>
      <table class="fin"><tr><th>${tr('項目', 'Item')}</th><th>${tr('數字', 'Figure')}</th><th>${tr('白話', 'In plain words')}</th></tr>
      ${row(T('營收'), amt(f.rev), f.rev ? tr('上半年賣了這麼多', 'Total sales in the first half') : tr('金融業不用「營收」計算', 'Financial firms don\'t report plain "revenue"'))}
      ${gm != null && f.gp ? row(T('毛利率'), gm.toFixed(1) + '%' + bar(gm), tr(`每賣 100 元，產品本身賺 ${gm.toFixed(0)} 元`, `On every NT$100 of sales, the product itself earns NT$${gm.toFixed(0)}`)) : ''}
      ${om != null && f.op ? row(T('營業利益率'), om.toFixed(1) + '%' + bar(om), tr(`本業每賣 100 元賺 ${om.toFixed(0)} 元`, `The core business earns NT$${om.toFixed(0)} per NT$100 of sales`)) : ''}
      ${row(tr('稅後淨利', 'Net income'), amt(f.ni), f.ni < 0 ? tr('上半年虧損', 'A loss in the first half') : '')}
      ${nm != null && f.rev ? row(T('淨利率'), nm.toFixed(1) + '%' + bar(nm), '') : ''}
      ${row(T('EPS', tr('每股盈餘（EPS）', 'Earnings per share (EPS)')), yuan(f.eps), tr('上半年每股賺的錢', 'Earned per share in the first half'))}
      ${roe != null ? row(T('ROE', tr('ROE（年化）', 'ROE (annualized)')), roe.toFixed(1) + '%' + bar(roe), tr('股東每投入 100 元，一年約賺 ' + roe.toFixed(0) + ' 元', 'Every NT$100 from shareholders earns about NT$' + roe.toFixed(0) + ' a year')) : ''}
      ${debt != null ? row(T('負債比率'), debt.toFixed(1) + '%' + bar(debt), s.sector === '金融' ? tr('金融業靠存款經營，負債比本來就高', 'Financial firms run on deposits, so a high ratio is normal') : debt > 60 ? tr('負債偏高，要留意', 'Debt is on the high side; keep an eye on it') : '') : ''}
      ${f.nav ? row(T('每股淨值'), yuan(fmtPx(f.nav)), '') : ''}
      </table>` + `<div class="explain">${this.finStory(s, f, gm, om, roe, debt)}</div>`;
    } else {
      const list = M.news.filter(n => n.d >= 0 && n.d <= knownDay() && n.codes.includes(s.code)).reverse();
      el.innerHTML = list.length ? list.map(n => this.newsHTML(n)).join('') : `<p class="empty">${tr(`這段期間沒有查證過的 ${esc(s.name)} 個股新聞。到「市場新聞」看看大盤消息。`, `No verified news about ${esc(sName(s))} in this period. See Market News for market-wide headlines.`)}</p>`;
    }
  },
  explainStock(s, pe, yld, pb) {
    const bits = [];
    if (isEN()) {
      if (s.etf) bits.push(`${esc(sName(s))} is an ${T('ETF')}: buying it means buying a whole basket of stocks at once, which suits people who want to spread their risk.`);
      if (pe) bits.push(pe > 40 ? `A P/E of ${pe.toFixed(0)}x is high: the market expects it to earn much more in future, but if profits disappoint, the stock could fall hard.` : pe < 12 ? `A P/E of ${pe.toFixed(0)}x is low: the stock is cheap relative to its earnings, but ask yourself whether this is the peak of the ${T('景氣循環股', 'business cycle')}.` : `A P/E of ${pe.toFixed(0)}x is in the middle range. Remember to compare it with companies in the same industry.`);
      if (yld != null && yld > 5) bits.push(`A ${yld.toFixed(1)}% dividend yield is fairly high, which suits income investors, but check that the company can keep making money.`);
      if (['記憶體', '航運', '傳產原物料'].includes(s.sector)) bits.push(`This is a ${T('景氣循環股')}: its profits swing sharply with the economy, so news and price quotes move it a lot.`);
    } else {
    if (s.etf) bits.push(`${s.name}是一檔 ${T('ETF')}，買它等於一次買進一籃子股票，適合想分散風險的人。`);
    if (pe) bits.push(pe > 40 ? `本益比 ${pe.toFixed(0)} 倍偏高：市場預期它未來會賺更多，但如果獲利不如預期，股價可能跌得比較重。` : pe < 12 ? `本益比 ${pe.toFixed(0)} 倍偏低：股價相對獲利便宜，但要想想是不是${T('景氣循環股', '景氣循環')}的高點。` : `本益比 ${pe.toFixed(0)} 倍，屬於中間範圍。記得跟同產業的公司比較。`);
    if (yld != null && yld > 5) bits.push(`殖利率 ${yld.toFixed(1)}% 不低，適合想領股利的人，但也要確認公司能不能持續賺錢。`);
    if (['記憶體', '航運', '傳產原物料'].includes(s.sector)) bits.push(`這是${T('景氣循環股')}：獲利會跟著景氣大起大落，新聞和報價變化影響很大。`);
    }
    return bits.length ? `<div class="explain">${bits.join('<br>')}</div>` : '';
  },
  finStory(s, f, gm, om, roe, debt) {
    const b = [];
    if (isEN()) {
      if (f.ni < 0) b.push(`The company made a <b>loss</b> in the first half, so its P/E can't be calculated. Check whether the loss is a one-off or the core business is getting worse.`);
      if (gm != null && f.gp) b.push(gm > 50 ? `A ${gm.toFixed(0)}% gross margin is very high: its products have a technology or brand edge, so rivals can't easily win business by undercutting on price.` : gm < 15 ? `A gross margin of only ${gm.toFixed(0)}% means a thin-margin, high-volume business that relies on scale.` : `A ${gm.toFixed(0)}% gross margin is about average.`);
      if (roe != null) b.push(roe > 20 ? `ROE of about ${roe.toFixed(0)}%: shareholders' money is being used very efficiently.` : roe < 5 ? `ROE of about ${roe.toFixed(0)}%: shareholders' money isn't earning much.` : `ROE of about ${roe.toFixed(0)}%.`);
      return b.join('<br>') || 'Look at revenue and profit first, then use gross margin and ROE to judge how well the company makes money.';
    }
    if (f.ni < 0) b.push(`上半年<b>虧損</b>，本益比無法計算。要看虧損是一次性的，還是本業變差。`);
    if (gm != null && f.gp) b.push(gm > 50 ? `毛利率 ${gm.toFixed(0)}% 非常高，代表產品有技術或品牌優勢，別人很難用低價搶生意。` : gm < 15 ? `毛利率只有 ${gm.toFixed(0)}%，屬於薄利多銷的生意，要靠規模賺錢。` : `毛利率 ${gm.toFixed(0)}%，屬於中等水準。`);
    if (roe != null) b.push(roe > 20 ? `ROE 約 ${roe.toFixed(0)}%，股東的錢用得很有效率。` : roe < 5 ? `ROE 約 ${roe.toFixed(0)}%，股東的錢賺得不多。` : `ROE 約 ${roe.toFixed(0)}%。`);
    return b.join('<br>') || '先看營收和獲利，再用毛利率、ROE 判斷公司賺錢的能力。';
  },

  // ----- 下單 -----
  renderTicket(resetPrice) {
    const s = STOCK[G.selected];
    const btn = $('btnOrder'); btn.textContent = isEN() ? (this.side === 'buy' ? 'Buy ' : 'Sell ') + sName(s) : (this.side === 'buy' ? '送出買單' : '送出賣單') + '・' + s.name;
    btn.style.background = this.side === 'buy' ? 'var(--up)' : 'var(--down)'; btn.style.borderColor = btn.style.background;
    $('pxFld').style.display = this.type === 'limit' ? '' : 'none';
    $('qtyLabel').innerHTML = isEN() ? (this.lot === 'board' ? `Lots (1 ${T('張', 'lot')} = 1,000 shares)` : `Shares (${T('零股', 'odd lot')}, 1–999 shares)`) : this.lot === 'board' ? `張數（1 ${T('張')} = 1,000 股）` : `股數（${T('零股')}，1–999 股）`;
    if (resetPrice) $('oPrice').value = priceNow(s.code);
    const q = this.lot === 'board' ? [1, 2, 5, 10] : [10, 50, 100, 500];
    $('quickQty').innerHTML = q.map(v => `<button data-v="${v}">${v}${this.lot === 'board' ? tr(' 張', v === 1 ? ' lot' : ' lots') : tr(' 股', ' sh')}</button>`).join('');
    this.renderEst();
  },
  qtyShares() { const v = Math.floor(+$('oQty').value || 0); return this.lot === 'board' ? v * 1000 : v; },
  renderEst() {
    const s = STOCK[G.selected], px = this.type === 'limit' ? (+$('oPrice').value || 0) : priceNow(s.code), qty = this.qtyShares(), amt = px * qty, odd = this.lot === 'odd';
    const fee = qty ? feeOf(amt, odd) : 0, tax = this.side === 'sell' && qty ? taxOf(amt, s.code) : 0;
    const have = G.pos[s.code]?.qty || 0;
    if (isEN()) $('oEst').innerHTML = `Trade value<b>${money(amt)}</b><br>${T('手續費', 'Fee')} (0.1425%)<b>${money(fee)}</b>` +
      (this.side === 'sell' ? `<br>${T('證交稅', 'Transaction tax')} (${s.etf ? '0.1' : '0.3'}%)<b>${money(tax)}</b><br>Est. proceeds<b>${money(amt - fee - tax)}</b><br>Shares you can sell<b>${availableQty(s.code).toLocaleString()} sh</b>` : `<br>Est. total cost<b>${money(amt + fee)}</b><br>Cash available<b>${money(G.cash - G.reserved)}</b>`) +
      (have && this.side === 'buy' ? `<br>Currently held<b>${have.toLocaleString()} sh</b>` : '');
    else $('oEst').innerHTML = `成交金額<b>${money(amt)}</b><br>${T('手續費')}（0.1425%）<b>${money(fee)}</b>` +
      (this.side === 'sell' ? `<br>${T('證交稅')}（${s.etf ? '0.1' : '0.3'}%）<b>${money(tax)}</b><br>預估入帳<b>${money(amt - fee - tax)}</b><br>可賣庫存<b>${availableQty(s.code).toLocaleString()} 股</b>` : `<br>預估付出<b>${money(amt + fee)}</b><br>可用現金<b>${money(G.cash - G.reserved)}</b>`) +
      (have && this.side === 'buy' ? `<br>目前持有<b>${have.toLocaleString()} 股</b>` : '');
    const closed = G.phase !== 'open';
    $('btnOrder').disabled = closed;
    if (closed && !$('oMsg').dataset.keep) { $('oMsg').className = 'msg'; $('oMsg').textContent = G.phase === 'preopen' ? tr('09:00 開盤後才能下單', 'You can place orders after the 09:00 open') : tr('現在是收盤時間，可以先研究，開盤後再下單', 'The market is closed. Do your research now and trade after the open.'); }
  },
  submit() {
    const s = STOCK[G.selected];
    const r = placeOrder({ code: s.code, side: this.side, type: this.type, price: +$('oPrice').value, qty: this.qtyShares(), odd: this.lot === 'odd' });
    const m = $('oMsg'); m.dataset.keep = '';
    if (!r.ok) { m.className = 'msg err'; m.textContent = r.msg; return; }
    m.className = 'msg ok'; m.textContent = r.order.status === 'filled' ? tr('已成交', 'Filled') : tr('委託已送出，價格到了就會成交', 'Order placed; it fills when the price is reached');
    this.badge('first', '第一筆交易');
    this.renderOrders(); this.renderTop(); this.renderEst(); this.renderChart();
  },
  onFill(o) {
    const s = STOCK[o.code];
    this.toast(isEN() ? `${o.side === 'buy' ? 'Bought' : 'Sold'} ${o.qty.toLocaleString()} sh of ${sName(s)} @ ${fmtPx(o.fillPx)}` + (o.pnl != null ? `, P&L ${money(o.pnl, true)}` : '') : `${o.side === 'buy' ? '買進' : '賣出'}成交：${s.name} ${o.qty.toLocaleString()} 股 @ ${fmtPx(o.fillPx)}` + (o.pnl != null ? `，損益 ${money(o.pnl, true)}` : ''));
    this.ding(o.side);
    this.renderOrders(); this.renderMiniHold(); this.renderTop(); this.renderList(true);
    if (Object.keys(G.pos).length >= 5) this.badge('div', '分散投資：同時持有 5 檔');
    if (new Set(Object.keys(G.pos).map(c => STOCK[c].sector)).size >= 4) this.badge('sector', '跨產業：持有 4 個產業');
    if (o.side === 'sell' && o.pnl < 0) this.badge('stop', '學會認賠');
  },
  renderOrders() {
    const list = G.orders.filter(o => o.day === G.day).slice().reverse();
    $('orderList').innerHTML = list.length ? list.map(o => {
      const s = STOCK[o.code], st = isEN() ? { open: 'Waiting to fill', filled: 'Filled @ ' + fmtPx(o.fillPx), cancelled: 'Cancelled', expired: 'Unfilled at close', rejected: 'Rejected: not enough cash' }[o.status] : { open: '等待成交', filled: '已成交 @ ' + fmtPx(o.fillPx), cancelled: '已取消', expired: '收盤未成交', rejected: '現金不足未成交' }[o.status];
      return `<div class="oitem"><div><b class="${o.side === 'buy' ? 'up' : 'down'}">${o.side === 'buy' ? tr('買', 'Buy') : tr('賣', 'Sell')}</b> ${esc(sName(s))} ${o.qty.toLocaleString()} ${tr('股', 'sh')} ${o.type === 'limit' ? '@ ' + fmtPx(o.price) : tr('市價', 'at market')}<div class="t">${minuteToClock(o.t)}${tr('・', ' · ')}${st}</div></div>${o.status === 'open' ? `<button data-cancel="${o.id}">${tr('取消', 'Cancel')}</button>` : ''}</div>`;
    }).join('') : `<p class="empty">${tr('今天還沒有委託', 'No orders yet today')}</p>`;
  },
  renderMiniHold() {
    const ent = Object.entries(G.pos);
    if (!ent.length) { $('miniHold').innerHTML = `<div class="hb-empty">${tr('我的持股：還沒有持股。買進後，每檔的今日損益與累計損益會顯示在這裡。', 'My holdings: none yet. Once you buy, each stock\'s P&L for today and in total will show here.')}</div>`; return; }
    let mv = 0, unreal = 0, td = 0;
    const cards = ent.map(([c, h]) => {
      const p = priceNow(c), v = p * h.qty, pnl = v - h.cost, t = this.todayPnl(c); mv += v; unreal += pnl; td += t;
      return `<button class="hb-card${c === G.selected ? ' on' : ''}" onclick="UI.select('${c}')">
        <div class="hb-top"><b>${esc(sName(c))}</b><span>${c}</span><span class="hb-px">${fmtPx(p)}</span></div>
        <div class="hb-sub">${h.qty.toLocaleString()} ${tr('股・均價', 'sh · avg')} ${fmtPx(h.cost / h.qty)}</div>
        <div class="hb-row"><span>${tr('今日', 'Today')}</span><b class="${cls(t)}">${money(t, true)}</b></div>
        <div class="hb-row"><span>${tr('累計', 'Total')}</span><b class="${cls(pnl)}">${money(pnl, true)}<em class="${cls(pnl)}">${fmtPct(pnl / h.cost * 100)}</em></b></div>
      </button>`;
    }).join('');
    $('miniHold').innerHTML = `<div class="hb-sum"><div class="hb-title">${tr('我的持股', 'My holdings')}</div><div><span>${tr('市值', 'Value')}</span><b>${money(mv)}</b></div><div><span>${tr('今日', 'Today')}</span><b class="${cls(td)}">${money(td, true)}</b></div><div><span>${tr('累計', 'Total')}</span><b class="${cls(unreal)}">${money(unreal, true)}</b></div></div><div class="hb-cards">${cards}</div>`;
  },
  renderTicker() {
    const items = M.news.filter(n => n.d >= 0 && n.d <= knownDay()).slice(-10).reverse();
    $('ticker').innerHTML = items.map(n => `<span><em>${n.date.slice(5).replace('-', '/')}</em>${esc(newsHead(n))}</span>`).join('') || `<span>${tr('市場新聞會在這裡出現', 'Market news will appear here')}</span>`;
  },

  // ----- 帳戶頁 -----
  // 單一股票的今日損益：現在市值 − (今天開始時的持股 × 昨收 + 今天買進花的錢 − 今天賣出拿回的錢)
  todayPnl(code) {
    if (G.phase === 'research' || G.phase === 'preopen') return 0;
    const h = G.pos[code], qty = h ? h.qty : 0, p = priceNow(code), r = refClose(code);
    let q0 = qty, flow = 0;
    for (const f of G.fills) if (f.day === G.day && f.code === code) {
      const amt = f.fillPx * f.qty;
      if (f.side === 'buy') { q0 -= f.qty; flow += amt + f.fee; } else { q0 += f.qty; flow -= amt - f.fee - taxOf(amt, code); }
    }
    return qty * p - (q0 * r + flow);
  },
  renderPortfolio() {
    const a = totalAssets(), ret = (a / START_CASH - 1) * 100, unreal = Object.entries(G.pos).reduce((s, [c, h]) => s + priceNow(c) * h.qty - h.cost, 0);
    const rows = Object.entries(G.pos).map(([c, h]) => { const p = priceNow(c), v = p * h.qty, pnl = v - h.cost;  return `<tr><td>${esc(sName(c))} <span style="color:var(--muted)">${c}</span></td><td>${h.qty.toLocaleString()}</td><td>${fmtPx(h.cost / h.qty)}</td><td>${fmtPx(p)}</td><td>${money(v)}</td><td class="${cls(pnl)}">${money(pnl, true)}</td><td class="${cls(pnl)}">${fmtPct(pnl / h.cost * 100)}</td><td>${(v / a * 100).toFixed(1)}%</td></tr>`; }).join('');
    const fills = G.fills.slice().reverse().slice(0, 40).map(f => `<tr><td>${M.dates[f.day].slice(5)} ${minuteToClock(f.fillT)}</td><td>${esc(sName(f.code))}</td><td class="${f.side === 'buy' ? 'up' : 'down'}">${f.side === 'buy' ? tr('買進', 'Buy') : tr('賣出', 'Sell')}</td><td>${f.qty.toLocaleString()}</td><td>${fmtPx(f.fillPx)}</td><td>${money(f.fee)}</td><td class="${cls(f.pnl || 0)}">${f.pnl != null ? money(f.pnl, true) : '—'}</td></tr>`).join('');
    if (isEN()) $('portfolioBody').innerHTML = `<div class="kicker">Overview</div><h2>My Account</h2>
      <div class="kpis"><div><span>Total assets</span><b class="${cls(a - START_CASH)}">${money(a)}</b></div><div><span>${T('報酬率')}</span><b class="${cls(ret)}">${fmtPct(ret)}</b></div><div><span>${T('已實現損益')}</span><b class="${cls(G.realized)}">${money(G.realized, true)}</b></div><div><span>${T('未實現損益')}</span><b class="${cls(unreal)}">${money(unreal, true)}</b></div></div>
      <div class="kpis"><div><span>Cash available</span><b>${money(G.cash - G.reserved)}</b></div><div><span>${T('手續費', 'Fees paid')}</span><b>${money(G.fees)}</b></div><div><span>${T('證交稅', 'Transaction tax paid')}</span><b>${money(G.taxes)}</b></div><div><span>${T('最大回撤')}</span><b>${(maxDrawdown(G.equity) * 100).toFixed(1)}%</b></div></div>
      <h3 style="font-family:var(--serifTC);font-style:normal;font-size:22px">Asset history</h3><div class="legend" id="pfLegend"></div><div class="eqbox"><canvas id="pfEq"></canvas></div>
      <h3 style="font-family:var(--serifTC);font-style:normal;font-size:22px">Positions</h3>
      <table class="tbl"><tr><th>Stock</th><th>Shares</th><th>Avg. cost</th><th>Price</th><th>Value</th><th>Total P&amp;L</th><th>Total return</th><th>% of assets</th></tr>${rows || '<tr><td colspan="8" class="empty">No holdings yet</td></tr>'}</table>
      <h3 style="font-family:var(--serifTC);font-style:normal;font-size:22px;margin-top:24px">Trade history</h3>
      <table class="tbl"><tr><th>Time</th><th>Stock</th><th>Side</th><th>Shares</th><th>Price</th><th>Fee</th><th>Realized P&amp;L</th></tr>${fills || '<tr><td colspan="7" class="empty">No trades yet</td></tr>'}</table>`;
    else $('portfolioBody').innerHTML = `<div class="kicker">資產一覽</div><h2>我的帳戶</h2>
      <div class="kpis"><div><span>總資產</span><b class="${cls(a - START_CASH)}">${money(a)}</b></div><div><span>${T('報酬率')}</span><b class="${cls(ret)}">${fmtPct(ret)}</b></div><div><span>${T('已實現損益')}</span><b class="${cls(G.realized)}">${money(G.realized, true)}</b></div><div><span>${T('未實現損益')}</span><b class="${cls(unreal)}">${money(unreal, true)}</b></div></div>
      <div class="kpis"><div><span>可用現金</span><b>${money(G.cash - G.reserved)}</b></div><div><span>累計${T('手續費')}</span><b>${money(G.fees)}</b></div><div><span>累計${T('證交稅')}</span><b>${money(G.taxes)}</b></div><div><span>${T('最大回撤')}</span><b>${(maxDrawdown(G.equity) * 100).toFixed(1)}%</b></div></div>
      <h3 style="font-family:var(--serifTC);font-style:normal;font-size:22px">資產走勢</h3><div class="legend" id="pfLegend"></div><div class="eqbox"><canvas id="pfEq"></canvas></div>
      <h3 style="font-family:var(--serifTC);font-style:normal;font-size:22px">持有部位</h3>
      <table class="tbl"><tr><th>股票</th><th>股數</th><th>平均成本</th><th>現價</th><th>市值</th><th>累計損益</th><th>累計報酬率</th><th>占資產</th></tr>${rows || '<tr><td colspan="8" class="empty">還沒有持股</td></tr>'}</table>
      <h3 style="font-family:var(--serifTC);font-style:normal;font-size:22px;margin-top:24px">成交紀錄</h3>
      <table class="tbl"><tr><th>時間</th><th>股票</th><th>買賣</th><th>股數</th><th>價格</th><th>手續費</th><th>已實現損益</th></tr>${fills || '<tr><td colspan="7" class="empty">還沒有成交</td></tr>'}</table>`;
    this.drawCompare($('pfEq'), $('pfLegend'));
  },
  seriesUpTo() {
    const kd = knownDay();
    const mine = G.equity.filter(e => e.d <= kd);
    const S = [{ name: tr('你', 'You'), color: '#1B2A41', bold: true, pts: mine }];
    BOTS.forEach(b => S.push({ name: isEN() ? b.nameEn + ' (' + b.zhEn.toLowerCase() + ')' : 'AI ' + b.name + '（' + b.zh + '）', color: b.color, pts: b.sim.eq.filter(e => e.d <= kd) }));
    S.push({ name: tr('0050 買進持有', '0050 buy & hold'), color: '#B08D57', dash: true, pts: BENCH.eq.filter(e => e.d <= kd) });
    return S;
  },
  drawCompare(cv, legend) {
    const S = this.seriesUpTo();
    legend.innerHTML = S.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}${tr('　', '&nbsp;&nbsp;')}<b class="${cls(s.pts[s.pts.length - 1].v - START_CASH)}">${fmtPct((s.pts[s.pts.length - 1].v / START_CASH - 1) * 100)}</b></span>`).join('');
    requestAnimationFrame(() => drawEquity(cv, S));
  },

  // ----- 新聞頁 -----
  newsHTML(n) {
    const names = n.codes.filter(c => STOCK[c]).map(c => sName(c)).join(tr('、', ', ')) || tr('大盤', 'Whole market');
    return `<div class="newsitem"><div class="nd">${n.date.replace(/-/g, '/')}${tr('・', ' · ')}${esc(names)}</div><h4>${esc(newsHead(n))}</h4><p>${esc(newsSum(n))}</p>${n.sources.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">${tr('來源', 'Source')} ${i + 1}</a>`).join(tr('　', '&nbsp;&nbsp;&nbsp;'))}</div>`;
  },
  renderNews() {
    const list = M.news.filter(n => n.d >= 0 && n.d <= knownDay()).reverse();
    $('newsBody').innerHTML = tr(`<div class="kicker">真實事件</div><h2>市場新聞</h2><p style="color:var(--muted)">只放真實發生、查證過來源的新聞，依你目前所在的日期顯示，未來的新聞不會先出現。</p>`, `<div class="kicker">Real events</div><h2>Market News</h2><p style="color:var(--muted)">Only real news with verified sources, shown up to the date you are at in the game. Future news never appears early.</p>`) + list.map(n => this.newsHTML(n)).join('');
  },

  // ----- 辭典 -----
  renderGlossary() {
    const cats = [...new Set(Object.values(GLOSSARY).map(g => g.cat))];
    $('glossBody').innerHTML = tr(`<div class="kicker">看不懂就點</div><h2>術語辭典</h2><p style="color:var(--muted)">已讀 ${G.terms.length} / ${Object.keys(GLOSSARY).length} 個。遊戲裡所有<span class="term" data-term="本益比">虛線底的字</span>都可以點開。</p>`, `<div class="kicker">Click whatever you don't understand</div><h2>Glossary</h2><p style="color:var(--muted)">${G.terms.length} of ${Object.keys(GLOSSARY).length} terms read. Every <span class="term" data-term="本益比">word with a dotted underline</span> in the game can be clicked.</p>`) +
      cats.map(c => `<h3 style="font-family:var(--serifTC);font-style:normal;font-size:22px;margin:24px 0 0;color:var(--gold)">${esc(catName(c))}</h3><div class="gloss">${Object.keys(GLOSSARY).filter(k => GLOSSARY[k].cat === c).map(k => { const g = gEntry(k); return `<div class="gcard${G.terms.includes(k) ? ' seen' : ''}"><div class="gc">${esc(catName(c))}</div><h4 class="term" data-term="${k}">${esc(gTerm(k))}</h4><p>${g.def}</p><div class="ex">${tr('例：', 'Example: ')}${g.ex}</div></div>`; }).join('')}</div>`).join('');
  },
  pop(term, el) {
    const g = gEntry(term); if (!g) return;
    if (!G.terms.includes(term)) { G.terms.push(term); persist(); if (G.terms.length >= 20) this.badge('terms', '術語達人：讀了 20 個術語'); }
    const p = $('pop'); p.innerHTML = `<h4>${esc(gTerm(term))}</h4>${g.def}<div class="ex">${tr('例：', 'Example: ')}${g.ex}</div>${g.tip ? `<div class="tp">${g.tip}</div>` : ''}`;
    p.hidden = false; const r = el.getBoundingClientRect();
    const x = Math.min(innerWidth - 360, Math.max(10, r.left)), y = r.bottom + 8 + 220 > innerHeight ? r.top - p.offsetHeight - 8 : r.bottom + 8;
    p.style.left = x + 'px'; p.style.top = Math.max(10, y) + 'px';
  },

  // ----- AI 對手 -----
  renderRivals() {
    const kd = knownDay();
    const card = b => { const eq = b.sim.eq.filter(e => e.d <= kd), last = eq[eq.length - 1], ret = (last.v / START_CASH - 1) * 100; return `<div class="rcard" style="border-top-color:${b.color}"><div class="z">${tr('AI 投資機器人', 'AI trading bot')}</div><h4 style="color:${b.color}">${esc(botName(b))}</h4><div class="z">${esc(botTag(b))}</div><p style="font-size:13px;color:var(--ink2)">${esc(botDesc(b))}</p><b class="${cls(ret)}">${fmtPct(ret)}</b><div style="font-size:12px;color:var(--muted)">${T('最大回撤')} ${(maxDrawdown(eq) * 100).toFixed(1)}%${tr('・持有：', ' · Holding: ')}${esc((last.pos || []).map(c => sName(c)).join(tr('、', ', ')) || tr('現金', 'cash'))}</div></div>`; };
    const mine = G.equity.filter(e => e.d <= kd), myRet = (mine[mine.length - 1].v / START_CASH - 1) * 100;
    const states = isEN() ? ['5-day fall > 5%', '5-day fall 0–5%', '5-day rise 0–5%', '5-day rise > 5%'] : ['5 日跌超過 5%', '5 日跌 0–5%', '5 日漲 0–5%', '5 日漲超過 5%'];
    const qtable = b => `<div class="qgrid">${states.map((st, i) => [0, 1].map(m => { const s = i * 2 + m, v = b.model.Q[s][1] - b.model.Q[s][0]; return `<div class="${v > 0 ? 'pos' : 'neg'}">${st}<br>${m ? tr('均線上', 'above MA') : tr('均線下', 'below MA')}<br><b>${v > 0 ? tr('想持有', 'Hold') : tr('不碰', 'Stay out')}</b></div>`; }).join('')).join('')}</div>`;
    if (isEN()) $('rivalsBody').innerHTML = `<div class="kicker">Head to head</div><h2>AI Rivals</h2>
      <p style="color:var(--ink2);font-family:var(--serifTC);line-height:1.9">Both AI bots use <b>Q-learning (reinforcement learning)</b>, practising again and again on <b>the past 12 months of real stock prices</b> to learn when a stock is worth holding. They learn in exactly the same way; only the <b>reward rule</b> is different: the Aggressive AI looks only at return, while the Steady AI loses points for volatility risk. Each day they decide using information up to <b>the previous close</b> and trade at <b>that day's open</b>, so they never peek at the future.</p>
      <div class="rival"><div class="rcard"><div class="z">Yourself</div><h4>You</h4><div class="z">Your own rules</div><p style="font-size:13px;color:var(--ink2)">Read the news and the financials, then decide for yourself.</p><b class="${cls(myRet)}">${fmtPct(myRet)}</b><div style="font-size:12px;color:var(--muted)">${T('最大回撤')} ${(maxDrawdown(mine) * 100).toFixed(1)}%</div></div>${BOTS.map(card).join('')}</div>
      <div class="legend" id="rvLegend"></div><div class="eqbox"><canvas id="rvEq"></canvas></div>
      <h3 style="font-family:var(--serifTC);font-style:normal;font-size:22px">What did the AIs learn?</h3>
      <p style="color:var(--muted)">Stocks are sorted into 8 situations. Green means the AI learned "this situation is worth holding"; red means "stay out".</p>
      ${BOTS.map(b => `<h4 style="font-family:var(--serifTC);font-style:normal;font-size:19px;color:${b.color};margin:14px 0 0">${esc(botName(b))} · ${esc(botTag(b))}</h4>${qtable(b)}`).join('')}
      <div class="insight">Same data, same learning method: just because the reward rules differ, the two AIs learn different behaviour. An AI only chases the score you give it; deciding the rules is a human responsibility.</div>`;
    else $('rivalsBody').innerHTML = `<div class="kicker">同場較勁</div><h2>AI 對手</h2>
      <p style="color:var(--ink2);font-family:var(--serifTC);line-height:1.9">兩位 AI 機器人都是用 <b>Q-learning（強化學習）</b>，在<b>過去 12 個月的真實股價</b>上反覆練習「什麼情況下該持有股票」。它們學法完全一樣，只差<b>獎勵規則</b>：進取型 只看報酬，穩健型 會把波動風險扣分。每天用<b>前一天收盤</b>的資訊做決定、在<b>當天開盤</b>買賣，所以不會偷看未來。</p>
      <div class="rival"><div class="rcard"><div class="z">你自己</div><h4>你</h4><div class="z">你的規則</div><p style="font-size:13px;color:var(--ink2)">看新聞、讀財報、自己決定。</p><b class="${cls(myRet)}">${fmtPct(myRet)}</b><div style="font-size:12px;color:var(--muted)">${T('最大回撤')} ${(maxDrawdown(mine) * 100).toFixed(1)}%</div></div>${BOTS.map(card).join('')}</div>
      <div class="legend" id="rvLegend"></div><div class="eqbox"><canvas id="rvEq"></canvas></div>
      <h3 style="font-family:var(--serifTC);font-style:normal;font-size:22px">AI 學到了什麼？</h3>
      <p style="color:var(--muted)">把股票分成 8 種情況，綠色是 AI 學到「這種情況值得持有」，紅色是「不要碰」。</p>
      ${BOTS.map(b => `<h4 style="font-family:var(--serifTC);font-style:normal;font-size:19px;color:${b.color};margin:14px 0 0">${b.name}・${b.zh}</h4>${qtable(b)}`).join('')}
      <div class="insight">同樣的資料、同樣的學法，只因為「獎勵規則」不同，兩位 AI 就學出不同的行為。AI 只會追求你給它的分數；規則怎麼訂，是人的責任。</div>`;
    this.drawCompare($('rvEq'), $('rvLegend'));
  },

  // ----- 晨報、收盤、結算 -----
  openSheet(html, fn) { this._sheetFn = fn; $('pop').hidden = true; $('toast').hidden = true; $('sheetBody').innerHTML = html; $('sheet').hidden = false; $('sheetBody').scrollTop = 0; },
  movers(d) {
    const arr = M.stocks.filter(s => s.c[d] != null && s.c[d - 1] != null).map(s => ({ s, p: (s.c[d] / s.c[d - 1] - 1) * 100 })).sort((a, b) => b.p - a.p);
    const row = x => `<div><span>${esc(sName(x.s))}</span><b class="${cls(x.p)}">${fmtPct(x.p)}</b></div>`;
    return `<div class="movers"><div><h5>${tr('漲幅前五', 'Top 5 gainers')}</h5>${arr.slice(0, 5).map(row).join('')}</div><div><h5>${tr('跌幅前五', 'Top 5 losers')}</h5>${arr.slice(-5).reverse().map(row).join('')}</div></div>`;
  },
  sheetWelcome() {
    const fn = () => this.sheetWelcome();
    if (isEN()) return this.openSheet(`<div class="masthead"><div class="mt">Welcome</div><div class="ms"><span>Getting started</span><span>${dateLabel(M.startIdx)}</span><span>After the close</span></div></div>
      <div class="lead">Welcome! You have NT$1,000,000.</div>
      <div class="cols"><p>It is just after the close on <b>${dateLabel(M.startIdx)}</b>. Take your time to research ${M.stocks.length} stocks: a year of daily candles, financial statements and news. When you are ready, press "Start day 1" at the top right.</p>
      <p>Each trading day runs from <b>09:00 to 13:30</b>, compressed into <b>5 minutes</b>. During the session you can pause (space bar) or speed up. Every day's open, high, low and close <b>really happened</b>.</p>
      <p>Just like the real thing, you pay a ${T('手續費', 'brokerage fee')} on every trade and a ${T('證交稅', 'transaction tax')} when you sell. Whole shares trade in ${T('張', 'board lots')} of 1,000; if that is too expensive, buy ${T('零股', 'odd lots')}.</p>
      <p>Two AI trading bots play in the same market with the same amount of money. After ${FUTURE_DAYS} trading days, the final results show who earned more and who took less risk.</p>
      <p class="src">Source: Taiwan Stock Exchange. A classroom exercise, not investment advice.</p></div>
      <div class="actions"><button class="btn primary" onclick="$('sheet').hidden=true">Start researching</button></div>`, fn);
    this.openSheet(`<div class="masthead"><div class="mt">歡迎來到股市練習所</div><div class="ms"><span>新手說明</span><span>${dateLabel(M.startIdx)}</span><span>收盤後</span></div></div>
      <div class="lead">歡迎，你有新台幣一百萬元。</div>
      <div class="cols"><p>現在是 <b>${dateLabel(M.startIdx)}</b> 收盤後。你可以先慢慢研究 ${M.stocks.length} 檔股票：看一年的日 K 線、看財報、讀新聞。準備好了，按右上的「開始第一個交易日」。</p>
      <p>每個交易日從 <b>09:00 到 13:30</b>，壓縮成 <b>5 分鐘</b>。盤中可以暫停（空白鍵）或加速。每天的開盤、最高、最低、收盤價都是<b>真實發生過的</b>。</p>
      <p>下單要付 ${T('手續費')}，賣出要繳 ${T('證交稅')}，跟真的一樣。整股以 ${T('張')} 為單位，錢不夠可以買 ${T('零股')}。</p>
      <p>兩位 AI 投資機器人也會用同樣的錢跟你同場。${FUTURE_DAYS} 個交易日後結算，看看誰的報酬好、誰的風險小。</p>
      <p class="src">資料來源：臺灣證券交易所。教學練習，不構成投資建議。</p></div>
      <div class="actions"><button class="btn primary" onclick="$('sheet').hidden=true">開始研究</button></div>`, fn);
  },
  sheetMorning() {
    const d = G.day, kd = d - 1, news = M.news.filter(n => n.d === d || (n.d > kd - 0 && n.d < d));
    const prev = M.news.filter(n => n.d === kd);
    const s0 = STOCK['0050'], mk = (s0.c[kd] / s0.c[kd - 1] - 1) * 100;
    const no = G.day - M.startIdx, fn = () => this.sheetMorning();
    if (isEN()) return this.openSheet(`<div class="masthead"><div class="mt">Morning Paper</div><div class="ms"><span>Day ${no} of ${FUTURE_DAYS}</span><span>${dateLabel(d)}</span><span>Morning edition</span></div></div>
      <div class="lead">${news.length ? esc(newsHead(news[0])) : prev.length ? 'Yesterday\'s focus: ' + esc(newsHead(prev[0])) : `Taiwan 50 ${mk >= 0 ? 'rose' : 'fell'} ${Math.abs(mk).toFixed(2)}% yesterday`}</div>
      <div class="cols">${[...news, ...prev].slice(0, 4).map(n => `<h5>${esc(newsHead(n))}</h5><p>${esc(newsSum(n))} <span class="src">${n.date}</span></p>`).join('') || '<p>No major verified news today. Look at yesterday\'s moves and think about your plan for today.</p>'}
      <p><b>Yesterday's market</b>: Taiwan 50 (0050) closed at ${fmtPx(s0.c[kd])}, <span class="${cls(mk)}">${fmtPct(mk)}</span>.</p></div>
      ${this.movers(kd)}
      <div class="actions"><button class="btn ghost" onclick="$('sheet').hidden=true">Look around before the open</button><button class="btn primary" onclick="UI.sessionButton()">Open at 09:00</button></div>`, fn);
    this.openSheet(`<div class="masthead"><div class="mt">晨報</div><div class="ms"><span>第 ${no} / ${FUTURE_DAYS} 個交易日</span><span>${dateLabel(d)}</span><span>晨間版</span></div></div>
      <div class="lead">${news.length ? esc(news[0].headline) : prev.length ? '昨日焦點：' + esc(prev[0].headline) : `昨日台灣 50 ${mk >= 0 ? '上漲' : '下跌'} ${Math.abs(mk).toFixed(2)}%`}</div>
      <div class="cols">${[...news, ...prev].slice(0, 4).map(n => `<h5>${esc(n.headline)}</h5><p>${esc(n.summary)} <span class="src">${n.date}</span></p>`).join('') || '<p>今天沒有特別查證過的重大新聞。先看看昨天的漲跌，想想今天的策略。</p>'}
      <p><b>昨日行情</b>：台灣 50（0050）收 ${fmtPx(s0.c[kd])}，<span class="${cls(mk)}">${fmtPct(mk)}</span>。</p></div>
      ${this.movers(kd)}
      <div class="actions"><button class="btn ghost" onclick="$('sheet').hidden=true">先看盤前資料</button><button class="btn primary" onclick="UI.sessionButton()">09:00 開盤</button></div>`, fn);
  },
  onClose() {
    this.renderAll(); this.chime(true);
    setTimeout(() => this.sheetClose(), 400);
  },
  sheetClose() {
    const d = G.day, a = totalAssets(), prev = G.equity[G.equity.length - 2]?.v ?? START_CASH, dp = a - prev;
    const fills = G.fills.filter(f => f.day === d);
    let qz = this._todayQuiz;
    if (!qz || qz.day !== d) {
      const pool = QUIZ.map((q, i) => i).filter(i => !G.quiz.asked.includes(i));
      const qi = (pool.length ? pool : QUIZ.map((q, i) => i))[Math.floor(rng(hash('q' + d))() * (pool.length || QUIZ.length))];
      const q = QUIZ[qi], order = [0, 1, 2, 3].sort(() => rng(hash('o' + d + qi))() - .5);
      qz = this._todayQuiz = { day: d, qi, order, done: false };
    }
    const q = QUIZ[qz.qi], qt = quizText(qz.qi), fn = () => this.sheetClose();
    if (isEN()) this.openSheet(`<div class="masthead"><div class="mt">Closing Report</div><div class="ms"><span>Day ${d - M.startIdx} of ${FUTURE_DAYS}</span><span>${dateLabel(d)}</span><span>Closing edition</span></div></div>
      <div class="lead">Today's P&amp;L <span class="${cls(dp)}">${money(dp, true)}</span>, total assets ${money(a)}</div>
      <div class="cols"><p>Total return so far: <b class="${cls(a - START_CASH)}">${fmtPct((a / START_CASH - 1) * 100)}</b>. You made ${fills.length} ${fills.length === 1 ? 'trade' : 'trades'} today and paid ${money(fills.reduce((s, f) => s + f.fee, 0))} in fees.</p>
      ${M.news.filter(n => n.d === d).map(n => `<h5>${esc(newsHead(n))}</h5><p>${esc(newsSum(n))}</p>`).join('')}</div>
      ${this.movers(d)}
      <div class="quiz" id="quizBox"><h5>Today's quiz</h5><div class="qq">${esc(qt.q)}</div><div class="opts">${qz.order.map(i => `<button data-i="${i}">${esc(qt.o[i])}</button>`).join('')}</div><div class="why" id="quizWhy"></div></div>
      <div class="actions"><button class="btn ghost" onclick="$('sheet').hidden=true">Review today's market</button><button class="btn primary" onclick="UI.sessionButton()">${isLastDay() ? 'Final results' : 'Next trading day'}</button></div>`, fn);
    else this.openSheet(`<div class="masthead"><div class="mt">收盤報</div><div class="ms"><span>第 ${d - M.startIdx} / ${FUTURE_DAYS} 個交易日</span><span>${dateLabel(d)}</span><span>收盤版</span></div></div>
      <div class="lead">今日損益 <span class="${cls(dp)}">${money(dp, true)}</span>，總資產 ${money(a)}</div>
      <div class="cols"><p>累計報酬 <b class="${cls(a - START_CASH)}">${fmtPct((a / START_CASH - 1) * 100)}</b>。今天成交 ${fills.length} 筆，付了 ${money(fills.reduce((s, f) => s + f.fee, 0))} 手續費。</p>
      ${M.news.filter(n => n.d === d).map(n => `<h5>${esc(n.headline)}</h5><p>${esc(n.summary)}</p>`).join('')}</div>
      ${this.movers(d)}
      <div class="quiz" id="quizBox"><h5>今日小測驗</h5><div class="qq">${esc(qt.q)}</div><div class="opts">${qz.order.map(i => `<button data-i="${i}">${esc(qt.o[i])}</button>`).join('')}</div><div class="why" id="quizWhy"></div></div>
      <div class="actions"><button class="btn ghost" onclick="$('sheet').hidden=true">看今天的盤</button><button class="btn primary" onclick="UI.sessionButton()">${isLastDay() ? '看最終結算' : '下一個交易日'}</button></div>`, fn);
    const box = $('quizBox');
    const showAnswer = pick => {
      const right = pick === q.a;
      [...box.querySelectorAll('button')].forEach(x => { if (+x.dataset.i === q.a) x.classList.add('right'); else if (+x.dataset.i === pick) x.classList.add('wrong'); });
      $('quizWhy').innerHTML = (right ? tr('<b>答對了！</b> ', '<b>Correct!</b> ') : tr('<b>差一點。</b> ', '<b>Not quite.</b> ')) + gEntry(q.t).def + ` ${T(q.t, tr('看更多', 'Learn more'))}`;
      return right;
    };
    if (qz.done && qz.pick != null) showAnswer(qz.pick);
    box.onclick = e => {
      const b = e.target.closest('button[data-i]'); if (!b || qz.done) return; qz.done = true; qz.pick = +b.dataset.i;
      const right = showAnswer(qz.pick); G.quiz.total++; if (right) G.quiz.right++; G.quiz.asked.push(qz.qi); persist();
      if (G.quiz.right >= 10) this.badge('quiz', '小測驗答對 10 題');
    };
  },
  sheetFinal() {
    G.phase = 'ended'; persist(); this.renderTop();
    const a = totalAssets(), ret = (a / START_CASH - 1) * 100, mdd = maxDrawdown(G.equity) * 100;
    const bench = BENCH.eq[BENCH.eq.length - 1].v, bret = (bench / START_CASH - 1) * 100;
    const grade = ret - bret > 3 ? 'A' : ret - bret > 0 ? 'B' : ret > 0 ? 'C' : 'D';
    const trades = G.fills.length, sectors = new Set(G.fills.map(f => STOCK[f.code].sector)).size;
    const ins = [], fn = () => this.sheetFinal();
    if (isEN()) {
      ins.push(`Your return was ${fmtPct(ret)}; buying 0050 and simply holding it over the same period returned ${fmtPct(bret)}. ${ret >= bret ? 'You beat the market!' : 'Your own stock picks did not beat the market. That is very common in the real world too, which is why many people choose ETFs.'}`);
      ins.push(`You made ${trades} ${trades === 1 ? 'trade' : 'trades'}, paying ${money(G.fees + G.taxes)} in fees and transaction tax combined, ${((G.fees + G.taxes) / START_CASH * 100).toFixed(2)}% of your starting money. ${trades > 40 ? 'That is a lot of trading; costs slowly eat into your profits.' : ''}`);
      ins.push(`Max drawdown ${mdd.toFixed(1)}%. ${mdd > 10 ? 'At one point your assets fell quite far from their peak; think about whether diversification or a stop-loss could reduce that.' : 'You kept the swings well under control.'}`);
      BOTS.forEach(b => { const e = b.sim.eq[b.sim.eq.length - 1].v; ins.push(`${b.nameEn} (${b.zhEn.toLowerCase()}): return ${fmtPct((e / START_CASH - 1) * 100)}, max drawdown ${(maxDrawdown(b.sim.eq) * 100).toFixed(1)}%.`); });
    } else {
    ins.push(`你的報酬 ${fmtPct(ret)}，同期間買進 0050 放著不動是 ${fmtPct(bret)}。${ret >= bret ? '你贏過大盤！' : '自己選股沒有贏過大盤，這在真實世界也很常見，所以很多人選擇 ETF。'}`);
    ins.push(`你一共成交 ${trades} 筆，手續費與證交稅合計 ${money(G.fees + G.taxes)}，占本金 ${((G.fees + G.taxes) / START_CASH * 100).toFixed(2)}%。${trades > 40 ? '進出很頻繁，交易成本會慢慢吃掉獲利。' : ''}`);
    ins.push(`最大回撤 ${mdd.toFixed(1)}%。${mdd > 10 ? '資產曾經從高點跌了不少，想想能不能用分散投資或停損降低。' : '波動控制得不錯。'}`);
    BOTS.forEach(b => { const e = b.sim.eq[b.sim.eq.length - 1].v; ins.push(`AI ${b.name}（${b.zh}）：報酬 ${fmtPct((e / START_CASH - 1) * 100)}，最大回撤 ${(maxDrawdown(b.sim.eq) * 100).toFixed(1)}%。`); });
    }
    const badges = G.badges.map(b => `<span>${esc(badgeLabel(b))}</span>`).join('') || `<span>${tr('下次試著收集成就', 'Try collecting some achievements next time')}</span>`;
    if (isEN()) this.openSheet(`<div class="masthead"><div class="mt">Final Results</div><div class="ms"><span>Settlement</span><span>${dateLabel(M.startIdx + 1)} – ${dateLabel(M.dates.length - 1)}</span><span>${FUTURE_DAYS} trading days</span></div></div>
      <div class="grade">${grade}</div>
      <div class="kpis"><div><span>Final assets</span><b class="${cls(a - START_CASH)}">${money(a)}</b></div><div><span>${T('報酬率')}</span><b class="${cls(ret)}">${fmtPct(ret)}</b></div><div><span>0050, same period</span><b class="${cls(bret)}">${fmtPct(bret)}</b></div><div><span>${T('最大回撤')}</span><b>${mdd.toFixed(1)}%</b></div></div>
      <div class="legend" id="fnLegend"></div><div class="eqbox"><canvas id="fnEq"></canvas></div>
      ${ins.map(x => `<div class="insight">${x}</div>`).join('')}
      <p style="text-align:center;color:var(--muted)">Quiz ${G.quiz.right} / ${G.quiz.total} · ${G.terms.length} terms read · ${G.viewedFin.length} financial statements viewed · traded in ${sectors} ${sectors === 1 ? 'sector' : 'sectors'}</p>
      <div class="badges">${badges}</div>
      <div class="actions"><button class="btn ghost" onclick="$('sheet').hidden=true">Look back</button><button class="btn primary" onclick="localStorage.removeItem('${SAVE_KEY}');location.reload()">Play again</button></div>`, fn);
    else this.openSheet(`<div class="masthead"><div class="mt">最終結算</div><div class="ms"><span>最終結算</span><span>${dateLabel(M.startIdx + 1)} – ${dateLabel(M.dates.length - 1)}</span><span>${FUTURE_DAYS} 個交易日</span></div></div>
      <div class="grade">${grade}</div>
      <div class="kpis"><div><span>最終資產</span><b class="${cls(a - START_CASH)}">${money(a)}</b></div><div><span>${T('報酬率')}</span><b class="${cls(ret)}">${fmtPct(ret)}</b></div><div><span>0050 同期</span><b class="${cls(bret)}">${fmtPct(bret)}</b></div><div><span>${T('最大回撤')}</span><b>${mdd.toFixed(1)}%</b></div></div>
      <div class="legend" id="fnLegend"></div><div class="eqbox"><canvas id="fnEq"></canvas></div>
      ${ins.map(x => `<div class="insight">${x}</div>`).join('')}
      <p style="text-align:center;color:var(--muted)">小測驗 ${G.quiz.right} / ${G.quiz.total}・讀過 ${G.terms.length} 個術語・看過 ${G.viewedFin.length} 份財報・交易 ${sectors} 個產業</p>
      <div class="badges">${badges}</div>
      <div class="actions"><button class="btn ghost" onclick="$('sheet').hidden=true">回去看看</button><button class="btn primary" onclick="localStorage.removeItem('${SAVE_KEY}');location.reload()">再玩一次</button></div>`, fn);
    this.drawCompare($('fnEq'), $('fnLegend'));
  },

  // ----- 小工具 -----
  badge(id, label) { if (G.badges.find(b => b.id === id)) return; G.badges.push({ id, label }); persist(); this.toast(tr('成就解鎖：', 'Achievement unlocked: ') + badgeLabel({ id, label })); },
  toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(el._h); el._h = setTimeout(() => el.hidden = true, 2600); },
  audio(f, d, v = .05, type = 'sine') { try { this.ac = this.ac || new (window.AudioContext || window.webkitAudioContext)(); const o = this.ac.createOscillator(), g = this.ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(this.ac.destination); o.start(); g.gain.exponentialRampToValueAtTime(.0001, this.ac.currentTime + d); o.stop(this.ac.currentTime + d); } catch (e) { } },
  chime(close) { const n = close ? [784, 659, 523] : [523, 659, 784]; n.forEach((f, i) => setTimeout(() => this.audio(f, .5, .05, 'triangle'), i * 160)); },
  ding(side) { this.audio(side === 'buy' ? 880 : 660, .18, .05); }
};
UI.init();
