import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const FMP_KEY = process.env.FMP_API_KEY!;

const WATCHLIST = [
  "AAPL", "MSFT", "NVDA", "META", "GOOGL",
  "AMZN", "TSLA", "BRK-B", "JPM", "V",
  "QQQ", "SPY", "VOO", "VGT", "ARKK",
  "ASML", "TSM", "AMD", "ORCL", "NFLX",
];

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return clamp(((value - min) / (max - min)) * 100);
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

async function getQuantScore(ticker: string): Promise<number> {
  try {
    const [ratingRes, ratiosRes] = await Promise.all([
      fetchWithTimeout(`https://financialmodelingprep.com/stable/ratings-snapshot?symbol=${ticker}&apikey=${FMP_KEY}`),
      fetchWithTimeout(`https://financialmodelingprep.com/stable/financial-ratios?symbol=${ticker}&period=annual&limit=1&apikey=${FMP_KEY}`),
    ]);
    const rating = await ratingRes.json();
    const ratios = await ratiosRes.json();

    console.log(`[${ticker}] rating:`, JSON.stringify(rating).slice(0, 200));
    console.log(`[${ticker}] ratios:`, JSON.stringify(ratios).slice(0, 200));

    let score = 50;
    let components = 0;

    const ratingData = Array.isArray(rating) ? rating[0] : rating;
    if (ratingData?.ratingScore != null) {
      score += clamp(ratingData.ratingScore * 20);
      components++;
    }

    const r = Array.isArray(ratios) ? ratios[0] : null;
    if (r) {
      const pe = r.peRatio;
      if (pe && pe > 0 && pe < 200) { score += normalize(pe, 40, 5); components++; }
      const roe = r.returnOnEquity;
      if (roe != null) { score += normalize(roe * 100, -10, 40); components++; }
    }

    if (components > 0) score = score / (components + 1);
    return Math.round(clamp(score));
  } catch (err: any) {
    console.error(`[${ticker}] getQuantScore error:`, err?.message ?? err);
    return 50;
  }
}

async function getSentimentScore(ticker: string): Promise<number> {
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/grades-consensus?symbol=${ticker}&apikey=${FMP_KEY}`
    );
    const data = await res.json();

    console.log(`[${ticker}] sentiment:`, JSON.stringify(data).slice(0, 200));

    const d = Array.isArray(data) ? data[0] : data;
    if (!d) return 50;

    const buy = (d.strongBuy ?? 0) + (d.buy ?? 0);
    const sell = (d.strongSell ?? 0) + (d.sell ?? 0);
    const hold = d.hold ?? 0;
    const total = buy + sell + hold;

    if (total === 0) return 50;
    return Math.round(clamp((buy / total) * 100));
  } catch (err: any) {
    console.error(`[${ticker}] getSentimentScore error:`, err?.message ?? err);
    return 50;
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron/finance] Début du scoring, FMP_KEY défini ?", !!process.env.FMP_API_KEY);

  const results = [];
  for (let i = 0; i < WATCHLIST.length; i += 5) {
    const batch = WATCHLIST.slice(i, i + 5);
    const batchResults = await Promise.all(
      batch.map(async (ticker) => {
        const [quantScore, sentimentScore] = await Promise.all([
          getQuantScore(ticker),
          getSentimentScore(ticker),
        ]);
        const conviction = Math.round(quantScore * 0.6 + sentimentScore * 0.4);
        return { ticker, quantScore, sentimentScore, conviction };
      })
    );
    results.push(...batchResults);
    if (i + 5 < WATCHLIST.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  const sorted = results.sort((a, b) => b.conviction - a.conviction);

  await kv.set("finance:scores", {
    updatedAt: new Date().toISOString(),
    data: sorted,
  });

  console.log(`[cron/finance] ${sorted.length} tickers scorés et stockés.`);
  return NextResponse.json({ ok: true, count: sorted.length });
}