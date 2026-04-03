"use client";

import { useState, useEffect, useRef } from "react";
import { Search, RefreshCw, LogOut, TrendingUp, Users, BarChart2, AlertCircle } from "lucide-react";
import type { Score, FearGreedData, History } from "./page";
import type { AVFundamentals } from "../api/finance/score/[ticker]/route";

function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }

function convictionMeta(score: number | null) {
  if (score == null) return { label: "N/A",              color: "#888884", bg: "#F8F8F6", border: "#E8E8E4" };
  if (score >= 75)   return { label: "Forte Confluence", color: "#3d6b35", bg: "#EFF4EE", border: "#c4d9c1" };
  if (score >= 55)   return { label: "Signal Positif",   color: "#6a9b3e", bg: "#f3f8ee", border: "#cfe0bb" };
  if (score >= 40)   return { label: "Neutre",           color: "#888884", bg: "#F8F8F6", border: "#E8E8E4" };
  return                    { label: "À éviter",         color: "#b84332", bg: "#fdf0ee", border: "#f0c4bc" };
}

function fearGreedMeta(score: number) {
  if (score >= 75) return { label: "Extreme Greed", color: "#2d5e24", bg: "#e8f5e3", emoji: "🤑" };
  if (score >= 55) return { label: "Greed",         color: "#5a9e4a", bg: "#f0f8ec", emoji: "😏" };
  if (score >= 45) return { label: "Neutral",       color: "#8a8040", bg: "#f8f6e8", emoji: "😐" };
  if (score >= 25) return { label: "Fear",          color: "#b87020", bg: "#fdf5e8", emoji: "😨" };
  return                  { label: "Extreme Fear",  color: "#b84332", bg: "#fdf0ee", emoji: "😱" };
}

function ScoreBar({ value }: { value: number | null }) {
  const { color } = convictionMeta(value);
  return (
    <div style={{ background: "#E8E8E4", borderRadius: 99, height: 4, width: "100%", overflow: "hidden" }}>
      <div style={{ width: value != null ? `${clamp(value)}%` : "0%", height: "100%", background: value != null ? color : "#D0D0CC", borderRadius: 99, transition: "width 0.6s cubic-bezier(.22,1,.36,1)" }} />
    </div>
  );
}

function AnalystBar({ strongBuy, buy, hold, sell, strongSell, total }: {
  strongBuy: number; buy: number; hold: number; sell: number; strongSell: number; total: number;
}) {
  if (total === 0) return <span style={{ fontSize: 11, color: "#888884" }}>Pas d'analystes</span>;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return (
    <div>
      <div style={{ display: "flex", borderRadius: 99, overflow: "hidden", height: 6, gap: 1 }}>
        {[{ n: strongBuy, c: "#3d6b35" }, { n: buy, c: "#6a9b3e" }, { n: hold, c: "#c8aa56" }, { n: sell, c: "#c0603a" }, { n: strongSell, c: "#8b2315" }]
          .filter(s => s.n > 0)
          .map((s, i) => <div key={i} style={{ width: pct(s.n), background: s.c, minWidth: 3 }} />)}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 5, flexWrap: "wrap" }}>
        {strongBuy  > 0 && <span style={{ fontSize: 10, color: "#3d6b35" }}>▲▲ {strongBuy}</span>}
        {buy        > 0 && <span style={{ fontSize: 10, color: "#6a9b3e" }}>▲ {buy}</span>}
        {hold       > 0 && <span style={{ fontSize: 10, color: "#b09040" }}>— {hold}</span>}
        {sell       > 0 && <span style={{ fontSize: 10, color: "#c0603a" }}>▼ {sell}</span>}
        {strongSell > 0 && <span style={{ fontSize: 10, color: "#8b2315" }}>▼▼ {strongSell}</span>}
        <span style={{ fontSize: 10, color: "#888884" }}>{total} analystes</span>
      </div>
    </div>
  );
}

// ── Historique classement ─────────────────────────────────────────────
type RankStats = {
  rankChange: number | null;
  streak: number;
  streakDir: "up" | "down" | "stable";
  isNew: boolean;
  topStreak: number;
};

