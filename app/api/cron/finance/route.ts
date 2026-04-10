// app/api/cron/finance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const FMP_KEY = process.env.FMP_API_KEY!;

export type AssetType = "stock" | "etf";
export type WatchItem = { ticker: string; name: string; category: string; type: AssetType };

export const WATCHLIST: WatchItem[] = [
  // Big Tech
  { ticker: "AAPL",  name: "Apple",           category: "Big Tech",      type: "stock" },
  { ticker: "MSFT",  name: "Microsoft",        category: "Big Tech",      type: "stock" },
  { ticker: "NVDA",  name: "NVIDIA",           category: "Big Tech",      type: "stock" },
  { ticker: "META",  name: "Meta Platforms",   category: "Big Tech",      type: "stock" },
  { ticker: "GOOGL", name: "Alphabet",         category: "Big Tech",      type: "stock" },
  { ticker: "AMZN",  name: "Amazon",           category: "Big Tech",      type: "stock" },
  { ticker: "TSLA",  name: "Tesla",            category: "Big Tech",      type: "stock" },
  { ticker: "AMD",   name: "AMD",              category: "Big Tech",      type: "stock" },
  { ticker: "ORCL",  name: "Oracle",           category: "Big Tech",      type: "stock" },
  { ticker: "NFLX",  name: "Netflix",          category: "Big Tech",      type: "stock" },
  // Finance
  { ticker: "JPM",   name: "JPMorgan Chase",   category: "Finance",       type: "stock" },
  { ticker: "V",     name: "Visa",             category: "Finance",       type: "stock" },
  { ticker: "MA",    name: "Mastercard",       category: "Finance",       type: "stock" },
  { ticker: "BAC",   name: "Bank of America",  category: "Finance",       type: "stock" },
  { ticker: "GS",    name: "Goldman Sachs",    category: "Finance",       type: "stock" },
  { ticker: "BRK-B", name: "Berkshire Hathaway", category: "Finance",    type: "stock" },
  // ETFs larges
  { ticker: "SPY",   name: "S&P 500 ETF",      category: "ETF Large",     type: "etf"   },
  { ticker: "QQQ",   name: "Nasdaq 100 ETF",   category: "ETF Large",     type: "etf"   },
  { ticker: "VOO",   name: "Vanguard S&P 500", category: "ETF Large",     type: "etf"   },
  { ticker: "IVV",   name: "iShares S&P 500",  category: "ETF Large",     type: "etf"   },
  // ETFs sectoriels
  { ticker: "VGT",   name: "Vanguard IT ETF",  category: "ETF Sectoriel", type: "etf"   },
  { ticker: "XLF",   name: "Financial ETF",    category: "ETF Sectoriel", type: "etf"   },
  { ticker: "XLK",   name: "Technology ETF",   category: "ETF Sectoriel", type: "etf"   },
  { ticker: "SOXX",  name: "Semiconductors ETF", category: "ETF Sectoriel", type: "etf" },
  // Crypto ETFs
  { ticker: "IBIT",  name: "iShares Bitcoin",  category: "Crypto ETF",    type: "etf"   },
  { ticker: "FBTC",  name: "Fidelity Bitcoin", category: "Crypto ETF",    type: "etf"   },
  { ticker: "ARKB",  name: "ARK Bitcoin ETF",  category: "Crypto ETF",    type: "etf"   },
  // Europe (ADR cotés US — compatibles FMP gratuit)
  { ticker: "ASML",  name: "ASML",             category: "Europe",        type: "stock" },
  { ticker: "NVO",   name: "Novo Nordisk",     category: "Europe",        type: "stock" },
  { ticker: "SAP",   name: "SAP",              category: "Europe",        type: "stock" },
  { ticker: "IDEXY", name: "LVMH (ADR)",       category: "Europe",        type: "stock" },
  // Dividendes
  { ticker: "JNJ",   name: "Johnson & Johnson", category: "Dividendes",   type: "stock" },
  { ticker: "KO",    name: "Coca-Cola",         category: "Dividendes",   type: "stock" },
  { ticker: "PG",    name: "Procter & Gamble",  category: "Dividendes",   type: "stock" },
  { ticker: "VZ",    name: "Verizon",           category: "Dividendes",   type: "stock" },
  { ticker: "SCHD",  name: "Schwab Dividend ETF", category: "Dividendes", type: "etf"  },
];

