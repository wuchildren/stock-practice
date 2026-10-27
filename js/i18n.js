// ===== 語言切換（中文 / English）與英文資料翻譯 =====
// 內部一律用中文當 key（術語、產業、新聞），只在顯示時換成英文。
const LANG_KEY = 'stock-practice-lang';
let LANG = 'zh';
try { const v = localStorage.getItem(LANG_KEY); if (v === 'en' || v === 'zh') LANG = v; } catch (e) { }
const isEN = () => LANG === 'en';
// tr('中文', 'English')：依目前語言回傳其中一個
const tr = (zh, en) => LANG === 'en' ? en : zh;

// ---- 股票英文名稱 ----
const STOCK_EN = {
  '2330': 'TSMC', '2454': 'MediaTek', '2303': 'UMC', '3711': 'ASE Technology', '2379': 'Realtek', '3034': 'Novatek',
  '3443': 'Global Unichip (GUC)', '3661': 'Alchip', '2449': 'King Yuan Electronics (KYEC)', '6770': 'Powerchip (PSMC)',
  '3035': 'Faraday Technology', '6415': 'Silergy', '2360': 'Chroma ATE', '6515': 'WinWay Technology', '5269': 'ASMedia',
  '2408': 'Nanya Technology', '2344': 'Winbond', '2337': 'Macronix', '2451': 'Transcend', '4967': 'TeamGroup',
  '3006': 'Elite Semiconductor (ESMT)', '8271': 'Apacer',
  '3037': 'Unimicron', '8046': 'Nan Ya PCB', '3189': 'Kinsus', '2368': 'Gold Circuit Electronics', '2383': 'Elite Material (EMC)',
  '2313': 'Compeq', '4958': 'Zhen Ding Tech', '6213': 'ITEQ', '3044': 'Tripod Technology', '6269': 'Flexium',
  '2317': 'Hon Hai (Foxconn)', '2382': 'Quanta Computer', '3231': 'Wistron', '6669': 'Wiwynn', '2376': 'Gigabyte', '2357': 'ASUS',
  '3017': 'Asia Vital Components (AVC)', '2345': 'Accton', '3653': 'Jentech Precision', '2059': 'King Slide', '2356': 'Inventec',
  '3533': 'Lotes', '8210': 'Chenbro', '3665': 'BizLink',
  '2353': 'Acer', '2324': 'Compal', '4938': 'Pegatron', '2395': 'Advantech', '2301': 'Lite-On Technology', '2327': 'Yageo', '3481': 'Innolux',
  '2308': 'Delta Electronics', '1513': 'Chung-Hsin Electric', '1519': 'Fortune Electric', '1503': 'Shihlin Electric', '1504': 'TECO Electric',
  '3008': 'Largan Precision', '2412': 'Chunghwa Telecom', '3045': 'Taiwan Mobile', '4904': 'Far EasTone',
  '2881': 'Fubon Financial', '2882': 'Cathay Financial', '2891': 'CTBC Financial', '2886': 'Mega Financial', '2884': 'E.SUN Financial',
  '2885': 'Yuanta Financial', '2892': 'First Financial', '5880': 'Taiwan Cooperative Financial', '2887': 'Taishin Shin Kong Financial',
  '2603': 'Evergreen Marine', '2609': 'Yang Ming Marine', '2615': 'Wan Hai Lines', '2606': 'U-Ming Marine',
  '2618': 'EVA Air', '2610': 'China Airlines', '2646': 'STARLUX Airlines',
  '2731': 'Lion Travel', '2707': 'Formosa International Hotels', '2727': 'Wowprime',
  '2912': 'President Chain Store (7-Eleven)', '1216': 'Uni-President', '9910': 'Feng Tay', '9921': 'Giant Manufacturing', '1476': 'Eclat Textile',
  '1301': 'Formosa Plastics', '2002': 'China Steel', '1101': 'Taiwan Cement', '1326': 'Formosa Chemicals & Fibre', '1303': 'Nan Ya Plastics',
  '6505': 'Formosa Petrochemical',
  '1795': 'Lotus Pharmaceutical', '2207': 'Hotai Motor', '6446': 'PharmaEssentia',
  '0050': 'Yuanta Taiwan 50 ETF', '0056': 'Yuanta Taiwan High Dividend ETF', '006208': 'Fubon Taiwan 50 ETF',
  '00878': 'Cathay Sustainable High Dividend ETF', '00919': 'Capital Taiwan Select High Dividend ETF'
};
const SECTOR_EN = {
  '全部': 'All', '持有': 'Held', '半導體': 'Semiconductors', '記憶體': 'Memory', '載板與 PCB': 'Substrates & PCB', 'AI 伺服器': 'AI Servers',
  '電腦與零組件': 'PCs & Components', '電力與能源': 'Power & Energy', '光學與電信': 'Optics & Telecom', '金融': 'Financials',
  '航運': 'Shipping', '航空': 'Airlines', '觀光餐飲': 'Travel & Dining', '民生消費': 'Consumer', '傳產原物料': 'Materials',
  '生技與汽車': 'Biotech & Autos', 'ETF': 'ETF'
};
function sName(x) { const s = typeof x === 'string' ? STOCK[x] : x; return LANG === 'en' ? (STOCK_EN[s.code] || s.name) : s.name; }
function secName(sec) { return LANG === 'en' ? (SECTOR_EN[sec] || sec) : sec; }