function computeRankStats(ticker: string, currentRank: number, history: History): RankStats {
  const dates = Object.keys(history).sort().reverse();
  if (dates.length < 2) return { rankChange: null, streak: 0, streakDir: "stable", isNew: false, topStreak: 0 };

  const yesterday  = history[dates[0]]?.find(h => h.ticker === ticker);
  const rankChange = yesterday ? yesterday.rank - currentRank : null;
  const isNew      = !yesterday && currentRank <= 15;

  let streak = 0, streakDir: "up" | "down" | "stable" = "stable", prevRank = currentRank;
  for (const date of dates) {
    const snap = history[date]?.find(h => h.ticker === ticker);
    if (!snap) break;
    const diff = snap.rank - prevRank;
    const dir: "up" | "down" | "stable" = diff > 0 ? "down" : diff < 0 ? "up" : "stable";
    if (streak === 0) { streakDir = dir; streak = dir !== "stable" ? 1 : 0; }
    else if (dir === streakDir) { streak++; }
    else break;
    prevRank = snap.rank;
  }

  let topStreak = currentRank <= 5 ? 1 : 0;
  if (currentRank <= 5) {
    for (const date of dates) {
      const snap = history[date]?.find(h => h.ticker === ticker);
      if (snap && snap.rank <= 5) topStreak++;
      else break;
    }
  }

  return { rankChange, streak, streakDir, isNew, topStreak };
}

function RankBadge({ stats }: { stats: RankStats }) {
  const badges: React.ReactNode[] = [];

  if (stats.topStreak >= 7) {
    badges.push(<span key="fire2" style={{ fontSize:10, fontWeight:700, color:"#b85a00", background:"#fff3e0", border:"1px solid #f5c080", borderRadius:20, padding:"2px 7px" }}>🔥🔥 Top {stats.topStreak}j</span>);
  } else if (stats.topStreak >= 3) {
    badges.push(<span key="fire1" style={{ fontSize:10, fontWeight:600, color:"#c07020", background:"#fff8ee", border:"1px solid #f5d4a0", borderRadius:20, padding:"2px 7px" }}>🔥 Top {stats.topStreak}j</span>);
  }

  if (stats.isNew) {
    badges.push(<span key="new" style={{ fontSize:10, fontWeight:600, color:"#6040c0", background:"#f4f0fc", border:"1px solid #d4c8f0", borderRadius:20, padding:"2px 7px" }}>✨ Nouveau</span>);
  }

  if (stats.rankChange != null && Math.abs(stats.rankChange) >= 1) {
    const up = stats.rankChange > 0, abs = Math.abs(stats.rankChange);
    const intense = stats.streak >= 5, medium = stats.streak >= 3;
    const color  = up ? (intense ? "#2d6e24" : medium ? "#4a9e3a" : "#6aae52") : (intense ? "#8b1c0e" : medium ? "#b84332" : "#c8604a");
    const bg     = up ? (intense ? "#e4f5e0" : "#f0f8ec") : (intense ? "#fce8e4" : "#fdf0ee");
    const border = up ? (intense ? "#a8d8a0" : "#cce8c0") : (intense ? "#f0b8b0" : "#f0c8c0");
    const suffix = stats.streak >= 2 ? ` · ${stats.streak}j` : "";
    badges.push(<span key="change" style={{ fontSize:10, fontWeight:700, color, background:bg, border:`1px solid ${border}`, borderRadius:20, padding:"2px 7px" }}>{up ? "▲" : "▼"} {abs}{suffix}</span>);
  }

  if (badges.length === 0) return null;
  return <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:4 }}>{badges}</div>;
}