function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { signal: controller.signal }); }
  finally { clearTimeout(id); }
}

async function safeParse(res: Response): Promise<any | null> {
  const text = await res.text();
  if (!text || text.startsWith("Premium") || text.startsWith("Limit") || text.startsWith("<!")) return null;
  try { return JSON.parse(text); } catch { return null; }
}

export type FearGreedData = {
  score: number; rating: string; prevWeek: number; prevMonth: number;
};

async function getFearAndGreed(): Promise<FearGreedData | null> {
  try {
    const res = await fetchWithTimeout("https://api.alternative.me/fng/?limit=30", 6000);
    const data = await safeParse(res);
    if (!data?.data?.length) return null;
    const [today, prevWeek, prevMonth] = [data.data[0], data.data[6], data.data[29]];
    return {
      score:     parseInt(today.value),
      rating:    today.value_classification,
      prevWeek:  parseInt(prevWeek?.value ?? today.value),
      prevMonth: parseInt(prevMonth?.value ?? today.value),
    };
  } catch (err: any) {
    console.error("[cron] Fear&Greed error:", err?.message ?? err);
    return null;
  }
}

async function getQuantScore(ticker: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/ratings-snapshot?symbol=${ticker}&apikey=${FMP_KEY}`
    );
    const rating = await safeParse(res);
    const d = Array.isArray(rating) ? rating[0] : rating;
    if (!d) return 50;
    const subs = [
      d.discountedCashFlowScore, d.returnOnEquityScore, d.returnOnAssetsScore,
      d.debtToEquityScore, d.priceToEarningsScore, d.priceToBookScore,
    ].filter((s): s is number => s != null && s >= 1);
    if (subs.length === 0) return 50;
    const avg = subs.reduce((a, b) => a + b, 0) / subs.length;
    return Math.round(clamp(((avg - 1) / 4) * 100));
  } catch (err: any) {
    console.error(`[${ticker}] getQuantScore error:`, err?.message ?? err);
    return 50;
  }
}

async function getETFMomentumScore(ticker: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/quote?symbol=${ticker}&apikey=${FMP_KEY}`
    );
    const data = await safeParse(res);
    const d = Array.isArray(data) ? data[0] : data;
    if (!d) return 50;
    const price = d.price ?? 0, yearHigh = d.yearHigh ?? price, yearLow = d.yearLow ?? price;
    const avg50 = d.priceAvg50 ?? price, avg200 = d.priceAvg200 ?? price;
    const changePct = d.changePercentage ?? 0;
    const range = yearHigh - yearLow;
    const rangeScore = range > 0 ? clamp(((price - yearLow) / range) * 100) : 50;
    const ma200Score = avg200 > 0 ? clamp(50 + ((price - avg200) / avg200) * 200) : 50;
    const crossScore = avg200 > 0 ? clamp(50 + ((avg50 - avg200) / avg200) * 300) : 50;
    const dayScore   = clamp(50 + (changePct / 3) * 50);
    return Math.round(rangeScore * 0.4 + ma200Score * 0.25 + crossScore * 0.25 + dayScore * 0.1);
  } catch (err: any) {
    console.error(`[${ticker}] getETFMomentumScore error:`, err?.message ?? err);
    return 50;
  }
}

export type AnalystData = {
  strongBuy: number; buy: number; hold: number; sell: number; strongSell: number;
  consensus: string; sentimentScore: number; totalAnalysts: number;
};

