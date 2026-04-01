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
  const [ratingsRes, ratiosRes] = await Promise.all([
    fetch(`https://financialmodelingprep.com/api/v3/analyst-stock-recommendations/${ticker}?limit=5&apikey=${FMP_KEY}`),
    fetch(`https://financialmodelingprep.com/api/v3/ratios-ttm/${ticker}?apikey=${FMP_KEY}`),
  ]);

  const ratings = await ratingsRes.json();
  const ratios = await ratiosRes.json();

  let score = 50; // base neutre
  let components = 0;

  // Composante 1 : consensus analystes (strongBuy/buy vs sell/strongSell)
  if (Array.isArray(ratings) && ratings.length > 0) {
    const latest = ratings[0];
    const positive = (latest.analystRatingsbuy || 0) + (latest.analystRatingsStrongBuy || 0);
    const negative = (latest.analystRatingsSell || 0) + (latest.analystRatingsStrongSell || 0);
    const total = positive + negative + (latest.analystRatingsHold || 0);
    if (total > 0) {
      const consensusScore = clamp((positive / total) * 100);
      score += consensusScore;
      components++;
    }
  }

  // Composante 2 : P/E ratio (< 15 = bien, > 40 = mauvais)
  if (Array.isArray(ratios) && ratios.length > 0) {
    const pe = ratios[0].peRatioTTM;
    if (pe && pe > 0 && pe < 200) {
      const peScore = normalize(pe, 40, 5); // inversé : PE bas = bon score
      score += peScore;
      components++;
    }

    // Composante 3 : ROE (rentabilité)
    const roe = ratios[0].returnOnEquityTTM;
    if (roe !== undefined && roe !== null) {
      const roeScore = normalize(roe * 100, -10, 40);
      score += roeScore;
      components++;
    }
  }

  // Moyenne des composantes + base
  if (components > 0) {
    score = score / (components + 1); // +1 pour la base de 50
  }

  return Math.round(clamp(score));
}

/* ── Flux B : Score Sentiment via Finnhub ── */
async function getSentimentScore(ticker: string): Promise<number> {
  const res = await fetch(
    `https://finnhub.io/api/v1/news-sentiment?symbol=${ticker}&token=${FINNHUB_KEY}`
  );
  const data = await res.json();

  if (!data || data.buzz === undefined) return 50;

  // bullishPercent est déjà entre 0 et 1
  const bullish = (data.sentiment?.bullishPercent ?? 0.5) * 100;
  const buzz = clamp((data.buzz?.buzz ?? 0.5) * 100); // intensité des news

  // Pondération : sentiment 70% + buzz 30%
  return Math.round(clamp(bullish * 0.7 + buzz * 0.3));
}

/* ── Handler principal ── */
export async function GET(
  _req: NextRequest,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();

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