// ---- 術語辭典（英文） ----
const CAT_EN = { '看盤': 'Reading the Market', '交易': 'Trading', '成本': 'Costs', '財報': 'Financial Statements', '估值': 'Valuation', '商品': 'Products', '市場': 'Market News', '產業': 'Industries', '總經': 'Macro', '技術': 'Technical', '帳戶': 'Your Account', '風險': 'Risk' };
const GLOSSARY_EN = {
  '開盤價': { term: 'Opening price', def: 'The price of the first trade of the day. The Taiwan market opens at 09:00.', ex: 'It closed at NT$500 yesterday and opens at NT$510 today: right from the open, someone was willing to pay more.', tip: 'A high or low open often reflects US stocks overnight or the latest news.' },
  '收盤價': { term: 'Closing price', def: 'The last traded price of the day (the market closes at 13:30). It is the reference for measuring price changes.', ex: 'When the news says "TSMC closed at NT$1,500", that is the closing price.', tip: 'The next day\'s % change is always measured against the previous close.' },
  '最高價': { term: 'High', def: 'The highest price traded during the day.', ex: 'A high of 520 and a close of 505 means the price spiked and then sellers pushed it back down.', tip: 'The further the high is from the close, the heavier the selling pressure above.' },
  '最低價': { term: 'Low', def: 'The lowest price traded during the day.', ex: 'A low of 480 and a close of 500 means buyers stepped in after the drop.', tip: '' },
  '漲跌幅': { term: 'Price change (%)', def: 'How much today\'s price is up or down versus yesterday\'s close, in percent.', ex: 'Yesterday\'s close was 100 and today it is 103: the change is +3%.', tip: 'In Taiwan, red means up and green means down, the opposite of US markets.' },
  '漲跌停': { term: 'Daily price limit', def: 'A Taiwan stock can rise or fall at most 10% in a day. Hitting the top is "limit-up"; hitting the bottom is "limit-down".', ex: 'If yesterday\'s close was 100, today it can go no higher than 110 (limit-up) and no lower than 90 (limit-down).', tip: 'At limit-up you may not be able to buy; at limit-down you may not be able to sell.' },
  '成交量': { term: 'Volume', def: 'The number of shares traded in a period. Taiwan usually counts it in board lots (1,000 shares).', ex: 'Volume of 50,000 lots today means 50 million shares changed hands.', tip: 'A big price rise on heavy volume usually means the market agrees; a rise on thin volume is a warning against chasing.' },
  '張': { term: 'Board lot', def: 'The standard trading unit in Taiwan: 1 lot = 1,000 shares.', ex: 'At NT$500 a share, one lot costs NT$500,000 (plus the brokerage fee).', tip: 'If you can\'t afford a full lot, you can buy odd lots.' },
  '零股': { term: 'Odd lot', def: 'A trade of fewer than 1,000 shares; you can buy one share at a time.', ex: 'For a NT$1,500 stock, 10 shares cost only NT$15,000.', tip: 'Odd lots let small investors diversify into high-priced stocks.' },
  '市價單': { term: 'Market order', def: 'An order with no price set; it fills right away at the current market price.', ex: 'The stock is at NT$100 and you buy at market: you get filled at about NT$100.', tip: 'Pro: it always fills. Con: when prices jump quickly, the fill price may be worse than expected.' },
  '限價單': { term: 'Limit order', def: 'You set a price, and the order fills only if the market reaches it.', ex: 'The stock is at NT$105 and you place a buy at NT$100: you only buy if it falls to NT$100 or below.', tip: 'You control your cost, but you may wait all day without a fill.' },
  '委託': { term: 'Order', def: 'A buy or sell instruction you send. Until it fills it is an open order and can be cancelled.', ex: 'You place a buy for 1 lot at NT$100; the stock never drops to 100, so the order stays open.', tip: 'In this game, orders still unfilled at the close are cancelled automatically.' },
  '手續費': { term: 'Brokerage fee', def: 'The fee paid to the broker on every trade: 0.1425% of the trade value in Taiwan, minimum NT$20 for board lots.', ex: 'Buying NT$500,000 of stock costs about NT$712 in fees.', tip: 'You pay it on both buys and sells. The more you trade, the more fees eat into profits.' },
  '證交稅': { term: 'Securities transaction tax', def: 'A tax paid to the government when you sell: 0.3% of the sale value for stocks, 0.1% for ETFs.', ex: 'Selling NT$500,000 of stock means NT$1,500 in transaction tax.', tip: 'Only sells are taxed. A round trip (buy + sell) costs about 0.585% in total.' },
  'EPS': { term: 'EPS', def: 'Earnings per share: the company\'s profit divided by the number of shares.', ex: 'EPS of NT$10 means each share earned NT$10 for its owner.', tip: 'Watch the trend: EPS rising year after year means the company is earning more and more.' },
  '本益比': { term: 'P/E ratio', def: 'Share price ÷ earnings per share (EPS): how many years of profit it takes to earn back the price you pay.', ex: 'A price of 200 and EPS of 10 gives a P/E of 20x.', tip: 'Only compare within the same industry. A high P/E can mean the market is optimistic, or that the stock is too expensive.' },
  '殖利率': { term: 'Dividend yield', def: 'Annual cash dividend ÷ share price, like the "interest" you earn for holding the stock.', ex: 'A price of 100 and a NT$5 dividend each year gives a 5% yield.', tip: 'A high yield isn\'t always good: a falling share price also pushes the yield up.' },
  '股價淨值比': { term: 'P/B ratio', def: 'Share price ÷ book value per share: how many times the company\'s book value the market is willing to pay.', ex: 'Book value of NT$50 per share and a price of NT$100 gives a P/B of 2x.', tip: 'Common for financial and traditional-industry stocks; below 1 means the stock costs less than its book value.' },
  '每股淨值': { term: 'Book value per share', def: 'The company\'s net assets (assets minus liabilities) divided by the number of shares.', ex: 'Book value of NT$30 per share means each share would in theory receive NT$30 if the company were wound up.', tip: '' },
  '營收': { term: 'Revenue', def: 'The total money a company takes in from selling goods and services, before any costs.', ex: 'A bubble-tea shop that sells NT$10 million of drinks in a year has revenue of NT$10 million.', tip: 'Taiwan companies report last month\'s revenue by the 10th of each month, the most up-to-date report card.' },
  '毛利率': { term: 'Gross margin', def: '(Revenue − cost of goods sold) ÷ revenue: how profitable the product itself is.', ex: 'A 60% gross margin means that out of every NT$100 of sales, NT$60 is left after materials and manufacturing.', tip: 'A high gross margin usually means a technology or brand edge that rivals can\'t undercut on price.' },
  '營業利益率': { term: 'Operating margin', def: 'Operating income ÷ revenue: what is left after also paying for R&D, marketing and administration.', ex: 'A 20% operating margin means the core business earns NT$20 on every NT$100 of sales.', tip: 'Shows how well the core business makes money.' },
  '淨利率': { term: 'Net margin', def: 'Net income ÷ revenue: what is finally left after all costs, expenses and taxes.', ex: 'A 10% net margin means NT$10 of profit on every NT$100 of sales.', tip: '' },
  'ROE': { term: 'ROE', def: 'Return on equity: net income ÷ shareholders\' equity, how much the company earns with shareholders\' money.', ex: 'An ROE of 20% means every NT$100 shareholders put in earns NT$20 a year.', tip: 'Warren Buffett pays close attention to ROE; a steady ROE above 15% usually signals a good company.' },
  '負債比率': { term: 'Debt ratio', def: 'Total liabilities ÷ total assets: how much of the company\'s assets are funded by borrowing.', ex: 'A 70% debt ratio means NT$70 of every NT$100 in assets is borrowed.', tip: 'A high debt ratio is risky in a downturn, but banks and financial holding companies run on liabilities (deposits), so their ratios are always high.' },
  '市值': { term: 'Market cap', def: 'Share price × total shares: what the whole company is worth on the market.', ex: 'TSMC has the largest market cap in Taiwan and carries a very large weight in the TAIEX.', tip: '' },
  'ETF': { term: 'ETF', def: 'Exchange-traded fund: one purchase buys a whole basket of stocks, like a "bundle".', ex: '0050 holds Taiwan\'s 50 largest companies by market cap in one go.', tip: 'If you want to spread your risk without picking stocks yourself, an ETF is a common place to start.' },
  '加權指數': { term: 'TAIEX', def: 'The index that tracks the whole Taiwan stock market; larger companies by market cap have more influence.', ex: 'When the news says "Taiwan stocks rose 300 points", it means the TAIEX.', tip: 'This game uses 0050 as the market benchmark.' },
  '外資': { term: 'Foreign investors', def: 'Foreign institutional investors, such as overseas funds and banks.', ex: '"Foreign investors net sold NT$100 billion" means they sold NT$100 billion more than they bought that day.', tip: 'Foreign investors trade in huge amounts and often move the whole market.' },
  '法說會': { term: 'Investor conference', def: 'A meeting where a company explains its results and outlook to investors.', ex: 'TSMC announces its capital spending at its quarterly investor conference, which often moves the whole chip sector.', tip: '' },
  '除息': { term: 'Ex-dividend', def: 'When a company pays a cash dividend, the dividend amount is deducted from the share price on the ex-dividend date.', ex: 'A NT$100 stock paying NT$5 has a reference price of NT$95 on the ex-dividend date.', tip: 'When the price climbs back to where it was, that is called "filling the gap".' },
  '景氣循環股': { term: 'Cyclical stock', def: 'Industries whose profits rise and fall sharply with the economic cycle, such as memory chips, shipping, steel and petrochemicals.', ex: 'When memory is in short supply, prices soar and makers earn a lot; when supply exceeds demand, prices fall and they lose money.', tip: 'These stocks often peak when their P/E looks lowest, because profits have already topped out.' },
  '升息': { term: 'Rate hike', def: 'The central bank raises interest rates, making borrowing more expensive.', ex: 'When the Fed hikes, US rates rise and money may flow out of stocks into bonds or deposits.', tip: 'Rate hikes usually put more pressure on high-P/E growth stocks.' },
  'K線': { term: 'Candlestick', def: 'One bar showing a day\'s open, close, high and low.', ex: 'A red candle (solid red): the close was above the open; a green candle: the close was below the open. The thin lines above and below mark the high and low.', tip: '' },
  '均線': { term: 'Moving average', def: 'The average closing price over a recent period, e.g. the 20-day moving average.', ex: 'A price above the 20-day moving average means people who bought over the last month are, on average, in profit.', tip: 'Often used to judge the trend, but moving averages lag behind the price.' },
  '已實現損益': { term: 'Realized P&L', def: 'Profit or loss that is locked in because you have already sold.', ex: 'Buy at 100 and sell at 120: a realized gain of 20 (minus fees and tax).', tip: '' },
  '未實現損益': { term: 'Unrealized P&L', def: 'Profit or loss on shares you still hold, valued at the current price; it changes every time the price moves.', ex: 'Bought at 100 and now at 90: an unrealized loss of 10. It only becomes a real loss when you sell.', tip: '' },
  '報酬率': { term: 'Return', def: 'Profit or loss ÷ the money you invested.', ex: 'NT$1 million growing to NT$1.1 million is a 10% return.', tip: 'Always compare against the market (e.g. 0050) to know whether your stock picks actually did better.' },
  '最大回撤': { term: 'Max drawdown', def: 'The largest fall from a peak to a low in your total assets: the worst loss you ever sat through.', ex: 'Assets falling from NT$1.2 million to NT$900,000 is a max drawdown of 25%.', tip: 'Of two people with the same return, the one with the smaller drawdown sleeps better.' },
  '分散投資': { term: 'Diversification', def: 'Spreading money across different stocks and industries so that one piece of bad news can\'t cost you too much.', ex: 'Hold only memory stocks and they all fall together when memory prices drop; spread into financials and telecom and the swings are much smaller.', tip: 'Don\'t put all your eggs in one basket.' },
  '停損': { term: 'Stop-loss', def: 'Deciding in advance at what loss you will sell, so losses can\'t keep growing.', ex: 'Buy at 100 and plan to sell if it falls to 90: you lose at most 10%.', tip: 'The key to a stop-loss is deciding it beforehand, not after you are already losing.' }
};
function gTerm(k) { return LANG === 'en' && GLOSSARY_EN[k] ? GLOSSARY_EN[k].term : k; }
function gEntry(k) { const g = GLOSSARY[k]; if (!g) return null; if (LANG !== 'en' || !GLOSSARY_EN[k]) return g; const e = GLOSSARY_EN[k]; return { cat: g.cat, def: e.def, ex: e.ex, tip: e.tip }; }
function catName(c) { return LANG === 'en' ? (CAT_EN[c] || c) : c; }

