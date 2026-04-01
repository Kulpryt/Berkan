import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const FMP_KEY = process.env.FMP_API_KEY!;

export type AssetType = "stock" | "etf";

export type WatchItem = {
  ticker: string;
  category: string;
  type: AssetType;
};

export const WATCHLIST: WatchItem[] = [
  // Big Tech
  { ticker: "AAPL",  category: "Big Tech",        type: "stock" },
  { ticker: "MSFT",  category: "Big Tech",        type: "stock" },
  { ticker: "NVDA",  category: "Big Tech",        type: "stock" },
  { ticker: "META",  category: "Big Tech",        type: "stock" },
  { ticker: "GOOGL", category: "Big Tech",        type: "stock" },
  { ticker: "AMZN",  category: "Big Tech",        type: "stock" },
  { ticker: "TSLA",  category: "Big Tech",        type: "stock" },
  { ticker: "AMD",   category: "Big Tech",        type: "stock" },
  { ticker: "ORCL",  category: "Big Tech",        type: "stock" },
  { ticker: "NFLX",  category: "Big Tech",        type: "stock" },
  // Finance
  { ticker: "JPM",   category: "Finance",         type: "stock" },
  { ticker: "V",     category: "Finance",         type: "stock" },
  { ticker: "MA",    category: "Finance",         type: "stock" },
  { ticker: "BAC",   category: "Finance",         type: "stock" },
  { ticker: "GS",    category: "Finance",         type: "stock" },
  { ticker: "BRK-B", category: "Finance",         type: "stock" },
  // ETFs larges
  { ticker: "SPY",   category: "ETF Large",       type: "etf" },
  { ticker: "QQQ",   category: "ETF Large",       type: "etf" },
  { ticker: "VOO",   category: "ETF Large",       type: "etf" },
  { ticker: "IVV",   category: "ETF Large",       type: "etf" },
  // ETFs sectoriels
  { ticker: "VGT",   category: "ETF Sectoriel",   type: "etf" },
  { ticker: "XLF",   category: "ETF Sectoriel",   type: "etf" },
  { ticker: "XLK",   category: "ETF Sectoriel",   type: "etf" },
  { ticker: "SOXX",  category: "ETF Sectoriel",   type: "etf" },
  // Crypto ETFs
  { ticker: "IBIT",  category: "Crypto ETF",      type: "etf" },
  { ticker: "FBTC",  category: "Crypto ETF",      type: "etf" },
  { ticker: "ARKB",  category: "Crypto ETF",      type: "etf" },
  // Europe
  { ticker: "ASML",  category: "Europe",          type: "stock" },
  { ticker: "NVO",   category: "Europe",          type: "stock" },
  { ticker: "SAP",   category: "Europe",          type: "stock" },
  { ticker: "LVMHF", category: "Europe",          type: "stock" },
  // Dividendes
  { ticker: "JNJ",   category: "Dividendes",      type: "stock" },
  { ticker: "KO",    category: "Dividendes",      type: "stock" },
  { ticker: "PG",    category: "Dividendes",      type: "stock" },
  { ticker: "VZ",    category: "Dividendes",      type: "stock" },
  { ticker: "SCHD",  category: "Dividendes",      type: "etf"   },
];

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

async function fetchWithTimeout(url: string, ms = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function safeParse(res: Response): Promise<any | null> {
  const text = await res.text();
  if (!text || text.startsWith("Premium") || text.startsWith("Limit") || text.startsWith("<!")) return null;
  try { return JSON.parse(text); } catch { return null; }
}

// Quant : moyenne des 6 sous-scores FMP (1-5) normalisée en 0-100
async function getQuantScore(ticker: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/ratings-snapshot?symbol=${ticker}&apikey=${FMP_KEY}`
    );
    const rating = await safeParse(res);
    const d = Array.isArray(rating) ? rating[0] : rating;
    if (!d) return 50;

    const subs = [
      d.discountedCashFlowScore,
      d.returnOnEquityScore,
      d.returnOnAssetsScore,
      d.debtToEquityScore,
      d.priceToEarningsScore,
      d.priceToBookScore,
    ].filter((s): s is number => s != null && s >= 1);

    if (subs.length === 0) return 50;
    const avg = subs.reduce((a, b) => a + b, 0) / subs.length;
    return Math.round(clamp(((avg - 1) / 4) * 100));
  } catch (err: any) {
    console.error(`[${ticker}] getQuantScore error:`, err?.message ?? err);
    return 50;
  }
}

export type AnalystData = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensus: string;
  sentimentScore: number;
  totalAnalysts: number;
};

// Sentiment : consensus analystes FMP
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
    if (!d) return empty;

    const strongBuy  = d.strongBuy  ?? 0;
    const buy        = d.buy        ?? 0;
    const hold       = d.hold       ?? 0;
    const sell       = d.sell       ?? 0;
    const strongSell = d.strongSell ?? 0;
    const total = strongBuy + buy + hold + sell + strongSell;
    const sentimentScore = total === 0 ? 50
      : Math.round(clamp(((strongBuy + buy) / total) * 100));

    return { strongBuy, buy, hold, sell, strongSell, consensus: d.consensus ?? "N/A", sentimentScore, totalAnalysts: total };
  } catch (err: any) {
    console.error(`[${ticker}] getSentimentData error:`, err?.message ?? err);
    return empty;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron/finance] Début scoring — FMP_KEY:", !!process.env.FMP_API_KEY, "— tickers:", WATCHLIST.length);

  const results = [];
  for (let i = 0; i < WATCHLIST.length; i += 5) {
    const batch = WATCHLIST.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map(async ({ ticker, category, type }) => {
        // Pour les ETFs, pas de quant score FMP (pas de fondamentaux)
        const isETF = type === "etf";
        const [quantScore, analystData] = await Promise.all([
          isETF ? Promise.resolve(50) : getQuantScore(ticker),
          getSentimentData(ticker),
        ]);
        const { sentimentScore, ...analystBreakdown } = analystData;
        // ETF sans analystes → conviction = N/A (on met 50 neutre)
        const hasData = !isETF || analystData.totalAnalysts > 0;
        const conviction = hasData
          ? Math.round(quantScore * 0.6 + sentimentScore * 0.4)
          : 50;
        return { ticker, category, type, quantScore: isETF ? null : quantScore, sentimentScore: analystData.totalAnalysts > 0 ? sentimentScore : null, conviction: hasData ? conviction : null, ...analystBreakdown };
      })
    );
    results.push(...batchResults);
    if (i + 5 < WATCHLIST.length) await new Promise(r => setTimeout(r, 800));
  }

  // Tri : données réelles d'abord, puis par conviction desc
  const sorted = results.sort((a, b) => {
    if (a.conviction == null && b.conviction != null) return 1;
    if (a.conviction != null && b.conviction == null) return -1;
    return (b.conviction ?? 0) - (a.conviction ?? 0);
  });

  await kv.set("finance:scores", { updatedAt: new Date().toISOString(), data: sorted });
  console.log(`[cron/finance] ${sorted.length} tickers scorés et stockés.`);
  return NextResponse.json({ ok: true, count: sorted.length });
}