// ── Fear & Greed ──────────────────────────────────────────────────────
function FearGreedWidget({ data }: { data: FearGreedData }) {
  const { label, color, bg, emoji } = fearGreedMeta(data.score);
  const prevWeekDiff  = data.score - data.prevWeek;
  const prevMonthDiff = data.score - data.prevMonth;
  return (
    <div style={{ background: bg, border: `1.5px solid ${color}40`, borderRadius: 14, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16, flex: 1, minWidth: 260 }}>
      <div style={{ fontSize: 36, lineHeight: 1 }}>{emoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#888884", marginBottom: 4 }}>Fear & Greed Index · CNN</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Syne',sans-serif", color }}>{data.score}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 6 }}>
          <span style={{ fontSize: 11, color: "#888884" }}>vs sem. : <span style={{ color: prevWeekDiff > 0 ? "#5a9e4a" : prevWeekDiff < 0 ? "#b84332" : "#888884", fontWeight: 600 }}>{prevWeekDiff > 0 ? "+" : ""}{prevWeekDiff}</span></span>
          <span style={{ fontSize: 11, color: "#888884" }}>vs mois : <span style={{ color: prevMonthDiff > 0 ? "#5a9e4a" : prevMonthDiff < 0 ? "#b84332" : "#888884", fontWeight: 600 }}>{prevMonthDiff > 0 ? "+" : ""}{prevMonthDiff}</span></span>
        </div>
      </div>
      <div style={{ width: 56, height: 56, position: "relative", flexShrink: 0 }}>
        <svg viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="28" cy="28" r="22" fill="none" stroke="#E8E8E4" strokeWidth="6" />
          <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="6" strokeDasharray={`${(data.score / 100) * 138} 138`} strokeLinecap="round" />
        </svg>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color }}>{data.score}</span>
      </div>
    </div>
  );
}