// ---- 小測驗（英文）：順序、選項順序與中文完全相同，第 0 個選項是正確答案 ----
const QUIZ_EN = [
  { q: 'A stock trades at NT$300 with EPS of NT$15. What is its P/E ratio?', o: ['20x', '15x', '4.5x', '45x'] },
  { q: 'In Taiwan, what does red mean on a price screen?', o: ['The price is up', 'The price is down', 'Limit-up', 'Heavy volume'] },
  { q: 'Yesterday\'s close was NT$200. What is the highest it can go today?', o: ['NT$220', 'NT$210', 'NT$240', 'There is no limit'] },
  { q: 'How many shares are in one board lot?', o: ['1,000 shares', '100 shares', '10 shares', '10,000 shares'] },
  { q: 'If you want to be sure your order fills, which order type should you use?', o: ['Market order', 'Limit order', 'Odd-lot order', 'Stop order'] },
  { q: 'How much tax do you pay when you sell a stock?', o: ['0.3% of the sale value', '0.1425%', '1%', 'None'] },
  { q: 'What does a 60% gross margin mean?', o: ['For every NT$100 of sales, NT$60 is left after product costs', 'The company earned NT$6 billion', 'The stock rose 60%', '60% of shareholders made money'] },
  { q: 'A NT$50 stock pays a NT$2.5 cash dividend every year. What is the dividend yield?', o: ['5%', '2.5%', '20%', '50%'] },
  { q: 'Which of these is most like a cyclical stock?', o: ['Memory chips', 'Telecom', 'Convenience stores', '0056'] },
  { q: 'What is 0050?', o: ['An ETF holding Taiwan\'s 50 largest companies', 'A single company', 'A bond', 'Taiwan\'s daily price-limit rule'] },
  { q: 'A company has an 80% debt ratio. Which statement is most reasonable?', o: ['It depends on the industry; for financials it is normally high', 'It is about to go bankrupt', 'It must be very profitable', 'It has nothing to do with the share price'] },
  { q: 'Your stock fell from NT$100 to NT$90, but you haven\'t sold. What is this called?', o: ['Unrealized P&L', 'Realized P&L', 'Ex-dividend', 'Stop-loss'] },
  { q: 'Your assets fell from NT$1.1 million to NT$990,000. What is the max drawdown?', o: ['10%', '11%', '1%', '9%'] },
  { q: 'When the central bank raises rates, which stocks usually feel the most pressure?', o: ['High-P/E growth stocks', 'All stocks equally', 'Only bank stocks', 'No effect at all'] },
  { q: 'What does a red candlestick mean?', o: ['The close is above the open', 'The close is below the open', 'Limit-up', 'Very heavy volume'] },
  { q: 'What does an ROE of 20% mean?', o: ['Every NT$100 shareholders put in earns NT$20 a year', 'The stock will rise 20%', 'The company\'s debt is 20%', 'The dividend yield is 20%'] },
  { q: 'What does "foreign investors net sold NT$100 billion" mean?', o: ['Foreign investors sold NT$100 billion more than they bought that day', 'Foreign investors lost NT$100 billion', 'Foreign investors now hold only NT$100 billion', 'Taiwan stocks fell 1,000 points'] },
  { q: 'Roughly what is the total cost of buying and then selling a Taiwan stock?', o: ['About 0.585%', 'About 0.1%', 'About 3%', 'Nothing'] },
  { q: 'Why diversify?', o: ['So one piece of bad news can\'t cost you a lot', 'You always earn more', 'You pay less tax', 'The fees are lower'] },
  { q: 'You place a limit buy at NT$100 while the stock is at NT$105. What happens?', o: ['It fills only when the price falls to NT$100 or below', 'It fills right away at NT$105', 'It fills right away at NT$100', 'The order is rejected'] },
  { q: 'What does a P/B ratio below 1 mean?', o: ['The share price is below book value per share', 'The company is losing money', 'The stock is expensive', 'The company has no debt'] },
  { q: 'EPS grew from NT$5 to NT$8. What does that mean?', o: ['Each share earns more for shareholders', 'The stock will definitely rise', 'Revenue fell', 'The P/E ratio rose'] }
];
function quizText(i) { return LANG === 'en' && QUIZ_EN[i] ? QUIZ_EN[i] : QUIZ[i]; }

