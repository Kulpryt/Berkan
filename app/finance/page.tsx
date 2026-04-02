// app/finance/page.tsx
export const dynamic = "force-dynamic";

import { kv } from "@vercel/kv";
import FinanceDashboardClient from "./FinanceDashboardClient";

export type Score = {
  ticker: string;
  category: string;
  type: "stock" | "etf";
  quantScore: number | null;
  sentimentScore: number | null;
  conviction: number | null;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensus: string;
  totalAnalysts: number;
};

export type FearGreedData = {
  score: number;
  rating: string;
  prevWeek: number;
  prevMonth: number;
};

export type HistorySnapshot = {
  ticker: string;
  rank: number;
  conviction: number | null;
};

export type History = Record<string, HistorySnapshot[]>;

export default async function FinancePage() {
  let watchlist: Score[] = [];
  let updatedAt = "Aucune donnée — lance le cron manuellement";
  let fearGreed: FearGreedData | null = null;
  let history: History = {};

  try {
    const stored = await kv.get<{
      updatedAt: string;
      data: Score[];
      fearGreed: FearGreedData | null;
      history?: History;
    }>("finance:scores");

    if (stored) {
      watchlist = stored.data;
      fearGreed = stored.fearGreed ?? null;
      history   = stored.history ?? {};
      updatedAt = new Date(stored.updatedAt).toLocaleString("fr-FR", {
        weekday: "long", day: "numeric", month: "long",
        hour: "2-digit", minute: "2-digit",
      });
    }
  } catch (err) {
    console.error("[finance/page] KV error:", err);
  }

  return (
    <FinanceDashboardClient
      watchlist={watchlist}
      updatedAt={updatedAt}
      fearGreed={fearGreed}
      history={history}
    />
  );
}