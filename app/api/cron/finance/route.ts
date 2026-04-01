import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const FMP_KEY = process.env.FMP_API_KEY!;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY!;

/* ── Ta watchlist ── */
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

async function getQuantScore(ticker: string): Promise<number> {
  try {
    const [ratingsRes, ratiosRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/api/v3/analyst-stock-recommendations/${ticker}?limit=5&apikey=${FMP_KEY}`),
      fetch(`https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}?apikey=${FMP_KEY}`),
    ]);
    const ratings = await ratingsRes.json();
    const ratios = await ratiosRes.json();

    let score = 50;
    let components = 0;

    if (Array.isArray(ratings) && ratings.length > 0) {
      const latest = ratings[0];
      const positive = (latest.analystRatingsbuy || 0) + (latest.analystRatingsStrongBuy || 0);
      const negative = (latest.analystRatingsSell || 0) + (latest.analystRatingsStrongSell || 0);
      const total = positive + negative + (latest.analystRatingsHold || 0);
      if (total > 0) { score += clamp((positive / total) * 100); components++; }
    }

    if (Array.isArray(ratios) && ratios.length > 0) {
      const pe = ratios[0].peRatioTTM;
      if (pe && pe > 0 && pe < 200) { score += normalize(pe, 40, 5); components++; }
      const roe = ratios[0].returnOnEquityTTM;
      if (roe != null) { score += normalize(roe * 100, -10, 40); components++; }
    }

    if (components > 0) score = score / (components + 1);
    return Math.round(clamp(score));
  } catch {
    return 50;
  }
}

async function getSentimentScore(ticker: string): Promise<number> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news-sentiment?symbol=${ticker}&token=${FINNHUB_KEY}`
    );
    const data = await res.json();
    if (!data || data.buzz === undefined) return 50;
    const bullish = (data.sentiment?.bullishPercent ?? 0.5) * 100;
    const buzz = clamp((data.buzz?.buzz ?? 0.5) * 100);
    return Math.round(clamp(bullish * 0.7 + buzz * 0.3));
  } catch {
    return 50;
  }
}

/* ── Handler cron ── */
export async function GET(req: NextRequest) {
  // Sécurité : Vercel envoie ce header sur les cron jobs
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log("[cron/finance] Début du scoring watchlist...");

  // On score par batch de 5 pour ne pas dépasser les limites API
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
    // Petite pause entre les batches pour respecter les rate limits
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