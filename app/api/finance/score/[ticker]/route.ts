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
  if (!text || text.startsWith("Premium") || text.startsWith("Limit") || text.startsWith("<!") || text.includes("Special Endpoint")) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function resolveTicker(query: string): Promise<{ ticker: string; name: string; exchange: string } | null> {
  // Si ça ressemble déjà à un ticker (ex: AAPL, RXL.PA), pas besoin de résoudre
  if (/^[A-Z0-9]{1,6}(\.[A-Z]{1,2})?$/.test(query)) {
    return { ticker: query, name: query, exchange: "" };
  }
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/search-symbol?query=${encodeURIComponent(query)}&limit=5&apikey=${FMP_KEY}`
    );
    const data = await safeParse(res);
    if (!Array.isArray(data) || data.length === 0) return null;

    const exact = data.find((d: any) => d.symbol.toUpperCase() === query.toUpperCase());
    if (exact) return { ticker: exact.symbol, name: exact.name, exchange: exact.stockExchange ?? "" };
    return { ticker: data[0].symbol, name: data[0].name, exchange: data[0].stockExchange ?? "" };
  } catch (err: any) {
    console.error(`[resolveTicker] error:`, err?.message ?? err);
    return null;
  }
}

// Retourne null si bloqué par le plan FMP, un nombre sinon
async function getQuantScore(ticker: string): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/ratings-snapshot?symbol=${ticker}&apikey=${FMP_KEY}`
    );
    const data = await safeParse(res); // safeParse retourne null si "Special Endpoint" détecté
    if (data === null) return null;    // bloqué ou vide → on signale explicitement

    const d = Array.isArray(data) ? data[0] : data;
    if (!d) return null;

    const subs = [
      d.discountedCashFlowScore, d.returnOnEquityScore, d.returnOnAssetsScore,
      d.debtToEquityScore, d.priceToEarningsScore, d.priceToBookScore,
    ].filter((s): s is number => s != null && s >= 1);
    if (subs.length === 0) return null;

    const avg = subs.reduce((a, b) => a + b, 0) / subs.length;
    return Math.round(clamp(((avg - 1) / 4) * 100));
  } catch { return null; }
}

type AnalystData = {
  strongBuy: number; buy: number; hold: number; sell: number; strongSell: number;
  consensus: string; sentimentScore: number | null; totalAnalysts: number;
  blocked: boolean;
};

async function getSentimentData(ticker: string): Promise<AnalystData> {
  const empty: AnalystData = {
    strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0,
    consensus: "N/A", sentimentScore: null, totalAnalysts: 0, blocked: false,
  };
  try {
    const res = await fetchWithTimeout(
      `https://financialmodelingprep.com/stable/grades-consensus?symbol=${ticker}&apikey=${FMP_KEY}`
    );
    const data = await safeParse(res);
    if (data === null) return { ...empty, blocked: true }; // bloqué plan FMP

    const d = Array.isArray(data) ? data[0] : data;
    if (!d) return empty;

    const strongBuy = d.strongBuy ?? 0, buy = d.buy ?? 0, hold = d.hold ?? 0;
    const sell = d.sell ?? 0, strongSell = d.strongSell ?? 0;
    const total = strongBuy + buy + hold + sell + strongSell;
    return {
      strongBuy, buy, hold, sell, strongSell,
      consensus: d.consensus ?? "N/A",
      sentimentScore: total === 0 ? null : Math.round(clamp(((strongBuy + buy) / total) * 100)),
      totalAnalysts: total,
      blocked: false,
    };
  } catch { return empty; }
}

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
    if (!d || !d.Symbol || d.Information) return null;
    const toNum = (v: any) => { const n = parseFloat(v); return isNaN(n) ? null : n; };
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
    console.error(`[${ticker}] AV OVERVIEW error:`, err?.message ?? err);
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params;
  const rawQuery = rawTicker.toUpperCase();

  let resolvedTicker = rawQuery;
  let resolvedName: string | null = null;
  let resolvedRegion: string | null = null;

  const resolved = await resolveTicker(rawQuery);
  if (resolved) {
    resolvedTicker = resolved.ticker;
    resolvedName   = resolved.name;
    resolvedRegion = resolved.exchange || null;
  }

  // KV cache pour les tickers de la watchlist
  try {
    const stored = await kv.get<{ data: any[] }>("finance:scores");
    const cached = stored?.data?.find(s => s.ticker === resolvedTicker);
    if (cached) {
      const av = await getAVFundamentals(resolvedTicker);
      return NextResponse.json({
        ...cached,
        av,
        resolvedFrom: rawQuery !== resolvedTicker ? rawQuery : undefined,
      });
    }
  } catch { /* KV indisponible */ }

  // Score FMP + AV en parallèle
  try {
    const [quantScore, analystData, av] = await Promise.all([
      getQuantScore(resolvedTicker),
      getSentimentData(resolvedTicker),
      getAVFundamentals(resolvedTicker),
    ]);

    const { sentimentScore, blocked, ...analystBreakdown } = analystData;
    const hasSentiment = analystData.totalAnalysts > 0 && sentimentScore !== null;

    // Conviction = null si tout est bloqué, sinon calcul normal
    let conviction: number | null = null;
    if (quantScore !== null && hasSentiment) {
      conviction = Math.round(quantScore * 0.6 + sentimentScore! * 0.4);
    } else if (quantScore !== null) {
      conviction = quantScore;
    } else if (hasSentiment) {
      conviction = sentimentScore;
    }
    // Si quantScore === null && !hasSentiment → conviction reste null (données indisponibles)

    const dataUnavailable = quantScore === null && !hasSentiment;

    return NextResponse.json({
      ticker: resolvedTicker,
      name: av?.name ?? resolvedName ?? resolvedTicker,
      region: resolvedRegion ?? "United States",
      category: "Recherche",
      type: "stock",
      quantScore,
      sentimentScore: hasSentiment ? sentimentScore : null,
      conviction,
      ...analystBreakdown,
      av,
      dataUnavailable, // flag pour le front
      resolvedFrom: rawQuery !== resolvedTicker ? rawQuery : undefined,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[score/${resolvedTicker}]`, err);
    return NextResponse.json({ error: "Erreur lors du scoring" }, { status: 500 });
  }
}