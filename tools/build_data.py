"""把證交所抓下來的原始資料轉成遊戲用的 data/market.js
用法: python3 build_data.py stock-data.json stock-fins.json news.json out/market.js [--mock]
"""
import json, sys, random, datetime

SECTOR = {}
for codes, sec in [
    ("2330 2454 2303 3711 2379 3034 3443 3661 2449 6770 3035 6415 2360 6515 5269", "半導體"),
    ("2408 2344 2337 2451 4967 3006 8271", "記憶體"),
    ("3037 8046 3189 2368 2383 2313 4958 6213 3044 6269", "載板與 PCB"),
    ("2317 2382 3231 6669 2376 2357 3017 2345 3653 2059 2356 3533 8210 3665", "AI 伺服器"),
    ("2353 2324 4938 2395 2301 2327 3481", "電腦與零組件"),
    ("2308 1513 1519 1503 1504", "電力與能源"),
    ("3008 2412 3045 4904", "光學與電信"),
    ("2881 2882 2891 2886 2884 2885 2892 5880 2887", "金融"),
    ("2603 2609 2615 2606", "航運"),
    ("2618 2610 2646", "航空"),
    ("2731 2707 2727", "觀光餐飲"),
    ("2912 1216 9910 9921 1476", "民生消費"),
    ("1301 2002 1101 1326 1303 6505", "傳產原物料"),
    ("1795 2207 6446", "生技與汽車"),
    ("0050 0056 006208 00878 00919", "ETF"),
]:
    for c in codes.split():
        SECTOR[c] = sec
ORDER = list(SECTOR.keys())
START_DATE = "2026-09-07"   # 遊戲的「現在」：這天收盤後
END_DATE = "2026-10-22"


def roc_to_iso(s):
    y, m, d = s.split("/")
    return f"{int(y) + 1911:04d}-{int(m):02d}-{int(d):02d}"


def num(x):
    x = x.replace(",", "").strip()
    try:
        return float(x)
    except ValueError:
        return None


def main():
    raw_path, fins_path, news_path, out_path = sys.argv[1:5]
    raw = json.load(open(raw_path, encoding="utf-8"))
    fins_raw = json.load(open(fins_path, encoding="utf-8"))
    news = json.load(open(news_path, encoding="utf-8"))
    rows = {}
    names = dict(raw.get("names", {}))
    if "MI" in raw:   # 新格式：每日全市場收盤行情 {yyyymmdd: ["代號|名稱|成交股數|開|高|低|收", ...]}
        for dt, lines in raw["MI"].items():
            iso = f"{dt[:4]}-{dt[4:6]}-{dt[6:]}"
            if iso > END_DATE:
                continue
            for ln in lines:
                code, name, vol, o, h, l, c = ln.split("|")
                names[code] = name.replace("*", "").strip()
                o, h, l, c, v = num(o), num(h), num(l), num(c), num(vol)
                if c is None:
                    continue
                rows.setdefault(code, {})[iso] = (o if o is not None else c, h if h is not None else c, l if l is not None else c, c, round((v or 0) / 1000))
    else:             # 舊格式：個股日成交資訊
        for key, lines in raw["D"].items():
            code = key.split("_")[0]
            for ln in lines:
                date, vol, o, h, l, c = ln.split("|")
                iso = roc_to_iso(date)
                if iso > END_DATE:
                    continue
                o, h, l, c, v = num(o), num(h), num(l), num(c), num(vol)
                if c is None:
                    continue
                rows.setdefault(code, {})[iso] = (o, h, l, c, round((v or 0) / 1000))
    dates = sorted({d for r in rows.values() for d in r})
    # 從 START_DATE 往回取約 12 個月作為歷史
    start_idx_all = max(i for i, d in enumerate(dates) if d <= START_DATE)
    first = next(i for i, d in enumerate(dates) if d >= f"{int(START_DATE[:4]) - 1}{START_DATE[4:]}")
    dates = dates[first:]
    start_idx = start_idx_all - first
    stocks = []
    adjusted = []
    for code in ORDER:
        r = rows.get(code, {})
        def arr(k):
            return [r[d][k] if d in r else None for d in dates]
        # 還原股價：漲跌超過 10.5%（超出漲跌幅限制）只可能是分割或除權息，把之前的價格等比例調整
        o_, h_, l_, c_ = arr(0), arr(1), arr(2), arr(3)
        for i in range(1, start_idx + 1):
            if c_[i] is None or c_[i - 1] is None:
                continue
            ratio = c_[i] / c_[i - 1]
            if ratio < 0.895 or ratio > 1.105:
                ref = o_[i] if o_[i] else c_[i]
                f = ref / c_[i - 1]
                for j in range(i):
                    for a in (o_, h_, l_, c_):
                        if a[j] is not None:
                            a[j] = round(a[j] * f, 2)
                adjusted.append((code, dates[i], round(f, 4)))
        stocks.append({"code": code, "name": names.get(code, code), "sector": SECTOR[code], "etf": code.startswith("00"),
                       "o": o_, "h": h_, "l": l_, "c": c_, "v": arr(4)})
    fins = {}
    for line in fins_raw["rows"]:
        p = line.split(",")
        f = lambda x: float(x) if x not in ("", None) else None
        fins[p[0]] = {"q": p[1], "rev": f(p[2]), "gp": f(p[3]), "op": f(p[4]), "ni": f(p[5]), "eps": p[6], "ta": f(p[7]), "tl": f(p[8]), "eq": f(p[9]), "nav": f(p[10])}
    bw = {}
    for line in raw.get("bw", []):
        p = line.split("|")   # 代號|名稱|收盤價|殖利率|股利年度|本益比|股價淨值比|財報年季
        bw[p[0]] = {"yld": num(p[3]), "pe": num(p[5]), "pb": num(p[6])}
    news = [n for n in news if dates[0] <= n["date"] <= END_DATE]
    out = {"dates": dates, "startIdx": start_idx, "stocks": stocks, "fins": fins, "bw": bw, "news": news,
           "source": "臺灣證券交易所公開資料", "built": datetime.date.today().isoformat()}
    with open(out_path, "w", encoding="utf-8") as fp:
        fp.write("window.MARKET=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("dates", dates[0], "->", dates[-1], len(dates), "startIdx", start_idx, dates[start_idx], "future days", len(dates) - 1 - start_idx)
    print("adjusted", adjusted)
    missing = [s["code"] for s in stocks if all(x is None for x in s["c"])]
    print("stocks", len(stocks), "missing", missing, "fins", len(fins), "bw", len(bw), "news", len(news))


if __name__ == "__main__":
    main()
