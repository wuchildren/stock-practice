// ===== AI 投資機器人：用過去 12 個月的真實股價，以 Q-learning 學出規則 =====
// 狀態：近 5 日漲跌（4 級）× 股價在 20 日均線之上或之下（2 級）＝ 8 種
// 動作：0 = 不持有，1 = 持有到明天
// 兩位機器人學法相同，只差「獎勵規則」：
//   進取型（只看報酬）：獎勵 = 明天的報酬
//   穩健型（扣掉風險）：獎勵 = 明天的報酬 − 風險懲罰（波動越大扣越多）
const BOT_DEFS = [
  { id: 'remy', name: '進取型', zh: '只看報酬', color: '#8C2F39', lambda: 0, topN: 1, desc: '獎勵只看報酬，把全部資金押在 AI 覺得最會漲的一檔。' },
  { id: 'claire', name: '穩健型', zh: '扣掉風險', color: '#2F5D50', lambda: 3, topN: 8, desc: '獎勵把波動風險扣掉，資金平均分散在最多 8 檔。' }
];

function feat(s, d) {
  const c = s.c; if (d < 20 || c[d] == null || c[d - 5] == null) return -1;
  const r5 = c[d] / c[d - 5] - 1;
  let sum = 0, n = 0; for (let i = d - 19; i <= d; i++) if (c[i] != null) { sum += c[i]; n++; }
  const ma = sum / n;
  const b = r5 < -0.05 ? 0 : r5 < 0 ? 1 : r5 < 0.05 ? 2 : 3;
  return b * 2 + (c[d] > ma ? 1 : 0);
}

function trainBot(def, endDay, episodes = 6) {
  // 依「日期」順序走過所有股票（不是一檔一檔），學習率隨經驗遞減，避免最後幾檔股票主導結果
  const Q = Array.from({ length: 8 }, () => [0, 0]), N = Array.from({ length: 8 }, () => [0, 0]);
  const r = rng(hash(def.id));
  const gamma = 0.3;
  const curve = [];
  for (let ep = 0; ep < episodes; ep++) {
    const eps = Math.max(0.05, 0.5 * (1 - ep / episodes));
    let tot = 0, n = 0;
    for (let d = 21; d < endDay - 1; d++) {
      for (const s of M.stocks) {
        const st = feat(s, d); if (st < 0 || s.c[d + 1] == null) continue;
        const a = r() < eps ? (r() < 0.5 ? 0 : 1) : (Q[st][1] > Q[st][0] ? 1 : 0);
        const ret = s.c[d + 1] / s.c[d] - 1;
        const rew = a ? (ret - def.lambda * ret * ret) * 100 : 0;
        const st2 = feat(s, d + 1);
        const nx = st2 < 0 ? 0 : Math.max(...Q[st2]);
        N[st][a]++;
        const alpha = Math.max(0.002, 1 / N[st][a]);
        Q[st][a] += alpha * (rew + gamma * nx - Q[st][a]);
        tot += rew; n++;
      }
    }
    curve.push(tot / Math.max(1, n));
  }
  return { Q, curve };
}

// 在未來每一天：用「前一天收盤」的資訊做決定，在「當天開盤」執行，所以不會偷看答案
function simulateBot(def, model) {
  let cash = START_CASH, pos = {}, eq = [{ d: M.startIdx, v: START_CASH }], trades = 0, fees = 0;
  for (let d = M.startIdx + 1; d < M.dates.length; d++) {
    const scored = M.stocks.map(s => { const st = feat(s, d - 1); const c = s.c, r5 = st < 0 ? 0 : c[d - 1] / c[d - 6] - 1; return { s, r5, sc: st < 0 ? -1e9 : model.Q[st][1] - model.Q[st][0] }; })
      .filter(x => x.sc > 0 && x.s.o[d] != null).sort((a, b) => b.sc - a.sc || a.r5 - b.r5).slice(0, def.topN);
    const want = new Set(scored.map(x => x.s.code));
    // 賣掉不想要的
    for (const code of Object.keys(pos)) if (!want.has(code)) {
      const px = STOCK[code].o[d], amt = px * pos[code];
      const f = feeOf(amt, pos[code] < 1000) + taxOf(amt, code); cash += amt - f; fees += f; trades++; delete pos[code];
    }
    // 買進想要的（平均分配）
    const value = cash + Object.entries(pos).reduce((a, [c, q]) => a + q * STOCK[c].o[d], 0);
    const per = value / Math.max(1, def.topN);
    for (const x of scored) {
      if (pos[x.s.code]) continue;
      const px = x.s.o[d], q = Math.floor(Math.min(per, cash) / (px * (1 + FEE)));
      if (q <= 0) continue;
      const amt = px * q, f = feeOf(amt, q < 1000); cash -= amt + f; fees += f; trades++; pos[x.s.code] = q;
    }
    const v = cash + Object.entries(pos).reduce((a, [c, q]) => a + q * (STOCK[c].c[d] ?? STOCK[c].o[d]), 0);
    eq.push({ d, v, pos: Object.keys(pos) });
  }
  return { eq, trades, fees };
}

function maxDrawdown(eq) { let peak = -1, mdd = 0; for (const e of eq) { peak = Math.max(peak, e.v); mdd = Math.max(mdd, (peak - e.v) / peak); } return mdd; }

const BOTS = BOT_DEFS.map(def => { const model = trainBot(def, M.startIdx); return { ...def, model, sim: simulateBot(def, model) }; });
// 大盤參考：第一天開盤全部買 0050 放著不動
const BENCH = (() => {
  const s = STOCK['0050'], d0 = M.startIdx + 1, q = Math.floor(START_CASH / (s.o[d0] * (1 + FEE)));
  const cash = START_CASH - s.o[d0] * q - feeOf(s.o[d0] * q, false);
  const eq = [{ d: M.startIdx, v: START_CASH }];
  for (let d = d0; d < M.dates.length; d++) eq.push({ d, v: cash + q * s.c[d] });
  return { name: '0050 買進持有', eq };
})();
