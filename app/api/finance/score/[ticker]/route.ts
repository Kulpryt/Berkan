import { NextRequest, NextResponse } from "next/server";

const FMP_KEY = process.env.FMP_API_KEY!;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY!;

/* ── Helpers de normalisation ── */
function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

// Normalise une valeur entre min/max vers 0-100
function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return clamp(((value - min) / (max - min)) * 100);
}

/* ── Flux A : Score Quantitatif via FMP ── */
async function getQuantScore(ticker: string): Promise<number> {
  try {
    const [ratingRes, ratiosRes] = await Promise.all([
      fetch(`https://financialmodelingprep.com/stable/ratings-snapshot?symbol=${ticker}&apikey=${FMP_KEY}`),
      fetch(`https://financialmodelingprep.com/stable/financial-ratios?symbol=${ticker}&period=annual&limit=1&apikey=${FMP_KEY}`),
    ]);
    const rating = await ratingRes.json();
    const ratios = await ratiosRes.json();

    if (ticker === "AAPL") {
      console.log("AAPL rating:", JSON.stringify(rating).slice(0, 300));
      console.log("AAPL ratios:", JSON.stringify(ratios).slice(0, 300));
    }

    let score = 50;
    let components = 0;

    // Rating score (A → 100, F → 0)
    const ratingData = Array.isArray(rating) ? rating[0] : rating;
    if (ratingData?.ratingScore != null) {
      score += clamp(ratingData.ratingScore * 20); // ratingScore est sur 5
      components++;
    }

    // Ratios
    const r = Array.isArray(ratios) ? ratios[0] : null;
    if (r) {
      const pe = r.peRatio;
      if (pe && pe > 0 && pe < 200) { score += normalize(pe, 40, 5); components++; }
      const roe = r.returnOnEquity;
      if (roe != null) { score += normalize(roe * 100, -10, 40); components++; }
    }

    if (components > 0) score = score / (components + 1);
    return Math.round(clamp(score));
  } catch (err) {
    console.error(`[${ticker}] getQuantScore error:`, err);
    return 50;
  }
}

/* ── Flux B : Score Sentiment via Finnhub ── */
async function getSentimentScore(ticker: string): Promise<number> {
  try {
    const res = await fetch(
      `https://financialmodelingprep.com/stable/grades-consensus?symbol=${ticker}&apikey=${FMP_KEY}`
    );
    const data = await res.json();
    
    if (ticker === "AAPL") {
      console.log("AAPL sentiment:", JSON.stringify(data).slice(0, 300));
    }

    const d = Array.isArray(data) ? data[0] : data;
    if (!d) return 50;

    const buy = (d.strongBuy ?? 0) + (d.buy ?? 0);
    const sell = (d.strongSell ?? 0) + (d.sell ?? 0);
    const hold = d.hold ?? 0;
    const total = buy + sell + hold;

    if (total === 0) return 50;
    return Math.round(clamp((buy / total) * 100));
  } catch (err) {
    console.error(`getSentimentScore error:`, err);
    return 50;
  }
}

/* ── Handler principal ── */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: rawTicker } = await params;
  const ticker = rawTicker.toUpperCase();

  try {
    const [quantScore, sentimentScore] = await Promise.all([
      getQuantScore(ticker),
      getSentimentScore(ticker),
    ]);

    const conviction = Math.round(quantScore * 0.6 + sentimentScore * 0.4);

    return NextResponse.json({
      ticker,
      quantScore,
      sentimentScore,
      conviction,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[score/${ticker}]`, err);
    return NextResponse.json({ error: "Erreur lors du scoring" }, { status: 500 });
  }
}