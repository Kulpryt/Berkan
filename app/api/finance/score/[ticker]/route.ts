// app/api/finance/score/[ticker]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { kv } from "@vercel/kv";

const FMP_KEY = process.env.FMP_API_KEY!;

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

async function getSentimentData(ticker: string) {
  const empty = { strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0, consensus: "N/A", sentimentScore: 50, totalAnalysts: 0 };
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
    const sentimentScore = total === 0 ? 50 : Math.round(clamp(((strongBuy + buy) / total) * 100));

    return { strongBuy, buy, hold, sell, strongSell, consensus: d.consensus ?? "N/A", sentimentScore, totalAnalysts: total };
  } catch (err: any) {
    console.error(`[${ticker}] getSentimentData error:`, err?.message ?? err);
    return empty;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  // 1. Cherche dans KV d'abord → 0 requête FMP
  try {
    const stored = await kv.get<{ data: any[] }>("finance:scores");
    const cached = stored?.data?.find(s => s.ticker === ticker);
    if (cached) return NextResponse.json(cached);
  } catch {
    // KV indisponible → on continue vers FMP
  }

  // 2. Pas en cache → appel FMP live
  try {
    const [quantScore, analystData] = await Promise.all([
      getQuantScore(ticker),
      getSentimentData(ticker),
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
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[score/${ticker}]`, err);
    return NextResponse.json({ error: "Erreur lors du scoring" }, { status: 500 });
  }
}