async function getSentimentData(ticker: string): Promise<AnalystData> {
  const empty: AnalystData = {
    strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0,
    consensus: "N/A", sentimentScore: 50, totalAnalysts: 0,
  };
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/grades-consensus?symbol=${ticker}&apikey=${FMP_KEY}`
    );
    const data = await safeParse(res);
    const d = Array.isArray(data) ? data[0] : data;
    if (d) {
      const strongBuy = d.strongBuy ?? 0, buy = d.buy ?? 0, hold = d.hold ?? 0;
      const sell = d.sell ?? 0, strongSell = d.strongSell ?? 0;
      const total = strongBuy + buy + hold + sell + strongSell;
      if (total > 0) return {
        strongBuy, buy, hold, sell, strongSell,
        consensus: d.consensus ?? "N/A",
        sentimentScore: Math.round(clamp(((strongBuy + buy) / total) * 100)),
        totalAnalysts: total,
      };
    }
  } catch { /* continue */ }
  return empty;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Guard quota FMP
  try {
    const testRes = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/ratings-snapshot?symbol=AAPL&apikey=${FMP_KEY}`
    );
    const testText = await testRes.text();
    if (testText.startsWith("Premium") || testText.startsWith("Limit")) {
      console.warn("[cron/finance] Quota FMP épuisé — KV non modifié.");
      return NextResponse.json({ error: "FMP quota exhausted", kvPreserved: true }, { status: 429 });
    }
  } catch (err: any) {
    console.error("[cron/finance] FMP unreachable:", err?.message ?? err);
    return NextResponse.json({ error: "FMP unreachable" }, { status: 503 });
  }

  console.log("[cron/finance] Début scoring —", WATCHLIST.length, "tickers");
  const fearGreedPromise = getFearAndGreed();
  const results = [];

  for (let i = 0; i < WATCHLIST.length; i += 10) {
  const batch = WATCHLIST.slice(i, i + 10);
    const batchResults = await Promise.all(
      batch.map(async ({ ticker, name, category, type }) => {
        if (type === "etf") {
          const momentumScore = await getETFMomentumScore(ticker);
          return {
            ticker, name, category, type,
            quantScore: null, sentimentScore: null, momentumScore,
            conviction: momentumScore,
            strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0,
            consensus: "ETF", totalAnalysts: 0,
          };
        }
        const [quantScore, analystData] = await Promise.all([
          getQuantScore(ticker),
          getSentimentData(ticker),
        ]);
        const { sentimentScore, ...analystBreakdown } = analystData;
        const hasSentiment = analystData.totalAnalysts > 0;
        const conviction = hasSentiment
          ? Math.round(quantScore * 0.6 + sentimentScore * 0.4)
          : quantScore;
        return {
          ticker, name, category, type,
          quantScore,
          sentimentScore: hasSentiment ? sentimentScore : null,
          momentumScore: null,
          conviction,
          ...analystBreakdown,
        };
      })
    );
    results.push(...batchResults);
    if (i + 10 < WATCHLIST.length) await new Promise(r => setTimeout(r, 300));
  }

  const sorted = results.sort((a, b) => (b.conviction ?? 0) - (a.conviction ?? 0));
  const fearGreed = await fearGreedPromise;
  const todayKey = new Date().toISOString().slice(0, 10);

  let history: Record<string, { ticker: string; rank: number; conviction: number | null }[]> = {};
  try {
    const existing = await kv.get<{ history?: typeof history }>("finance:scores");
    history = existing?.history ?? {};
  } catch { /* premier run */ }

  history[todayKey] = sorted.map((s, i) => ({ ticker: s.ticker, rank: i + 1, conviction: s.conviction ?? null }));
  const sortedKeys = Object.keys(history).sort().reverse().slice(0, 14);
  const trimmedHistory: typeof history = {};
  for (const k of sortedKeys) trimmedHistory[k] = history[k];

  await kv.set("finance:scores", {
    updatedAt: new Date().toISOString(),
    data: sorted,
    fearGreed,
    history: trimmedHistory,
  });

  console.log(`[cron/finance] ${sorted.length} tickers. Fear&Greed: ${fearGreed?.score ?? "N/A"}`);
  return NextResponse.json({ ok: true, count: sorted.length, fearGreed });
}