// ---- 新聞（英文）：以中文標題對應 ----
const NEWS_EN = {
  '華航、長榮航公布9月營收 前三季營收亮眼': ['China Airlines and EVA Air report September revenue; strong first three quarters', 'China Airlines\' September consolidated revenue was NT$15.875 billion, the second-highest for the month on record, and its revenue for the first three quarters reached a record NT$154.929 billion for the period; EVA Air\'s September revenue was NT$15.617 billion, with NT$162.687 billion for the first three quarters.'],
  '台積電第三季EPS 17.44元 獲利創新高': ['TSMC Q3 EPS of NT$17.44, a record profit', 'TSMC\'s third-quarter revenue was NT$989.92 billion, up 30.3% year on year; gross margin was 59.5%, net income NT$452.3 billion and EPS NT$17.44, all better than the previous quarter.'],
  '美國聯準會降息一碼 利率區間3.5%至3.75%': ['US Fed cuts rates by a quarter point to a 3.5%–3.75% range', 'The Fed made its third quarter-point cut of the year. The vote was 9–3, the first time since September 2019 that three members dissented; the dot plot shows one more cut in each of 2026 and 2027.'],
  '央行理監事會決議利率不變 重貼現率維持2%': ['Taiwan\'s central bank holds rates; discount rate stays at 2%', 'The central bank kept rates unchanged for the seventh straight quarter, with the discount rate at 2%, and did not ease its selective credit controls on housing. It also raised this year\'s GDP growth forecast to 7.31% and expects 3.67% for 2026.'],
  '台股開紅盤收29349點 台積電創1585元新高': ['Taiwan stocks start 2026 up, closing at 29,349; TSMC hits a record NT$1,585', 'On the first trading day of 2026 the TAIEX rose 386.21 points to close at 29,349.81, a record closing high; TSMC rose NT$35 to close at a record NT$1,585.'],
  '記憶體股齊揚 華邦電站上百元 旺宏連三漲停': ['Memory stocks rally: Winbond tops NT$100, Macronix limit-up three days running', 'Winbond closed at NT$104, firmly above NT$100, and Nanya Technology touched its limit-up price of NT$228.5 intraday, a record high; Macronix hit limit-up for the third day in a row as the market focused on improving memory supply and demand and rising prices.'],
  '台積電法說 今年資本支出520億至560億美元': ['TSMC investor conference: 2026 capex of US$52–56 billion', 'At its investor conference TSMC guided 2026 capital expenditure of US$52–56 billion, above market expectations, mainly because of strong AI demand; actual 2025 capex was US$40.9 billion.'],
  '台美關稅談判達共識 對等關稅降至15%': ['Taiwan and US reach tariff deal; reciprocal tariff cut to 15%', 'Taiwan and the US concluded their tariff negotiations: the US reciprocal tariff on Taiwan is set at 15% with no stacking, Taiwan gets the most favourable treatment under the Section 232 semiconductor tariffs, and an investment cooperation memorandum was signed.'],
  '美伊爆發戰事 台股開盤重挫約800點': ['War breaks out between the US and Iran; Taiwan stocks open down about 800 points', 'With the US and Iran at war and Middle East tension rising, the TAIEX fell about 800 points at the open, dropping below 35,000; plastics and shipping stocks were strong, while electronics heavyweights such as Hon Hai and MediaTek weakened.'],
  '台股首度站上4萬點 單日大漲1778點': ['TAIEX tops 40,000 for the first time after a 1,778-point jump', 'The TAIEX rose 1,778.51 points to close at 40,705.14, breaking through the 40,000 mark for the first time.'],
  '強颱巴威來襲 台北股匯市7月10日休市': ['Typhoon Bavi: Taipei stock and currency markets closed on July 10', 'Because of Typhoon Bavi, Taipei and other cities suspended work and classes on July 10, and the stock, currency and futures markets were closed all day, with settlement postponed; ex-dividend dates for companies including China Airlines and Novatek moved to July 13.'],
  '台積電再上調資本支出 至600億至640億美元': ['TSMC raises capex again, to US$60–64 billion', 'At its investor conference TSMC raised its 2026 capex guidance for the second time, to a record US$60–64 billion; Q2 capex was US$15.7 billion, and it said dividends will keep growing steadily.'],
  '台股重挫2953點 創史上最大單日跌點': ['Taiwan stocks plunge 2,953 points, the biggest one-day point drop ever', 'The TAIEX fell 2,953.71 points (6.47%) to 42,671.27, the largest one-day point drop on record. Investors worried TSMC\'s big capex increase would hurt margins; the Philadelphia Semiconductor Index and SK hynix ADRs also slumped, and the three major institutional investors were net sellers of NT$261.7 billion.'],
  '雄獅上半年營收164.6億元 每股盈餘7.27元': ['Lion Travel H1 revenue of NT$16.46 billion, EPS NT$7.27', 'Lion Travel\'s first-half revenue was NT$16.461 billion, up 9.79% year on year, with net income attributable to the parent of NT$678 million and EPS of NT$7.27; the US–Iran conflict and swings in oil prices trimmed its gross margin slightly, while Japan and Korea products performed best.'],
  '美東線運價逼近疫情高峰 貨櫃三雄大漲': ['US East Coast freight rates near pandemic peak; big three container lines rally', 'The Shanghai Shipping Exchange quote for the US East Coast route reached US$9,568 per 40-foot container, and the market expects it to top US$10,000; Evergreen and Wan Hai hit two-month highs and Yang Ming a five-month high.'],
  '聯準會升息一碼 為2023年以來首度升息': ['Fed hikes by a quarter point, its first increase since 2023', 'The US Federal Reserve announced a quarter-point hike on September 16 (US time), lifting its target range to 3.75%–4.00%, its first rate increase since July 2023.'],
  '央行利率連十次不變 上修今年經濟成長率至11.48%': ['Central bank holds rates for the tenth straight time, raises this year\'s growth forecast to 11.48%', 'At its third-quarter board meeting the central bank kept the discount rate at 2% and forecast full-year consumer price inflation of 2.03%; Governor Yang Chin-long cited the K-shaped economy and mortgage burdens as reasons not to hike.'],
  '美伊談判無突破 台股收跌392點 聯發科跌7%': ['US–Iran talks stall; TAIEX closes down 392 points, MediaTek falls 7%', 'With no progress on a US–Iran ceasefire or on talks over the Strait of Hormuz, oil prices and US Treasury yields rose; the TAIEX fell 392.64 points to close at 47,631.96. MediaTek fell 7.10% while TSMC closed flat.'],
  '資金轉進ABF載板 南電盤中漲逾7%': ['Money rotates into ABF substrates; Nan Ya PCB jumps over 7% intraday', 'Money moved out of panel and glass-substrate stocks into ABF substrates: Nan Ya PCB rose more than 7% intraday, and Kinsus and Unimicron also climbed, as the market focused on AI chips lifting substrate demand and a supply gap.'],
  '0056預估季配1.72元 10月22日除息': ['0056 expects a NT$1.72 quarterly dividend, ex-dividend October 22', 'Yuanta Taiwan High Dividend ETF (0056) announced an estimated fourth-quarter distribution of NT$1.72 per unit. The last day to buy is October 21, the ex-dividend date is October 22 and payment is on November 11; the final amount is expected to be confirmed on October 20.'],
  '鴻海9月營收1.16兆元 台股盤中逼近5萬點': ['Hon Hai September revenue of NT$1.16 trillion; TAIEX nears 50,000 intraday', 'Hon Hai\'s September consolidated revenue was NT$1.16 trillion, up 25.7% month on month and 38.4% year on year; the TAIEX hit an intraday high of 49,770.66, and eight high-priced stocks including Elite Material and Gold Circuit Electronics hit limit-up during the session.'],
  '緯穎9月營收1726億元 年增100%': ['Wiwynn September revenue of NT$172.6 billion, up 100% year on year', 'Wiwynn\'s September consolidated revenue was NT$172.62 billion, up 19.6% month on month and 100% year on year; revenue for the first nine months totalled NT$989.278 billion, up 50.3%.'],
  '旺季遞延效應發酵 長榮、萬海盤中漲停': ['Delayed peak season lifts shippers; Evergreen and Wan Hai hit limit-up intraday', 'Evergreen and Wan Hai hit limit-up during the session and Yang Ming rose more than 7%. Evergreen said the peak season has been pushed back and bookings should stay strong into November; Wan Hai said demand after China\'s Golden Week holiday recovered more strongly than in past years.'],
  '外資賣超1653億元 台股下跌960點': ['Foreign investors net sell NT$165.3 billion; TAIEX falls 960 points', 'Foreign investors were net sellers of NT$165.342 billion in a single day, the third-largest on record; the TAIEX fell 960.65 points to close at 48,341.31. TSMC and memory stocks were the main targets, and the New Taiwan dollar weakened past 32 to the US dollar.'],
  '南亞科第三季EPS 25.4元 毛利率85.7%': ['Nanya Technology Q3 EPS of NT$25.4, gross margin 85.7%', 'Nanya Technology\'s third-quarter revenue was NT$133.649 billion, up 61.9% quarter on quarter, with a gross margin of 85.7% and EPS of NT$25.4; on the same day its stock fell more than 7% to NT$488.'],
  '台積電第三季EPS 29.43元 上修全年成長': ['TSMC Q3 EPS of NT$29.43; full-year growth outlook raised', 'TSMC\'s third-quarter revenue was about NT$1.49 trillion, up 50.9% year on year, with a gross margin of 66.4% and record EPS of NT$29.43; it raised its full-year US-dollar revenue growth forecast to about 44%.'],
  '外資賣超3025億元創紀錄 台股跌1656點': ['Record NT$302.6 billion of foreign net selling; TAIEX falls 1,656 points', 'US September consumer prices rose 3.7% year on year, above expectations, raising fears of further Fed hikes; the TAIEX fell 1,655.96 points to close at 46,969.87, and foreign investors\' single-day net selling of NT$302.555 billion set a new record.'],
  'AI股帶動 台股上漲594點收46887點': ['AI stocks lead the way; TAIEX rises 594 points to 46,887', 'Strong results from SpaceX and Super Micro after the US close lifted AI-related stocks; the TAIEX rose as much as about 900 points intraday and closed up 594.84 points at 46,887.77, with TSMC closing at NT$2,420.']
};
function newsHead(n) { return LANG === 'en' && NEWS_EN[n.headline] ? NEWS_EN[n.headline][0] : n.headline; }
function newsSum(n) { return LANG === 'en' && NEWS_EN[n.headline] ? NEWS_EN[n.headline][1] : n.summary; }