// ── Alpha Vantage block ───────────────────────────────────────────────
function AVBlock({ av }: { av: AVFundamentals }) {
  const fmt    = (v: number | null, suffix = "") => v != null ? `${v}${suffix}` : "—";
  const fmtPct = (v: number | null) => v != null ? `${(v * 100).toFixed(1)}%` : "—";
  const fmtCap = (v: string | null) => {
    if (!v) return "—";
    const n = parseInt(v);
    if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
    if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
    return `$${n}`;
  };
  const items = [
    { label: "Secteur",          value: av.sector ?? "—" },
    { label: "Industrie",        value: av.industry ?? "—" },
    { label: "Market Cap",       value: fmtCap(av.marketCap) },
    { label: "P/E Ratio",        value: fmt(av.pe) },
    { label: "EPS",              value: fmt(av.eps, "$") },
    { label: "Marge nette",      value: fmtPct(av.profitMargin) },
    { label: "ROE",              value: fmtPct(av.roe) },
    { label: "Croissance CA",    value: fmtPct(av.revenueGrowthYoY) },
    { label: "Dividende",        value: fmtPct(av.dividendYield) },
    { label: "52w High",         value: fmt(av.weekHigh52, "$") },
    { label: "52w Low",          value: fmt(av.weekLow52, "$") },
    { label: "Target analystes", value: fmt(av.analystTargetPrice, "$") },
  ];
  return (
    <div style={{ marginTop: 16, background: "#F8F8F6", border: "1.5px solid #E8E8E4", borderRadius: 12, padding: 16 }}>
      {av.name && <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{av.name}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
        {items.map(item => (
          <div key={item.label}>
            <div style={{ fontSize: 10, color: "#888884", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>{item.label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#111110" }}>{item.value}</div>
          </div>
        ))}
      </div>
      {av.description && (
        <p style={{ fontSize: 12, color: "#888884", marginTop: 12, lineHeight: 1.6, borderTop: "1px solid #E8E8E4", paddingTop: 10 }}>
          {av.description.slice(0, 300)}{av.description.length > 300 ? "…" : ""}
        </p>
      )}
    </div>
  );
}

// ── Search bar — suggestions UNIQUEMENT via bouton/Enter, pas au keystroke ──
type SearchSuggestion = {
  ticker: string;
  name: string;
  exchange: string;
  exchangeShort: string;
  currency: string;
};

function TickerSearchBar({
  value,
  onChange,
  onSelect,
  onSubmit,
  loading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (ticker: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [open, setOpen]               = useState(false);
  const [activeIdx, setActiveIdx]     = useState(-1);
  const [sugLoading, setSugLoading]   = useState(false);
  const wrapperRef                    = useRef<HTMLDivElement>(null);

  // Fermer si clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch suggestions uniquement sur demande explicite (bouton loupe ou Tab)
  async function fetchSuggestions() {
    const q = value.trim();
    if (q.length < 2) return;
    setSugLoading(true);
    try {
      const res = await fetch(`/api/finance/search?q=${encodeURIComponent(q)}`);
      const data: SearchSuggestion[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
      setActiveIdx(-1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setSugLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Tab" && !e.shiftKey) {
      // Tab → ouvre les suggestions sans soumettre
      e.preventDefault();
      fetchSuggestions();
      return;
    }
    if (!open || suggestions.length === 0) {
      if (e.key === "Enter") onSubmit();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0) {
        handleSelect(suggestions[activeIdx].ticker);
      } else {
        setOpen(false);
        onSubmit();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function handleSelect(ticker: string) {
    setOpen(false);
    setSuggestions([]);
    onSelect(ticker);
  }

  function exchangeColor(ex: string) {
    if (["NYSE", "NASDAQ", "AMEX"].includes(ex)) return { color: "#3d6b35", bg: "#EFF4EE", border: "#c4d9c1" };
    if (["EURONEXT", "XPAR", "XAMS", "XBRU", "PAR"].includes(ex)) return { color: "#2060b0", bg: "#eef4fc", border: "#b8d4f0" };
    return { color: "#888884", bg: "#F8F8F6", border: "#E8E8E4" };
  }

  return (
    <div ref={wrapperRef} style={{ position: "relative", flex: 1 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        {/* Loupe cliquable pour ouvrir les suggestions */}
        <button
          type="button"
          onClick={fetchSuggestions}
          title="Chercher des suggestions"
          style={{ position: "absolute", left: 12, background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", color: sugLoading ? "#4A6741" : "#888884" }}
        >
          {sugLoading
            ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
            : <Search size={14} />}
        </button>
        <input
          type="text"
          placeholder="Ex: AAPL, RXL.PA, Total Energies… (Tab pour suggestions)"
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(false); }} // frappe = ferme suggestions
          onKeyDown={handleKeyDown}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "10px 14px 10px 38px",
            background: "var(--bg)",
            border: "1.5px solid var(--border)",
            borderRadius: 10,
            fontSize: 14,
            fontFamily: "'DM Sans',sans-serif",
            color: "var(--text)",
            outline: "none",
          }}
        />
        {loading && (
          <RefreshCw size={13} style={{ position: "absolute", right: 14, color: "#888884", animation: "spin 1s linear infinite" }} />
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul style={{
          position: "absolute",
          top: "calc(100% + 6px)",
          left: 0,
          right: 0,
          zIndex: 200,
          background: "var(--surface)",
          border: "1.5px solid var(--border)",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          overflow: "hidden",
          listStyle: "none",
          padding: 4,
        }}>
          {suggestions.map((s, idx) => {
            const { color, bg, border } = exchangeColor(s.exchangeShort);
            const isActive = idx === activeIdx;
            return (
              <li
                key={`${s.ticker}-${idx}`}
                onMouseDown={() => handleSelect(s.ticker)}
                onMouseEnter={() => setActiveIdx(idx)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  background: isActive ? "var(--bg)" : "transparent",
                  transition: "background 0.1s",
                  gap: 10,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text)", minWidth: 60, flexShrink: 0 }}>
                    {s.ticker}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.name}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {s.currency && s.currency !== "USD" && (
                    <span style={{ fontSize: 10, color: "#888884" }}>{s.currency}</span>
                  )}
                  <span style={{ fontSize: 10, fontWeight: 600, color, background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: "2px 6px" }}>
                    {s.exchangeShort}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
const CATEGORIES = ["Tous", "Big Tech", "Finance", "ETF Large", "ETF Sectoriel", "Crypto ETF", "Europe", "Dividendes"];

type SearchResult = Score & {
  av?: AVFundamentals | null;
  resolvedFrom?: string;
  region?: string;
  consensus?: string;
  dataUnavailable?: boolean;
};

export default function FinanceDashboardClient({
  watchlist, updatedAt, fearGreed, history,
}: {
  watchlist: Score[];
  updatedAt: string;
  fearGreed: FearGreedData | null;
  history: History;
}) {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [sortBy, setSortBy] = useState<"conviction" | "quantScore" | "sentimentScore">("conviction");
  const [searchTicker, setSearchTicker] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const filtered = watchlist
    .filter(s => activeCategory === "Tous" || s.category === activeCategory)
    .sort((a, b) => (b[sortBy] ?? -1) - (a[sortBy] ?? -1));

  const stocks        = watchlist.filter(s => s.type === "stock" && s.conviction != null);
  const avgConviction = stocks.length > 0 ? Math.round(stocks.reduce((s, x) => s + (x.conviction ?? 0), 0) / stocks.length) : 0;
  const forteCount    = stocks.filter(s => (s.conviction ?? 0) >= 75).length;
  const eviterCount   = stocks.filter(s => (s.conviction ?? 0) < 40).length;
  const totalAnalysts = watchlist.reduce((s, x) => s + x.totalAnalysts, 0);

  async function handleSearch(overrideTicker?: string) {
    const query = (overrideTicker ?? searchTicker).trim();
    if (!query) return;
    setSearchLoading(true); setSearchError(""); setSearchResult(null);
    try {
      const res = await fetch(`/api/finance/score/${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error();
      setSearchResult(await res.json());
    } catch {
      setSearchError("Ticker ou entreprise introuvable. Essaie le symbole exact (ex: RXL.PA, TTE, CRSP).");
    } finally {
      setSearchLoading(false);
    }
  }

  function handleSuggestionSelect(ticker: string) {
    setSearchTicker(ticker);
    handleSearch(ticker);
  }

  async function handleLogout() {
    await fetch("/api/finance/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root { --bg:#F5F5F2; --surface:#FFFFFF; --border:#E8E8E4; --text:#111110; --muted:#888884; --accent:#4A6741; --radius:14px; }
        body { background:var(--bg); font-family:'DM Sans',sans-serif; -webkit-font-smoothing:antialiased; }
        .row { transition:background 0.12s; }
        .row:hover { background:#FAFAF8; }
        .tab { border:none; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        @keyframes spin { to { transform:rotate(360deg); } }
      `}</style>

      {/* NAV */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(245,245,242,0.92)", backdropFilter:"blur(14px)", borderBottom:"1px solid var(--border)" }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"0 24px", height:54, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <a href="/" style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, letterSpacing:"-0.02em", color:"var(--text)", textDecoration:"none" }}>berkan</a>
            <span style={{ fontSize:11, color:"var(--muted)", background:"var(--border)", padding:"2px 8px", borderRadius:20 }}>finance</span>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#5a9e4a", boxShadow:"0 0 0 2px #d0eacc", display:"inline-block" }} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:11, color:"var(--muted)" }}>{updatedAt}</span>
            <button onClick={handleLogout} className="tab" style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"1.5px solid var(--border)", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:500, color:"var(--muted)" }}>
              <LogOut size={12}/> Déco
            </button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth:1280, margin:"0 auto", padding:"70px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom:24 }}>
          <span style={{ fontSize:10, fontWeight:600, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--accent)", display:"block", marginBottom:6 }}>Dashboard · Finance IA</span>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(26px,4vw,40px)", fontWeight:800, letterSpacing:"-0.03em", marginBottom:4 }}>Indice de Conviction</h1>
          <p style={{ fontSize:13, color:"var(--muted)", fontWeight:300 }}>Quant FMP 60% · Consensus analystes 40% · Momentum ETF · Sentiment marché CNN</p>
        </div>

        {/* Stats */}
        {watchlist.length > 0 && (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:20 }}>
            {fearGreed && <FearGreedWidget data={fearGreed} />}
            <div style={{ display:"flex", gap:12, flexWrap:"wrap", flex:1 }}>
              {[
                { icon:<BarChart2 size={16}/>, label:"Conviction moy.", value:avgConviction, sub:convictionMeta(avgConviction).label },
                { icon:<TrendingUp size={16}/>, label:"Forte Confluence", value:forteCount, sub:`/ ${stocks.length} actions` },
                { icon:<AlertCircle size={16}/>, label:"À éviter", value:eviterCount, sub:"score < 40" },
                { icon:<Users size={16}/>, label:"Analystes couverts", value:totalAnalysts.toLocaleString("fr-FR"), sub:"total watchlist" },
              ].map(c => (
                <div key={c.label} style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:14, padding:"14px 18px", display:"flex", alignItems:"center", gap:12, flex:1, minWidth:140 }}>
                  <div style={{ color:"#4A6741", opacity:0.7 }}>{c.icon}</div>
                  <div>
                    <div style={{ fontSize:20, fontWeight:700, fontFamily:"'Syne',sans-serif" }}>{c.value}</div>
                    <div style={{ fontSize:10, color:"var(--muted)", fontWeight:500 }}>{c.label}</div>
                    {c.sub && <div style={{ fontSize:10, color:"#4A6741", marginTop:1 }}>{c.sub}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Légende */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 }}>
          {[
            { label:"Forte Confluence", color:"#3d6b35", bg:"#EFF4EE", range:"≥75" },
            { label:"Signal Positif",   color:"#6a9b3e", bg:"#f3f8ee", range:"55–74" },
            { label:"Neutre",           color:"#888884", bg:"#F8F8F6", range:"40–54" },
            { label:"À éviter",         color:"#b84332", bg:"#fdf0ee", range:"<40" },
          ].map(l => (
            <div key={l.label} style={{ display:"flex", alignItems:"center", gap:6, background:l.bg, border:`1px solid ${l.color}40`, borderRadius:20, padding:"3px 10px" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:l.color }} />
              <span style={{ fontSize:11, color:l.color, fontWeight:500 }}>{l.label}</span>
              <span style={{ fontSize:10, color:"#999" }}>{l.range}</span>
            </div>
          ))}
        </div>

        {/* Tabs + tri */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
          {CATEGORIES.map(cat => {
            const count = cat === "Tous" ? watchlist.length : watchlist.filter(s => s.category === cat).length;
            const active = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} className="tab"
                style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:500, background:active?"var(--text)":"var(--surface)", color:active?"#fff":"var(--muted)", border:`1.5px solid ${active?"var(--text)":"var(--border)"}` }}>
                {cat} <span style={{ opacity:0.5, fontSize:10 }}>{count}</span>
              </button>
            );
          })}
          <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>
            <span style={{ fontSize:10, color:"var(--muted)" }}>Tri :</span>
            {[["conviction","Conviction"],["quantScore","Quant"],["sentimentScore","Analystes"]].map(([k, l]) => (
              <button key={k} onClick={() => setSortBy(k as any)} className="tab"
                style={{ padding:"4px 10px", borderRadius:20, fontSize:11, background:sortBy===k?"#4A6741":"transparent", color:sortBy===k?"#fff":"var(--muted)", border:`1px solid ${sortBy===k?"#4A6741":"var(--border)"}` }}>{l}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        {watchlist.length === 0 ? (
          <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", padding:48, textAlign:"center", marginBottom:40 }}>
            <p style={{ fontSize:15, color:"var(--muted)" }}>Aucune donnée — lance le cron depuis Vercel.</p>
          </div>
        ) : (
          <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", overflow:"hidden", marginBottom:40 }}>
            <div style={{ display:"grid", gridTemplateColumns:"32px 1fr 90px 1fr 1fr 1fr 190px", gap:14, padding:"10px 18px", borderBottom:"1px solid var(--border)", background:"var(--bg)" }}>
              {["#","Ticker","Catégorie","Quant","Analystes","Conviction","Répartition analystes"].map(h => (
                <span key={h} style={{ fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--muted)" }}>{h}</span>
              ))}
            </div>
            {filtered.map((s, i) => {
              const { label, color, bg, border } = convictionMeta(s.conviction);
              const rankStats = computeRankStats(s.ticker, i + 1, history);
              return (
                <div key={s.ticker} className="row" style={{ display:"grid", gridTemplateColumns:"32px 1fr 90px 1fr 1fr 1fr 190px", gap:14, padding:"13px 18px", borderBottom:i<filtered.length-1?"1px solid var(--border)":"none", alignItems:"center" }}>
                  <span style={{ fontSize:11, color:"var(--muted)" }}>{i+1}</span>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, color:"var(--text)" }}>{s.ticker}</span>
                      {s.type==="etf" && <span style={{ fontSize:9, fontWeight:600, color:"#7878c4", background:"#f0f0fb", border:"1px solid #d0d0ee", borderRadius:4, padding:"1px 4px" }}>ETF</span>}
                    </div>
                    {(s as any).name && <div style={{ fontSize:12, fontWeight:500, color:"var(--text)", marginTop:2 }}>{(s as any).name}</div>}
                    <RankBadge stats={rankStats} />
                  </div>
                  <span style={{ fontSize:11, color:"var(--muted)" }}>{s.category}</span>
                  <div>
                    {s.quantScore != null
                      ? (<><span style={{ fontSize:13, fontWeight:600, display:"block", marginBottom:3 }}>{s.quantScore}<span style={{ fontSize:10, color:"var(--muted)" }}>/100</span></span><ScoreBar value={s.quantScore}/></>)
                      : <span style={{ fontSize:11, color:"var(--muted)", fontStyle:"italic" }}>Momentum</span>}
                  </div>
                  <div>
                    {s.totalAnalysts > 0
                      ? (<><span style={{ fontSize:13, fontWeight:600, display:"block", marginBottom:3 }}>{s.sentimentScore}<span style={{ fontSize:10, color:"var(--muted)" }}>/100</span></span><ScoreBar value={s.sentimentScore}/></>)
                      : <span style={{ fontSize:11, color:"var(--muted)", fontStyle:"italic" }}>N/A</span>}
                  </div>
                  <div>
                    {s.conviction != null ? (
                      <>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:3 }}>
                          <span style={{ fontSize:17, fontWeight:800, fontFamily:"'Syne',sans-serif", color }}>{s.conviction}</span>
                          <span style={{ fontSize:9, fontWeight:600, color, background:bg, border:`1px solid ${border}`, borderRadius:20, padding:"2px 7px" }}>{label}</span>
                        </div>
                        <ScoreBar value={s.conviction}/>
                      </>
                    ) : <span style={{ fontSize:11, color:"var(--muted)", fontStyle:"italic" }}>N/A</span>}
                  </div>
                  <AnalystBar strongBuy={s.strongBuy} buy={s.buy} hold={s.hold} sell={s.sell} strongSell={s.strongSell} total={s.totalAnalysts}/>
                </div>
              );
            })}
          </div>
        )}

        {/* Recherche */}
        <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", padding:24 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, letterSpacing:"-0.02em", marginBottom:3 }}>Analyser un ticker</h2>
          <p style={{ fontSize:12, color:"var(--muted)", marginBottom:18, fontWeight:300 }}>
            Tape un ticker (<strong>AAPL</strong>, <strong>RXL.PA</strong>) ou un nom d'entreprise (<strong>Rexel</strong>, <strong>LVMH</strong>, <strong>Total</strong>).
            Clique sur la loupe ou appuie sur <kbd style={{ fontSize:10, background:"var(--bg)", border:"1px solid var(--border)", borderRadius:4, padding:"1px 5px" }}>Tab</kbd> pour voir les suggestions.
          </p>
          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            <TickerSearchBar
              value={searchTicker}
              onChange={setSearchTicker}
              onSelect={handleSuggestionSelect}
              onSubmit={() => handleSearch()}
              loading={searchLoading}
            />
            <button
              onClick={() => handleSearch()}
              disabled={searchLoading || !searchTicker.trim()}
              style={{ display:"flex", alignItems:"center", gap:7, background:searchTicker&&!searchLoading?"var(--text)":"var(--border)", color:searchTicker&&!searchLoading?"#fff":"var(--muted)", padding:"10px 18px", borderRadius:10, border:"none", fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif", cursor:searchTicker&&!searchLoading?"pointer":"not-allowed", flexShrink:0 }}>
              {searchLoading ? <RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Search size={13}/>}
              Analyser
            </button>
          </div>
          {searchError && <p style={{ fontSize:12, color:"#b84332", padding:"10px 14px", background:"#fdf0ee", borderRadius:10, marginBottom:14 }}>{searchError}</p>}
          {searchResult && (() => {
            const { label, color, bg, border } = convictionMeta(searchResult.conviction);
            return (
              <div style={{ background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:12, padding:18 }}>
                {/* Header */}
                <div style={{ marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:18, color:"var(--text)" }}>{searchResult.ticker}</span>
                    {searchResult.region && searchResult.region !== "United States" && (
                      <span style={{ fontSize:10, color:"#7878c4", background:"#f0f0fb", border:"1px solid #d0d0ee", borderRadius:4, padding:"2px 6px" }}>{searchResult.region}</span>
                    )}
                    {searchResult.resolvedFrom && (
                      <span style={{ fontSize:11, color:"var(--muted)" }}>← résolu depuis "{searchResult.resolvedFrom}"</span>
                    )}
                  </div>
                  {searchResult.av?.name && <div style={{ fontSize:14, fontWeight:500, color:"var(--text)" }}>{searchResult.av.name}</div>}
                </div>

                {/* Alerte données indisponibles */}
                {searchResult.dataUnavailable && (
                  <div style={{ fontSize:12, color:"#b87020", background:"#fdf5e8", border:"1px solid #f0d090", borderRadius:8, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", gap:8 }}>
                    <AlertCircle size={14} style={{ flexShrink:0 }} />
                    Données de scoring non disponibles pour ce ticker sur ton plan FMP. Le scoring est limité aux actions US (NYSE/NASDAQ).
                  </div>
                )}

                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:14, marginBottom:4 }}>
                  {[
                    { title:"Quant FMP",  value:searchResult.quantScore!=null?`${searchResult.quantScore}/100`:"N/A", color:"var(--text)" },
                    { title:"Analystes",  value:searchResult.sentimentScore!=null?`${searchResult.sentimentScore}/100`:"N/A", color:"var(--text)" },
                    { title:"Conviction", value:searchResult.conviction!=null?String(searchResult.conviction):"N/A", color },
                    { title:"Consensus",  value:searchResult.consensus ?? "N/A", color:"var(--text)" },
                  ].map(col => (
                    <div key={col.title}>
                      <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:4 }}>{col.title}</div>
                      <div style={{ fontSize:22, fontWeight:800, fontFamily:"'Syne',sans-serif", color:col.color }}>{col.value}</div>
                    </div>
                  ))}
                </div>

                {searchResult.totalAnalysts > 0 && (
                  <div style={{ marginTop:12 }}>
                    <div style={{ fontSize:10, color:"var(--muted)", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:6 }}>Répartition analystes</div>
                    <AnalystBar strongBuy={searchResult.strongBuy} buy={searchResult.buy} hold={searchResult.hold} sell={searchResult.sell} strongSell={searchResult.strongSell} total={searchResult.totalAnalysts}/>
                  </div>
                )}

                {!searchResult.dataUnavailable && (
                  <div style={{ marginTop:10 }}>
                    <span style={{ fontSize:12, fontWeight:600, color, background:bg, border:`1px solid ${border}`, borderRadius:20, padding:"4px 12px" }}>{label}</span>
                  </div>
                )}

                {searchResult.av && <AVBlock av={searchResult.av}/>}

                {searchResult.region && searchResult.region !== "United States" && !searchResult.dataUnavailable && (
                  <p style={{ fontSize:11, color:"#b87020", background:"#fdf5e8", border:"1px solid #f0d090", borderRadius:8, padding:"8px 12px", marginTop:12 }}>
                    ⚠️ Ticker coté sur un marché non-US ({searchResult.region}). Le score FMP peut être incomplet.
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </main>
    </>
  );
}