// app/api/finance/search/route.ts
import { NextRequest, NextResponse } from "next/server";

const FMP_KEY = process.env.FMP_API_KEY!;

async function fetchWithTimeout(url: string, ms = 5000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { signal: controller.signal }); }
  finally { clearTimeout(id); }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    // FMP search couvre NYSE, NASDAQ, EURONEXT, LSE, etc.
    const res = await fetchWithTimeout(
        `https://financialmodelingprep.com/stable/search-symbol?query=${encodeURIComponent(q)}&limit=10&apikey=${FMP_KEY}`
    );
    const text = await res.text();
    if (!text || text.startsWith("Premium") || text.startsWith("Limit")) {
      return NextResponse.json([]);
    }
    const data = JSON.parse(text) as Array<{
      symbol: string;
      name: string;
      currency: string;
      stockExchange: string;
      exchangeShortName: string;
    }>;

    // Trier : exact match en premier, puis US, puis reste
    const sorted = data.sort((a, b) => {
      const aExact = a.symbol.toUpperCase() === q.toUpperCase() ? -2 : 0;
      const bExact = b.symbol.toUpperCase() === q.toUpperCase() ? -2 : 0;
      const aUS = ["NYSE", "NASDAQ", "AMEX"].includes(a.exchangeShortName) ? -1 : 0;
      const bUS = ["NYSE", "NASDAQ", "AMEX"].includes(b.exchangeShortName) ? -1 : 0;
      return (aExact + aUS) - (bExact + bUS);
    });

    return NextResponse.json(
      sorted.map(s => ({
        ticker: s.symbol,
        name: s.name,
        exchange: s.stockExchange,
        exchangeShort: s.exchangeShortName,
        currency: s.currency,
      }))
    );
  } catch (err) {
    console.error("[search] error:", err);
    return NextResponse.json([]);
  }
}