// ---- 成就 ----
const BADGE_TXT = {
  first: ['第一筆交易', 'First trade'],
  div: ['分散投資：同時持有 5 檔', 'Diversified: 5 stocks at once'],
  sector: ['跨產業：持有 4 個產業', 'Cross-sector: 4 industries held'],
  stop: ['學會認賠', 'Learned to cut a loss'],
  terms: ['術語達人：讀了 20 個術語', 'Term expert: 20 terms read'],
  quiz: ['小測驗答對 10 題', '10 quiz answers right']
};
function badgeLabel(b) { const t = BADGE_TXT[b.id]; return t ? tr(t[0], t[1]) : b.label; }

// ---- 靜態文字（index.html 裡的 data-en / data-en-ph） ----
const I18N_TITLE = ['股市練習所｜用真實台股練習投資', 'Stock Practice Lab | Learn to invest with real Taiwan stocks'];
const _staticEls = [...document.querySelectorAll('[data-en]')].map(el => ({ el, zh: el.innerHTML }));
const _phEls = [...document.querySelectorAll('[data-en-ph]')].map(el => ({ el, zh: el.getAttribute('placeholder') }));
const _titleEls = [...document.querySelectorAll('[data-en-title]')].map(el => ({ el, zh: el.getAttribute('title') }));
function applyStaticLang() {
  const en = LANG === 'en';
  document.documentElement.lang = en ? 'en' : 'zh-Hant-TW';
  document.title = en ? I18N_TITLE[1] : I18N_TITLE[0];
  for (const { el, zh } of _staticEls) el.innerHTML = en ? el.dataset.en : zh;
  for (const { el, zh } of _phEls) el.setAttribute('placeholder', en ? el.dataset.enPh : zh);
  for (const { el, zh } of _titleEls) el.setAttribute('title', en ? el.dataset.enTitle : zh);
}
function setLang(l) {
  if (l !== 'en' && l !== 'zh') return;
  LANG = l;
  try { localStorage.setItem(LANG_KEY, l); } catch (e) { }
  applyStaticLang();
  if (typeof UI !== 'undefined' && UI.relang) UI.relang();
}
document.addEventListener('click', e => { if (e.target.closest('.langbtn')) { e.stopPropagation(); setLang(LANG === 'en' ? 'zh' : 'en'); } }, true);
applyStaticLang();
