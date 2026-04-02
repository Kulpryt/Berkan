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

// ── Alpha Vantage : résolution du ticker depuis un nom ou ticker approximatif ──
// Retourne le meilleur ticker US, ou à défaut le premier résultat
async function resolveTickerAV(query: string): Promise<{ ticker: string; name: string; region: string } | null> {
  if (!AV_KEY) return null;
  try {
    const res = await fetchWithTimeout(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${AV_KEY}`
    );
    const data = await safeParse(res);
    if (!data?.bestMatches?.length) return null;

    const matches = data.bestMatches as Array<{
      "1. symbol": string;
      "2. name": string;
      "4. region": string;
      "9. matchScore": string;
    }>;

    // Priorité 1 : match exact du ticker (insensible à la casse)
    const exact = matches.find(m => m["1. symbol"].toUpperCase() === query.toUpperCase());
    if (exact) return { ticker: exact["1. symbol"], name: exact["2. name"], region: exact["4. region"] };

    // Priorité 2 : première action cotée en USD (marché US)
    const usMatch = matches.find(m => m["4. region"] === "United States");
    if (usMatch) return { ticker: usMatch["1. symbol"], name: usMatch["2. name"], region: usMatch["4. region"] };

    // Priorité 3 : premier résultat quel que soit le marché
    const first = matches[0];
    return { ticker: first["1. symbol"], name: first["2. name"], region: first["4. region"] };
  } catch (err: any) {
    console.error(`[resolveTickerAV] error:`, err?.message ?? err);
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

  // ── Étape 1 : résoudre le ticker via AV SYMBOL_SEARCH ──────────────
  // Permet de chercher "Verbio", "LVMH", "Total Energies", etc.
  let resolvedTicker = rawQuery;
  let resolvedName: string | null = null;
  let resolvedRegion: string | null = null;

  const avResolved = await resolveTickerAV(rawQuery);
  if (avResolved) {
    resolvedTicker = avResolved.ticker;
    resolvedName   = avResolved.name;
    resolvedRegion = avResolved.region;
    // Pour les tickers non-US (ex: VBK.DE), on note mais on tente quand même FMP
    if (avResolved.region !== "United States") {
      console.log(`[score] Ticker non-US résolu: ${resolvedTicker} (${resolvedRegion}) — FMP peut retourner 50`);
    }
  }

  // ── Étape 2 : KV cache pour les tickers de la watchlist ─────────────
  try {
    const stored = await kv.get<{ data: any[] }>("finance:scores");
    const cached = stored?.data?.find(s => s.ticker === resolvedTicker);
    if (cached) {
      // On enrichit avec AV OVERVIEW (1 appel AV)
      const av = await getAVFundamentals(resolvedTicker);
      return NextResponse.json({ ...cached, av, resolvedFrom: rawQuery !== resolvedTicker ? rawQuery : undefined });
    }
  } catch { /* KV indisponible → continue */ }

  // ── Étape 3 : Score FMP + données AV OVERVIEW en parallèle ──────────
  // AV SYMBOL_SEARCH a déjà consommé 1 call, OVERVIEW en consomme 1 autre
  try {
    const [quantScore, analystData, av] = await Promise.all([
      getQuantScore(resolvedTicker),
      getSentimentData(resolvedTicker),
      getAVFundamentals(resolvedTicker),
    ]);
    const { sentimentScore, ...analystBreakdown } = analystData;
    const hasSentiment = analystData.totalAnalysts > 0;
    const conviction = hasSentiment
      ? Math.round(quantScore * 0.6 + sentimentScore * 0.4)
      : quantScore;

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
      resolvedFrom: rawQuery !== resolvedTicker ? rawQuery : undefined,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[score/${resolvedTicker}]`, err);
    return NextResponse.json({ error: "Erreur lors du scoring" }, { status: 500 });
  }
}