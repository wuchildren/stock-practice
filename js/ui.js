// ===== 介面 =====
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cls = x => x > 1e-9 ? 'up' : x < -1e-9 ? 'down' : 'flat';
const arrow = x => x > 1e-9 ? '▲' : x < -1e-9 ? '▼' : '—';
const T = (term, label) => `<span class="term" data-term="${esc(term)}">${esc(label || term)}</span>`;
const SECTORS = ['全部', '持有', ...[...new Set(M.stocks.map(s => s.sector))]];
M.news.forEach(n => n.d = M.dates.indexOf(n.date));

const UI = {
  view: 'trade', chartMode: 'intra', infoMode: 'stats', side: 'buy', lot: 'board', type: 'limit', sector: '全部', q: '',
  init() {
    $('coverDate').textContent = dateLabel(M.startIdx).replace(/（.）/, '') + ' 收盤後';
    $('coverDays').textContent = FUTURE_DAYS; $('coverStocks').textContent = M.stocks.length;
    document.querySelector('.cover-notes div:nth-child(3) b').textContent = Object.keys(GLOSSARY).length;
    if (G && G.phase !== 'ended') $('btnContinue').hidden = false;
    $('btnNew').onclick = () => { G = newGame(); persist(); this.enter(true); };
    $('btnContinue').onclick = () => this.enter(false);
    // 分頁
    $('tabs').onclick = e => { const b = e.target.closest('button'); if (!b) return; this.show(b.dataset.v); };
    $('speedCtl').onclick = e => { const b = e.target.closest('button'); if (!b) return; const s = +b.dataset.s; if (s === 0) G.paused = !G.paused; else { G.speed = s; G.paused = false; } this.renderSpeed(); persist(); };
    $('btnSession').onclick = () => this.sessionButton();
    $('search').oninput = e => { this.q = e.target.value.trim(); this.renderList(true); };
    $('sectorChips').innerHTML = SECTORS.map(s => `<button data-s="${s}" class="${s === '全部' ? 'on' : ''}">${s}</button>`).join('');
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
    $('tbDate').textContent = ph === 'research' ? dateLabel(G.day) + '・收盤後' : dateLabel(G.day);
    const label = { research: '研究期', preopen: '盤前', open: '交易中', closed: '已收盤', ended: '結算' }[ph];
    $('tbPhase').textContent = label; $('tbPhase').className = 'pill' + (ph === 'open' ? ' live' : '');
    $('tbClock').textContent = ph === 'open' ? minuteToClock(G.minute) : ph === 'preopen' ? '08:45' : '13:30';
    $('tbProgress').style.width = (ph === 'open' ? G.minute / SESSION_MIN * 100 : ph === 'closed' || ph === 'research' ? 100 : 0) + '%';
    $('speedCtl').style.visibility = ph === 'open' ? 'visible' : 'hidden';
    const btn = $('btnSession');
    btn.textContent = { research: '開始第一個交易日', preopen: '開盤（09:00）', open: '快轉到收盤', closed: isLastDay() ? '看最終結算' : '下一個交易日', ended: '看結算' }[ph];
    const a = totalAssets(), prevEq = G.equity.length ? G.equity[G.equity.length - (ph === 'closed' ? 2 : 1)]?.v ?? START_CASH : START_CASH;
    // 總損益＝所有持有部位的損益加總（現在市值 − 買進成本）
    let tot = 0, cost = 0; for (const [c, h] of Object.entries(G.pos)) { tot += priceNow(c) * h.qty - h.cost; cost += h.cost; }
    $('tbAssets').textContent = money(a); $('tbAssets').className = cls(a - START_CASH);
    $('tbToday').textContent = money(tot, true) + (cost ? '（' + fmtPct(tot / cost * 100) + '）' : ''); $('tbToday').className = cls(tot);
    $('tbCash').textContent = money(G.cash - G.reserved);
  },
  renderSpeed() { [...$('speedCtl').children].forEach(b => b.classList.toggle('on', +b.dataset.s === 0 ? !!G.paused : (!G.paused && +b.dataset.s === G.speed))); },
  sessionButton() {
    const ph = G.phase;
    if (ph === 'research') { nextDay(); this.renderAll(); this.sheetMorning(); }
    else if (ph === 'preopen') { openDay(); $('sheet').hidden = true; this.renderAll(); this.toast('09:00 開盤！'); this.chime(); }
    else if (ph === 'open') { G.minute = SESSION_MIN - 0.001; step(1); }
    else if (ph === 'closed') { if (isLastDay()) { G.phase = 'ended'; persist(); this.sheetFinal(); } else { nextDay(); this.renderAll(); this.sheetMorning(); } }
    else this.sheetFinal();
  },

  // ----- 市場清單 -----
  listRows() {
    let arr = M.stocks;
    if (this.sector === '持有') arr = arr.filter(s => G.pos[s.code]);
    else if (this.sector !== '全部') arr = arr.filter(s => s.sector === this.sector);
    if (this.q) arr = arr.filter(s => s.code.includes(this.q) || s.name.includes(this.q));
    return arr;
  },
  renderList(full) {
    const rows = this.listRows();
    if (full || !this._rowsKey || this._rowsKey !== rows.map(s => s.code).join()) {
      this._rowsKey = rows.map(s => s.code).join();
      let html = '', lastSec = '';
      for (const s of rows) {
        if (this.sector === '全部' && s.sector !== lastSec) { html += `<div class="sec-h">${esc(s.sector)}</div>`; lastSec = s.sector; }
        html += `<div class="mrow${s.code === G.selected ? ' sel' : ''}" data-c="${s.code}"><div><div class="nm">${esc(s.name)}${G.pos[s.code] ? '<span class="held">持有</span>' : ''}</div><div class="cd">${s.code}</div></div><canvas></canvas><div><div class="px"></div><div class="pc"></div></div></div>`;
      }
      $('mlist').innerHTML = html || '<p class="empty" style="padding:14px">沒有符合的股票</p>';
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
    $('sName').textContent = s.name; $('sSector').textContent = s.sector;
    $('sPrice').textContent = fmtPx(ch.p); $('sPrice').className = 'big ' + cls(ch.chg);
    $('sChg').innerHTML = `<span class="${cls(ch.chg)}">${arrow(ch.chg)} ${fmtPx(Math.abs(ch.chg))}（${fmtPct(ch.pct)}）</span>`;
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
      $('chartHint').textContent = live ? '盤中走勢：依當日真實開盤、最高、最低、收盤價產生' : (G.phase === 'preopen' ? '昨日走勢・今天 09:00 開盤' : '今日走勢（已收盤）');
    } else {
      const to = knownDay(), from = this.chartMode === 'day' ? 0 : Math.max(0, to - 62);
      let today = null;
      if (G.phase === 'open') { const p = intraday(s.code, G.day); if (p) { const sl = p.slice(0, Math.floor(G.minute) + 1); today = { d: G.day, o: sl[0], h: Math.max(...sl), l: Math.min(...sl), c: sl[sl.length - 1], v: 0 }; } }
      drawCandles(cv, s, from, to, today, { news });
      $('chartHint').innerHTML = `${T('K線', '日 K 線')}・金線為 ${T('均線', '20 日均線')}・▼ 為新聞日`;
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
      const cells = [
        [T('開盤價', '開盤'), fmtPx(G.phase === 'open' ? intraday(s.code, G.day)?.[0] : s.o[d]), ''],
        ['今日最高／最低', G.phase === 'open' ? (() => { const sl = intraday(s.code, G.day).slice(0, Math.floor(G.minute) + 1); return fmtPx(Math.max(...sl)) + '／' + fmtPx(Math.min(...sl)); })() : fmtPx(s.h[d]) + '／' + fmtPx(s.l[d]), ''],
        [T('漲跌停', '漲停／跌停'), fmtPx(roundTick(lastClose(s.code, G.phase === 'open' ? G.day - 1 : d) * 1.1, s.etf)) + '／' + fmtPx(roundTick(lastClose(s.code, G.phase === 'open' ? G.day - 1 : d) * 0.9, s.etf)), '以昨收 ±10%'],
        [T('成交量', '20 日均量'), Math.round(vsum / vn).toLocaleString() + ' 張', ''],
        ['52 週最高／最低', fmtPx(hi) + '／' + fmtPx(lo), p >= hi * 0.97 ? '接近一年高點' : p <= lo * 1.03 ? '接近一年低點' : ''],
        [T('本益比'), pe ? pe.toFixed(1) + ' 倍' : '—', pe ? '用近四季 EPS 計算' : s.etf ? 'ETF 不適用' : '虧損或無資料'],
        [T('殖利率'), yld != null ? yld.toFixed(2) + '%' : '—', '以最近一年股利'],
        [T('股價淨值比'), pb ? pb.toFixed(2) + ' 倍' : '—', f && f.nav ? '每股淨值 ' + fmtPx(f.nav) : '']
      ];
      el.innerHTML = `<div class="stats">${cells.map(c => `<div><span>${c[0]}</span><b>${c[1]}</b><small>${c[2]}</small></div>`).join('')}</div>` + this.explainStock(s, pe, yld, pb);
    } else if (this.infoMode === 'fin') {
      if (!G.viewedFin.includes(s.code)) { G.viewedFin.push(s.code); persist(); }
      const f = M.fins[s.code];
      if (!f) { el.innerHTML = `<p class="empty">ETF 是一籃子股票，沒有自己的財報。可以到「術語辭典」看看 ${T('ETF')} 是什麼。</p>`; return; }
      const pct = (a, b) => b ? (a / b * 100) : null, gm = pct(f.gp, f.rev), om = pct(f.op, f.rev), nm = pct(f.ni, f.rev), debt = pct(f.tl, f.ta), roe = f.eq ? f.ni / f.eq * 100 * 2 : null;
      const bar = v => v == null ? '' : `<span class="bar" style="width:${Math.max(2, Math.min(100, Math.abs(v)))}px;background:${v < 0 ? 'var(--up)' : 'var(--gold)'}"></span>`;
      const row = (k, v, extra = '') => `<tr><td>${k}</td><td>${v}</td><td>${extra}</td></tr>`;
      const amt = v => v == null || isNaN(v) ? '—' : (v / 100).toLocaleString('zh-TW', { maximumFractionDigits: 1 }) + ' 億';
      el.innerHTML = `<p class="muted" style="color:var(--muted);font-size:12.5px;margin:0 0 8px">2026 年上半年（第 1–2 季累計）合併財報・資料來源：臺灣證券交易所公開資料・金額單位：新台幣億元</p>
      <table class="fin"><tr><th>項目</th><th>數字</th><th>白話</th></tr>
      ${row(T('營收'), amt(f.rev), f.rev ? '上半年賣了這麼多' : '金融業不用「營收」計算')}
      ${gm != null && f.gp ? row(T('毛利率'), gm.toFixed(1) + '%' + bar(gm), `每賣 100 元，產品本身賺 ${gm.toFixed(0)} 元`) : ''}
      ${om != null && f.op ? row(T('營業利益率'), om.toFixed(1) + '%' + bar(om), `本業每賣 100 元賺 ${om.toFixed(0)} 元`) : ''}
      ${row('稅後淨利', amt(f.ni), f.ni < 0 ? '上半年虧損' : '')}
      ${nm != null && f.rev ? row(T('淨利率'), nm.toFixed(1) + '%' + bar(nm), '') : ''}
      ${row(T('EPS', '每股盈餘（EPS）'), f.eps + ' 元', '上半年每股賺的錢')}
      ${roe != null ? row(T('ROE', 'ROE（年化）'), roe.toFixed(1) + '%' + bar(roe), '股東每投入 100 元，一年約賺 ' + roe.toFixed(0) + ' 元') : ''}
      ${debt != null ? row(T('負債比率'), debt.toFixed(1) + '%' + bar(debt), s.sector === '金融' ? '金融業靠存款經營，負債比本來就高' : debt > 60 ? '負債偏高，要留意' : '') : ''}
      ${f.nav ? row(T('每股淨值'), fmtPx(f.nav) + ' 元', '') : ''}
      </table>` + `<div class="explain">${this.finStory(s, f, gm, om, roe, debt)}</div>`;
    } else {
      const list = M.news.filter(n => n.d >= 0 && n.d <= knownDay() && n.codes.includes(s.code)).reverse();
      el.innerHTML = list.length ? list.map(n => this.newsHTML(n)).join('') : `<p class="empty">這段期間沒有查證過的 ${esc(s.name)} 個股新聞。到「市場新聞」看看大盤消息。</p>`;
    }
  },
  explainStock(s, pe, yld, pb) {
    const bits = [];
    if (s.etf) bits.push(`${s.name}是一檔 ${T('ETF')}，買它等於一次買進一籃子股票，適合想分散風險的人。`);
    if (pe) bits.push(pe > 40 ? `本益比 ${pe.toFixed(0)} 倍偏高：市場預期它未來會賺更多，但如果獲利不如預期，股價可能跌得比較重。` : pe < 12 ? `本益比 ${pe.toFixed(0)} 倍偏低：股價相對獲利便宜，但要想想是不是${T('景氣循環股', '景氣循環')}的高點。` : `本益比 ${pe.toFixed(0)} 倍，屬於中間範圍。記得跟同產業的公司比較。`);
    if (yld != null && yld > 5) bits.push(`殖利率 ${yld.toFixed(1)}% 不低，適合想領股利的人，但也要確認公司能不能持續賺錢。`);
    if (['記憶體', '航運', '傳產原物料'].includes(s.sector)) bits.push(`這是${T('景氣循環股')}：獲利會跟著景氣大起大落，新聞和報價變化影響很大。`);
    return bits.length ? `<div class="explain">${bits.join('<br>')}</div>` : '';
  },
  finStory(s, f, gm, om, roe, debt) {
    const b = [];
    if (f.ni < 0) b.push(`上半年<b>虧損</b>，本益比無法計算。要看虧損是一次性的，還是本業變差。`);
    if (gm != null && f.gp) b.push(gm > 50 ? `毛利率 ${gm.toFixed(0)}% 非常高，代表產品有技術或品牌優勢，別人很難用低價搶生意。` : gm < 15 ? `毛利率只有 ${gm.toFixed(0)}%，屬於薄利多銷的生意，要靠規模賺錢。` : `毛利率 ${gm.toFixed(0)}%，屬於中等水準。`);
    if (roe != null) b.push(roe > 20 ? `ROE 約 ${roe.toFixed(0)}%，股東的錢用得很有效率。` : roe < 5 ? `ROE 約 ${roe.toFixed(0)}%，股東的錢賺得不多。` : `ROE 約 ${roe.toFixed(0)}%。`);
    return b.join('<br>') || '先看營收和獲利，再用毛利率、ROE 判斷公司賺錢的能力。';
  },

  // ----- 下單 -----
  renderTicket(resetPrice) {
    const s = STOCK[G.selected];
    const btn = $('btnOrder'); btn.textContent = (this.side === 'buy' ? '送出買單' : '送出賣單') + '・' + s.name;
    btn.style.background = this.side === 'buy' ? 'var(--up)' : 'var(--down)'; btn.style.borderColor = btn.style.background;
    $('pxFld').style.display = this.type === 'limit' ? '' : 'none';
    $('qtyLabel').innerHTML = this.lot === 'board' ? `張數（1 ${T('張')} = 1,000 股）` : `股數（${T('零股')}，1–999 股）`;
    if (resetPrice) $('oPrice').value = priceNow(s.code);
    const q = this.lot === 'board' ? [1, 2, 5, 10] : [10, 50, 100, 500];
    $('quickQty').innerHTML = q.map(v => `<button data-v="${v}">${v}${this.lot === 'board' ? ' 張' : ' 股'}</button>`).join('');
    this.renderEst();
  },
  qtyShares() { const v = Math.floor(+$('oQty').value || 0); return this.lot === 'board' ? v * 1000 : v; },
  renderEst() {
    const s = STOCK[G.selected], px = this.type === 'limit' ? (+$('oPrice').value || 0) : priceNow(s.code), qty = this.qtyShares(), amt = px * qty, odd = this.lot === 'odd';
    const fee = qty ? feeOf(amt, odd) : 0, tax = this.side === 'sell' && qty ? taxOf(amt, s.code) : 0;
    const have = G.pos[s.code]?.qty || 0;
    $('oEst').innerHTML = `成交金額<b>${money(amt)}</b><br>${T('手續費')}（0.1425%）<b>${money(fee)}</b>` +
      (this.side === 'sell' ? `<br>${T('證交稅')}（${s.etf ? '0.1' : '0.3'}%）<b>${money(tax)}</b><br>預估入帳<b>${money(amt - fee - tax)}</b><br>可賣庫存<b>${availableQty(s.code).toLocaleString()} 股</b>` : `<br>預估付出<b>${money(amt + fee)}</b><br>可用現金<b>${money(G.cash - G.reserved)}</b>`) +
      (have && this.side === 'buy' ? `<br>目前持有<b>${have.toLocaleString()} 股</b>` : '');
    const closed = G.phase !== 'open';
    $('btnOrder').disabled = closed;
    if (closed && !$('oMsg').dataset.keep) { $('oMsg').className = 'msg'; $('oMsg').textContent = G.phase === 'preopen' ? '09:00 開盤後才能下單' : '現在是收盤時間，可以先研究，開盤後再下單'; }
  },
  submit() {
    const s = STOCK[G.selected];
    const r = placeOrder({ code: s.code, side: this.side, type: this.type, price: +$('oPrice').value, qty: this.qtyShares(), odd: this.lot === 'odd' });
    const m = $('oMsg'); m.dataset.keep = '';
    if (!r.ok) { m.className = 'msg err'; m.textContent = r.msg; return; }
    m.className = 'msg ok'; m.textContent = r.order.status === 'filled' ? '已成交' : '委託已送出，價格到了就會成交';
    this.badge('first', '第一筆交易');
    this.renderOrders(); this.renderTop(); this.renderEst(); this.renderChart();
  },
  onFill(o) {
    const s = STOCK[o.code];
    this.toast(`${o.side === 'buy' ? '買進' : '賣出'}成交：${s.name} ${o.qty.toLocaleString()} 股 @ ${fmtPx(o.fillPx)}` + (o.pnl != null ? `，損益 ${money(o.pnl, true)}` : ''));
    this.ding(o.side);
    this.renderOrders(); this.renderMiniHold(); this.renderTop(); this.renderList(true);
    if (Object.keys(G.pos).length >= 5) this.badge('div', '分散投資：同時持有 5 檔');
    if (new Set(Object.keys(G.pos).map(c => STOCK[c].sector)).size >= 4) this.badge('sector', '跨產業：持有 4 個產業');
    if (o.side === 'sell' && o.pnl < 0) this.badge('stop', '學會認賠');
  },
  renderOrders() {
    const list = G.orders.filter(o => o.day === G.day).slice().reverse();
    $('orderList').innerHTML = list.length ? list.map(o => {
      const s = STOCK[o.code], st = { open: '等待成交', filled: '已成交 @ ' + fmtPx(o.fillPx), cancelled: '已取消', expired: '收盤未成交', rejected: '現金不足未成交' }[o.status];
      return `<div class="oitem"><div><b class="${o.side === 'buy' ? 'up' : 'down'}">${o.side === 'buy' ? '買' : '賣'}</b> ${esc(s.name)} ${o.qty.toLocaleString()} 股 ${o.type === 'limit' ? '@ ' + fmtPx(o.price) : '市價'}<div class="t">${minuteToClock(o.t)}・${st}</div></div>${o.status === 'open' ? `<button data-cancel="${o.id}">取消</button>` : ''}</div>`;
    }).join('') : '<p class="empty">今天還沒有委託</p>';
  },
  renderMiniHold() {
    const ent = Object.entries(G.pos);
    if (!ent.length) { $('miniHold').innerHTML = '<div class="hb-empty">我的持股：還沒有持股。買進後，每檔的今日損益與累計損益會顯示在這裡。</div>'; return; }
    let mv = 0, unreal = 0, td = 0;
    const cards = ent.map(([c, h]) => {
      const p = priceNow(c), v = p * h.qty, pnl = v - h.cost, t = this.todayPnl(c); mv += v; unreal += pnl; td += t;
      return `<button class="hb-card${c === G.selected ? ' on' : ''}" onclick="UI.select('${c}')">
        <div class="hb-top"><b>${esc(STOCK[c].name)}</b><span>${c}</span><span class="hb-px">${fmtPx(p)}</span></div>
        <div class="hb-sub">${h.qty.toLocaleString()} 股・均價 ${fmtPx(h.cost / h.qty)}</div>
        <div class="hb-row"><span>今日</span><b class="${cls(t)}">${money(t, true)}</b></div>
        <div class="hb-row"><span>累計</span><b class="${cls(pnl)}">${money(pnl, true)}<em class="${cls(pnl)}">${fmtPct(pnl / h.cost * 100)}</em></b></div>
      </button>`;
    }).join('');
    $('miniHold').innerHTML = `<div class="hb-sum"><div class="hb-title">我的持股</div><div><span>市值</span><b>${money(mv)}</b></div><div><span>今日</span><b class="${cls(td)}">${money(td, true)}</b></div><div><span>累計</span><b class="${cls(unreal)}">${money(unreal, true)}</b></div></div><div class="hb-cards">${cards}</div>`;
  },
  renderTicker() {
    const items = M.news.filter(n => n.d >= 0 && n.d <= knownDay()).slice(-10).reverse();
    $('ticker').innerHTML = items.map(n => `<span><em>${n.date.slice(5).replace('-', '/')}</em>${esc(n.headline)}</span>`).join('') || '<span>市場新聞會在這裡出現</span>';
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
    const rows = Object.entries(G.pos).map(([c, h]) => { const p = priceNow(c), v = p * h.qty, pnl = v - h.cost;  return `<tr><td>${esc(STOCK[c].name)} <span style="color:var(--muted)">${c}</span></td><td>${h.qty.toLocaleString()}</td><td>${fmtPx(h.cost / h.qty)}</td><td>${fmtPx(p)}</td><td>${money(v)}</td><td class="${cls(pnl)}">${money(pnl, true)}</td><td class="${cls(pnl)}">${fmtPct(pnl / h.cost * 100)}</td><td>${(v / a * 100).toFixed(1)}%</td></tr>`; }).join('');
    const fills = G.fills.slice().reverse().slice(0, 40).map(f => `<tr><td>${M.dates[f.day].slice(5)} ${minuteToClock(f.fillT)}</td><td>${esc(STOCK[f.code].name)}</td><td class="${f.side === 'buy' ? 'up' : 'down'}">${f.side === 'buy' ? '買進' : '賣出'}</td><td>${f.qty.toLocaleString()}</td><td>${fmtPx(f.fillPx)}</td><td>${money(f.fee)}</td><td class="${cls(f.pnl || 0)}">${f.pnl != null ? money(f.pnl, true) : '—'}</td></tr>`).join('');
    $('portfolioBody').innerHTML = `<div class="kicker">資產一覽</div><h2>我的帳戶</h2>
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
    const S = [{ name: '你', color: '#1B2A41', bold: true, pts: mine }];
    BOTS.forEach(b => S.push({ name: 'AI ' + b.name + '（' + b.zh + '）', color: b.color, pts: b.sim.eq.filter(e => e.d <= kd) }));
    S.push({ name: '0050 買進持有', color: '#B08D57', dash: true, pts: BENCH.eq.filter(e => e.d <= kd) });
    return S;
  },
  drawCompare(cv, legend) {
    const S = this.seriesUpTo();
    legend.innerHTML = S.map(s => `<span><i style="background:${s.color}"></i>${esc(s.name)}　<b class="${cls(s.pts[s.pts.length - 1].v - START_CASH)}">${fmtPct((s.pts[s.pts.length - 1].v / START_CASH - 1) * 100)}</b></span>`).join('');
    requestAnimationFrame(() => drawEquity(cv, S));
  },

  // ----- 新聞頁 -----
  newsHTML(n) {
    const names = n.codes.filter(c => STOCK[c]).map(c => STOCK[c].name).join('、') || '大盤';
    return `<div class="newsitem"><div class="nd">${n.date.replace(/-/g, '/')}・${esc(names)}</div><h4>${esc(n.headline)}</h4><p>${esc(n.summary)}</p>${n.sources.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">來源 ${i + 1}</a>`).join('　')}</div>`;
  },
  renderNews() {
    const list = M.news.filter(n => n.d >= 0 && n.d <= knownDay()).reverse();
    $('newsBody').innerHTML = `<div class="kicker">真實事件</div><h2>市場新聞</h2><p style="color:var(--muted)">只放真實發生、查證過來源的新聞，依你目前所在的日期顯示，未來的新聞不會先出現。</p>` + list.map(n => this.newsHTML(n)).join('');
  },

  // ----- 辭典 -----
  renderGlossary() {
    const cats = [...new Set(Object.values(GLOSSARY).map(g => g.cat))];
    $('glossBody').innerHTML = `<div class="kicker">看不懂就點</div><h2>術語辭典</h2><p style="color:var(--muted)">已讀 ${G.terms.length} / ${Object.keys(GLOSSARY).length} 個。遊戲裡所有<span class="term" data-term="本益比">虛線底的字</span>都可以點開。</p>` +
      cats.map(c => `<h3 style="font-family:var(--serifTC);font-style:normal;font-size:22px;margin:24px 0 0;color:var(--gold)">${c}</h3><div class="gloss">${Object.entries(GLOSSARY).filter(([, g]) => g.cat === c).map(([k, g]) => `<div class="gcard${G.terms.includes(k) ? ' seen' : ''}"><div class="gc">${c}</div><h4 class="term" data-term="${k}">${k}</h4><p>${g.def}</p><div class="ex">例：${g.ex}</div></div>`).join('')}</div>`).join('');
  },
  pop(term, el) {
    const g = GLOSSARY[term]; if (!g) return;
    if (!G.terms.includes(term)) { G.terms.push(term); persist(); if (G.terms.length >= 20) this.badge('terms', '術語達人：讀了 20 個術語'); }
    const p = $('pop'); p.innerHTML = `<h4>${esc(term)}</h4>${g.def}<div class="ex">例：${g.ex}</div>${g.tip ? `<div class="tp">${g.tip}</div>` : ''}`;
    p.hidden = false; const r = el.getBoundingClientRect();
    const x = Math.min(innerWidth - 360, Math.max(10, r.left)), y = r.bottom + 8 + 220 > innerHeight ? r.top - p.offsetHeight - 8 : r.bottom + 8;
    p.style.left = x + 'px'; p.style.top = Math.max(10, y) + 'px';
  },

  // ----- AI 對手 -----
  renderRivals() {
    const kd = knownDay();
    const card = b => { const eq = b.sim.eq.filter(e => e.d <= kd), last = eq[eq.length - 1], ret = (last.v / START_CASH - 1) * 100; return `<div class="rcard" style="border-top-color:${b.color}"><div class="z">AI 投資機器人</div><h4 style="color:${b.color}">${b.name}</h4><div class="z">${b.zh}</div><p style="font-size:13px;color:var(--ink2)">${b.desc}</p><b class="${cls(ret)}">${fmtPct(ret)}</b><div style="font-size:12px;color:var(--muted)">${T('最大回撤')} ${(maxDrawdown(eq) * 100).toFixed(1)}%・持有：${(last.pos || []).map(c => STOCK[c].name).join('、') || '現金'}</div></div>`; };
    const mine = G.equity.filter(e => e.d <= kd), myRet = (mine[mine.length - 1].v / START_CASH - 1) * 100;
    const states = ['5 日跌超過 5%', '5 日跌 0–5%', '5 日漲 0–5%', '5 日漲超過 5%'];
    const qtable = b => `<div class="qgrid">${states.map((st, i) => [0, 1].map(m => { const s = i * 2 + m, v = b.model.Q[s][1] - b.model.Q[s][0]; return `<div class="${v > 0 ? 'pos' : 'neg'}">${st}<br>${m ? '均線上' : '均線下'}<br><b>${v > 0 ? '想持有' : '不碰'}</b></div>`; }).join('')).join('')}</div>`;
    $('rivalsBody').innerHTML = `<div class="kicker">同場較勁</div><h2>AI 對手</h2>
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
  openSheet(html) { $('pop').hidden = true; $('toast').hidden = true; $('sheetBody').innerHTML = html; $('sheet').hidden = false; $('sheetBody').scrollTop = 0; },
  movers(d) {
    const arr = M.stocks.filter(s => s.c[d] != null && s.c[d - 1] != null).map(s => ({ s, p: (s.c[d] / s.c[d - 1] - 1) * 100 })).sort((a, b) => b.p - a.p);
    const row = x => `<div><span>${esc(x.s.name)}</span><b class="${cls(x.p)}">${fmtPct(x.p)}</b></div>`;
    return `<div class="movers"><div><h5>漲幅前五</h5>${arr.slice(0, 5).map(row).join('')}</div><div><h5>跌幅前五</h5>${arr.slice(-5).reverse().map(row).join('')}</div></div>`;
  },
  sheetWelcome() {
    this.openSheet(`<div class="masthead"><div class="mt">歡迎來到股市練習所</div><div class="ms"><span>新手說明</span><span>${dateLabel(M.startIdx)}</span><span>收盤後</span></div></div>
      <div class="lead">歡迎，你有新台幣一百萬元。</div>
      <div class="cols"><p>現在是 <b>${dateLabel(M.startIdx)}</b> 收盤後。你可以先慢慢研究 ${M.stocks.length} 檔股票：看一年的日 K 線、看財報、讀新聞。準備好了，按右上的「開始第一個交易日」。</p>
      <p>每個交易日從 <b>09:00 到 13:30</b>，壓縮成 <b>5 分鐘</b>。盤中可以暫停（空白鍵）或加速。每天的開盤、最高、最低、收盤價都是<b>真實發生過的</b>。</p>
      <p>下單要付 ${T('手續費')}，賣出要繳 ${T('證交稅')}，跟真的一樣。整股以 ${T('張')} 為單位，錢不夠可以買 ${T('零股')}。</p>
      <p>兩位 AI 投資機器人也會用同樣的錢跟你同場。${FUTURE_DAYS} 個交易日後結算，看看誰的報酬好、誰的風險小。</p>
      <p class="src">資料來源：臺灣證券交易所。教學練習，不構成投資建議。</p></div>
      <div class="actions"><button class="btn primary" onclick="$('sheet').hidden=true">開始研究</button></div>`);
  },
  sheetMorning() {
    const d = G.day, kd = d - 1, news = M.news.filter(n => n.d === d || (n.d > kd - 0 && n.d < d));
    const prev = M.news.filter(n => n.d === kd);
    const s0 = STOCK['0050'], mk = (s0.c[kd] / s0.c[kd - 1] - 1) * 100;
    const no = G.day - M.startIdx;
    this.openSheet(`<div class="masthead"><div class="mt">晨報</div><div class="ms"><span>第 ${no} / ${FUTURE_DAYS} 個交易日</span><span>${dateLabel(d)}</span><span>晨間版</span></div></div>
      <div class="lead">${news.length ? esc(news[0].headline) : prev.length ? '昨日焦點：' + esc(prev[0].headline) : `昨日台灣 50 ${mk >= 0 ? '上漲' : '下跌'} ${Math.abs(mk).toFixed(2)}%`}</div>
      <div class="cols">${[...news, ...prev].slice(0, 4).map(n => `<h5>${esc(n.headline)}</h5><p>${esc(n.summary)} <span class="src">${n.date}</span></p>`).join('') || '<p>今天沒有特別查證過的重大新聞。先看看昨天的漲跌，想想今天的策略。</p>'}
      <p><b>昨日行情</b>：台灣 50（0050）收 ${fmtPx(s0.c[kd])}，<span class="${cls(mk)}">${fmtPct(mk)}</span>。</p></div>
      ${this.movers(kd)}
      <div class="actions"><button class="btn ghost" onclick="$('sheet').hidden=true">先看盤前資料</button><button class="btn primary" onclick="UI.sessionButton()">09:00 開盤</button></div>`);
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
    const q = QUIZ[qz.qi];
    this.openSheet(`<div class="masthead"><div class="mt">收盤報</div><div class="ms"><span>第 ${d - M.startIdx} / ${FUTURE_DAYS} 個交易日</span><span>${dateLabel(d)}</span><span>收盤版</span></div></div>
      <div class="lead">今日損益 <span class="${cls(dp)}">${money(dp, true)}</span>，總資產 ${money(a)}</div>
      <div class="cols"><p>累計報酬 <b class="${cls(a - START_CASH)}">${fmtPct((a / START_CASH - 1) * 100)}</b>。今天成交 ${fills.length} 筆，付了 ${money(fills.reduce((s, f) => s + f.fee, 0))} 手續費。</p>
      ${M.news.filter(n => n.d === d).map(n => `<h5>${esc(n.headline)}</h5><p>${esc(n.summary)}</p>`).join('')}</div>
      ${this.movers(d)}
      <div class="quiz" id="quizBox"><h5>今日小測驗</h5><div class="qq">${esc(q.q)}</div><div class="opts">${qz.order.map(i => `<button data-i="${i}">${esc(q.o[i])}</button>`).join('')}</div><div class="why" id="quizWhy"></div></div>
      <div class="actions"><button class="btn ghost" onclick="$('sheet').hidden=true">看今天的盤</button><button class="btn primary" onclick="UI.sessionButton()">${isLastDay() ? '看最終結算' : '下一個交易日'}</button></div>`);
    const box = $('quizBox');
    box.onclick = e => {
      const b = e.target.closest('button[data-i]'); if (!b || qz.done) return; qz.done = true;
      const right = +b.dataset.i === q.a; G.quiz.total++; if (right) G.quiz.right++; G.quiz.asked.push(qz.qi); persist();
      [...box.querySelectorAll('button')].forEach(x => { if (+x.dataset.i === q.a) x.classList.add('right'); else if (x === b) x.classList.add('wrong'); });
      $('quizWhy').innerHTML = (right ? '<b>答對了！</b> ' : '<b>差一點。</b> ') + GLOSSARY[q.t].def + ` ${T(q.t, '看更多')}`;
      if (G.quiz.right >= 10) this.badge('quiz', '小測驗答對 10 題');
    };
  },
  sheetFinal() {
    G.phase = 'ended'; persist(); this.renderTop();
    const a = totalAssets(), ret = (a / START_CASH - 1) * 100, mdd = maxDrawdown(G.equity) * 100;
    const bench = BENCH.eq[BENCH.eq.length - 1].v, bret = (bench / START_CASH - 1) * 100;
    const grade = ret - bret > 3 ? 'A' : ret - bret > 0 ? 'B' : ret > 0 ? 'C' : 'D';
    const trades = G.fills.length, sectors = new Set(G.fills.map(f => STOCK[f.code].sector)).size;
    const ins = [];
    ins.push(`你的報酬 ${fmtPct(ret)}，同期間買進 0050 放著不動是 ${fmtPct(bret)}。${ret >= bret ? '你贏過大盤！' : '自己選股沒有贏過大盤，這在真實世界也很常見，所以很多人選擇 ETF。'}`);
    ins.push(`你一共成交 ${trades} 筆，手續費與證交稅合計 ${money(G.fees + G.taxes)}，占本金 ${((G.fees + G.taxes) / START_CASH * 100).toFixed(2)}%。${trades > 40 ? '進出很頻繁，交易成本會慢慢吃掉獲利。' : ''}`);
    ins.push(`最大回撤 ${mdd.toFixed(1)}%。${mdd > 10 ? '資產曾經從高點跌了不少，想想能不能用分散投資或停損降低。' : '波動控制得不錯。'}`);
    BOTS.forEach(b => { const e = b.sim.eq[b.sim.eq.length - 1].v; ins.push(`AI ${b.name}（${b.zh}）：報酬 ${fmtPct((e / START_CASH - 1) * 100)}，最大回撤 ${(maxDrawdown(b.sim.eq) * 100).toFixed(1)}%。`); });
    const badges = G.badges.map(b => `<span>${esc(b.label)}</span>`).join('') || '<span>下次試著收集成就</span>';
    this.openSheet(`<div class="masthead"><div class="mt">最終結算</div><div class="ms"><span>最終結算</span><span>${dateLabel(M.startIdx + 1)} – ${dateLabel(M.dates.length - 1)}</span><span>${FUTURE_DAYS} 個交易日</span></div></div>
      <div class="grade">${grade}</div>
      <div class="kpis"><div><span>最終資產</span><b class="${cls(a - START_CASH)}">${money(a)}</b></div><div><span>${T('報酬率')}</span><b class="${cls(ret)}">${fmtPct(ret)}</b></div><div><span>0050 同期</span><b class="${cls(bret)}">${fmtPct(bret)}</b></div><div><span>${T('最大回撤')}</span><b>${mdd.toFixed(1)}%</b></div></div>
      <div class="legend" id="fnLegend"></div><div class="eqbox"><canvas id="fnEq"></canvas></div>
      ${ins.map(x => `<div class="insight">${x}</div>`).join('')}
      <p style="text-align:center;color:var(--muted)">小測驗 ${G.quiz.right} / ${G.quiz.total}・讀過 ${G.terms.length} 個術語・看過 ${G.viewedFin.length} 份財報・交易 ${sectors} 個產業</p>
      <div class="badges">${badges}</div>
      <div class="actions"><button class="btn ghost" onclick="$('sheet').hidden=true">回去看看</button><button class="btn primary" onclick="localStorage.removeItem('${SAVE_KEY}');location.reload()">再玩一次</button></div>`);
    this.drawCompare($('fnEq'), $('fnLegend'));
  },

  // ----- 小工具 -----
  badge(id, label) { if (G.badges.find(b => b.id === id)) return; G.badges.push({ id, label }); persist(); this.toast('成就解鎖：' + label); },
  toast(t) { const el = $('toast'); el.textContent = t; el.hidden = false; clearTimeout(el._h); el._h = setTimeout(() => el.hidden = true, 2600); },
  audio(f, d, v = .05, type = 'sine') { try { this.ac = this.ac || new (window.AudioContext || window.webkitAudioContext)(); const o = this.ac.createOscillator(), g = this.ac.createGain(); o.type = type; o.frequency.value = f; g.gain.value = v; o.connect(g); g.connect(this.ac.destination); o.start(); g.gain.exponentialRampToValueAtTime(.0001, this.ac.currentTime + d); o.stop(this.ac.currentTime + d); } catch (e) { } },
  chime(close) { const n = close ? [784, 659, 523] : [523, 659, 784]; n.forEach((f, i) => setTimeout(() => this.audio(f, .5, .05, 'triangle'), i * 160)); },
  ding(side) { this.audio(side === 'buy' ? 880 : 660, .18, .05); }
};
UI.init();
