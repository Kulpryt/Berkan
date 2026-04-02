// app/api/finance/score/[ticker]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const FMP_KEY = process.env.FMP_API_KEY!;
const AV_KEY  = process.env.ALPHA_VANTAGE_API_KEY!;

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
  } catch { return 50; }
}

async function getSentimentData(ticker: string) {
  const empty = { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0, consensus: "N/A", sentimentScore: 50, totalAnalysts: 0 };
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/grades-consensus?symbol=${ticker}&apikey=${FMP_KEY}`
    );
    const data = await safeParse(res);
    const d = Array.isArray(data) ? data[0] : data;
    if (!d) return empty;
    const strongBuy = d.strongBuy ?? 0, buy = d.buy ?? 0, hold = d.hold ?? 0;
    const sell = d.sell ?? 0, strongSell = d.strongSell ?? 0;
    const total = strongBuy + buy + hold + sell + strongSell;
    return {
      strongBuy, buy, hold, sell, strongSell,
      consensus: d.consensus ?? "N/A",
      sentimentScore: total === 0 ? 50 : Math.round(clamp(((strongBuy + buy) / total) * 100)),
      totalAnalysts: total,
    };
  } catch { return empty; }
}

// ── Alpha Vantage — enrichissement fondamental pour la recherche ──────
export type AVFundamentals = {
  name: string | null;
  sector: string | null;
  industry: string | null;
  marketCap: string | null;
  pe: number | null;
  eps: number | null;
  profitMargin: number | null;
  roe: number | null;
  revenueGrowthYoY: number | null;
  dividendYield: number | null;
  weekHigh52: number | null;
  weekLow52: number | null;
  analystTargetPrice: number | null;
  description: string | null;
};

async function getAVFundamentals(ticker: string): Promise<AVFundamentals | null> {
  if (!AV_KEY) return null;
  try {
    const res = await fetchWithTimeout(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${ticker}&apikey=${AV_KEY}`
    );
    const d = await safeParse(res);
    // Alpha Vantage retourne {} ou { Information: "..." } si ticker inconnu / quota dépassé
    if (!d || !d.Symbol || d.Information) return null;

    const toNum = (v: any) => {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    };

    return {
      name:               d.Name ?? null,
      sector:             d.Sector ?? null,
      industry:           d.Industry ?? null,
      marketCap:          d.MarketCapitalization ?? null,
      pe:                 toNum(d.PERatio),
      eps:                toNum(d.EPS),
      profitMargin:       toNum(d.ProfitMargin),
      roe:                toNum(d.ReturnOnEquityTTM),
      revenueGrowthYoY:   toNum(d.QuarterlyRevenueGrowthYOY),
      dividendYield:      toNum(d.DividendYield),
      weekHigh52:         toNum(d["52WeekHigh"]),
      weekLow52:          toNum(d["52WeekLow"]),
      analystTargetPrice: toNum(d.AnalystTargetPrice),
      description:        d.Description ?? null,
    };
  } catch (err: any) {
    console.error(`[${ticker}] AV error:`, err?.message ?? err);
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  // 1. KV d'abord pour les tickers de la watchlist (0 requête API)
  try {
    const stored = await kv.get<{ data: any[] }>("finance:scores");
    const cached = stored?.data?.find(s => s.ticker === ticker);
    if (cached) {
      // Enrichit quand même avec AV même si en cache — données fraîches et AV n'est pas dans KV
      const av = await getAVFundamentals(ticker);
      return NextResponse.json({ ...cached, av });
    }
  } catch { /* KV indisponible → continue */ }

  // 2. Ticker hors watchlist → appels FMP + AV en parallèle
  try {
    const [quantScore, analystData, av] = await Promise.all([
      getQuantScore(ticker),
      getSentimentData(ticker),
      getAVFundamentals(ticker),
    ]);
    const { sentimentScore, ...analystBreakdown } = analystData;
    const conviction = Math.round(quantScore * 0.6 + sentimentScore * 0.4);

    return NextResponse.json({
      ticker,
      category: "Recherche",
      type: "stock",
      quantScore,
      sentimentScore,
      conviction,
      ...analystBreakdown,
      av,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[score/${ticker}]`, err);
    return NextResponse.json({ error: "Erreur lors du scoring" }, { status: 500 });
  }
}