import { kv } from "@vercel/kv";
import FinanceDashboardClient from "./FinanceDashboardClient";

type Score = {
  ticker: string;
  quantScore: number;
  sentimentScore: number;
  conviction: number;
};

export default async function FinancePage() {
  let watchlist: Score[] = [];
  let updatedAt = "Aucune donnée — lance le cron manuellement";

  try {
    const stored = await kv.get<{ updatedAt: string; data: Score[] }>("finance:scores");
    if (stored) {
      watchlist = stored.data;
      updatedAt = new Date(stored.updatedAt).toLocaleString("fr-FR", {
        day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
      });
    }
  } catch (err) {
    console.error("[finance/page] KV error:", err);
  }

  return <FinanceDashboardClient watchlist={watchlist} updatedAt={updatedAt} />;
}