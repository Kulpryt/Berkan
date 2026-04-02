// app/finance/FinanceDashboardClient.tsx
"use client";

import { useState } from "react";
import { Search, RefreshCw, LogOut, TrendingUp, Users, BarChart2, AlertCircle } from "lucide-react";
import type { Score, FearGreedData } from "./page";
import type { AVFundamentals } from "../api/finance/score/[ticker]/route";

function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }

function convictionMeta(score: number | null) {
  if (score == null) return { label: "N/A",             color: "#888884", bg: "#F8F8F6", border: "#E8E8E4" };
  if (score >= 75)   return { label: "Forte Confluence", color: "#3d6b35", bg: "#EFF4EE", border: "#c4d9c1" };
  if (score >= 55)   return { label: "Signal Positif",   color: "#6a9b3e", bg: "#f3f8ee", border: "#cfe0bb" };
  if (score >= 40)   return { label: "Neutre",           color: "#888884", bg: "#F8F8F6", border: "#E8E8E4" };
  return                     { label: "À éviter",        color: "#b84332", bg: "#fdf0ee", border: "#f0c4bc" };
}

function fearGreedMeta(score: number) {
  if (score >= 75) return { label: "Extreme Greed", color: "#2d5e24", bg: "#e8f5e3", emoji: "🤑" };
  if (score >= 55) return { label: "Greed",         color: "#5a9e4a", bg: "#f0f8ec", emoji: "😏" };
  if (score >= 45) return { label: "Neutral",       color: "#8a8040", bg: "#f8f6e8", emoji: "😐" };
  if (score >= 25) return { label: "Fear",          color: "#b87020", bg: "#fdf5e8", emoji: "😨" };
  return                   { label: "Extreme Fear", color: "#b84332", bg: "#fdf0ee", emoji: "😱" };
}

function ScoreBar({ value }: { value: number | null }) {
  const { color } = convictionMeta(value);
  return (
    <div style={{ background: "#E8E8E4", borderRadius: 99, height: 4, width: "100%", overflow: "hidden" }}>
      <div style={{ width: value != null ? `${clamp(value)}%` : "50%", height: "100%", background: value != null ? color : "#D0D0CC", borderRadius: 99, transition: "width 0.6s cubic-bezier(.22,1,.36,1)" }} />
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

function FearGreedWidget({ data }: { data: FearGreedData }) {
  const { label, color, bg, emoji } = fearGreedMeta(data.score);
  const prevWeekDiff = data.score - data.prevWeek;
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
          <span style={{ fontSize: 11, color: "#888884" }}>
            vs sem. : <span style={{ color: prevWeekDiff > 0 ? "#5a9e4a" : prevWeekDiff < 0 ? "#b84332" : "#888884", fontWeight: 600 }}>
              {prevWeekDiff > 0 ? "+" : ""}{prevWeekDiff}
            </span>
          </span>
          <span style={{ fontSize: 11, color: "#888884" }}>
            vs mois : <span style={{ color: prevMonthDiff > 0 ? "#5a9e4a" : prevMonthDiff < 0 ? "#b84332" : "#888884", fontWeight: 600 }}>
              {prevMonthDiff > 0 ? "+" : ""}{prevMonthDiff}
            </span>
          </span>
        </div>
      </div>
      {/* Mini gauge */}
      <div style={{ width: 56, height: 56, position: "relative", flexShrink: 0 }}>
        <svg viewBox="0 0 56 56" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="28" cy="28" r="22" fill="none" stroke="#E8E8E4" strokeWidth="6" />
          <circle cx="28" cy="28" r="22" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${(data.score / 100) * 138} 138`}
            strokeLinecap="round" />
        </svg>
        <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color }}>{data.score}</span>
      </div>
    </div>
  );
}

function AVBlock({ av }: { av: AVFundamentals }) {
  const fmt = (v: number | null, suffix = "") => v != null ? `${v}${suffix}` : "—";
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
    { label: "Secteur",         value: av.sector ?? "—" },
    { label: "Industrie",       value: av.industry ?? "—" },
    { label: "Market Cap",      value: fmtCap(av.marketCap) },
    { label: "P/E Ratio",       value: fmt(av.pe) },
    { label: "EPS",             value: fmt(av.eps, "$") },
    { label: "Marge nette",     value: fmtPct(av.profitMargin) },
    { label: "ROE",             value: fmtPct(av.roe) },
    { label: "Croissance CA",   value: fmtPct(av.revenueGrowthYoY) },
    { label: "Dividende",       value: fmtPct(av.dividendYield) },
    { label: "52w High",        value: fmt(av.weekHigh52, "$") },
    { label: "52w Low",         value: fmt(av.weekLow52, "$") },
    { label: "Target analystes",value: fmt(av.analystTargetPrice, "$") },
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

const CATEGORIES = ["Tous", "Big Tech", "Finance", "ETF Large", "ETF Sectoriel", "Crypto ETF", "Europe", "Dividendes"];

type SearchResult = Score & { av?: AVFundamentals | null };

export default function FinanceDashboardClient({
  watchlist, updatedAt, fearGreed,
}: {
  watchlist: Score[];
  updatedAt: string;
  fearGreed: FearGreedData | null;
}) {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [sortBy, setSortBy] = useState<"conviction" | "quantScore" | "sentimentScore">("conviction");
  const [searchTicker, setSearchTicker] = useState("");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const filtered = watchlist
    .filter(s => activeCategory === "Tous" || s.category === activeCategory)
    .sort((a, b) => {
      return (b[sortBy] ?? -1) - (a[sortBy] ?? -1);
    });

  const stocks = watchlist.filter(s => s.type === "stock" && s.conviction != null);
  const avgConviction = stocks.length > 0
    ? Math.round(stocks.reduce((s, x) => s + (x.conviction ?? 0), 0) / stocks.length) : 0;
  const forteCount   = stocks.filter(s => (s.conviction ?? 0) >= 75).length;
  const eviterCount  = stocks.filter(s => (s.conviction ?? 0) < 40).length;
  const totalAnalysts = watchlist.reduce((s, x) => s + x.totalAnalysts, 0);

  async function handleSearch() {
    if (!searchTicker.trim()) return;
    setSearchLoading(true); setSearchError(""); setSearchResult(null);
    try {
      const res = await fetch(`/api/finance/score/${searchTicker.trim().toUpperCase()}`);
      if (!res.ok) throw new Error();
      setSearchResult(await res.json());
    } catch { setSearchError("Ticker introuvable ou erreur API."); }
    finally { setSearchLoading(false); }
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
          <p style={{ fontSize:13, color:"var(--muted)", fontWeight:300 }}>Quant FMP 60% · Consensus analystes FMP 40% · Sentiment marché CNN</p>
        </div>

        {/* Stats row */}
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

        {/* Category tabs */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
          {CATEGORIES.map(cat => {
            const count = cat === "Tous" ? watchlist.length : watchlist.filter(s => s.category === cat).length;
            const active = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} className="tab"
                style={{ padding:"5px 12px", borderRadius:20, fontSize:12, fontWeight:500,
                  background:active ? "var(--text)" : "var(--surface)",
                  color:active ? "#fff" : "var(--muted)",
                  border:`1.5px solid ${active ? "var(--text)" : "var(--border)"}`,
                }}>
                {cat} <span style={{ opacity:0.5, fontSize:10 }}>{count}</span>
              </button>
            );
          })}
          <div style={{ marginLeft:"auto", display:"flex", gap:6, alignItems:"center" }}>
            <span style={{ fontSize:10, color:"var(--muted)" }}>Tri :</span>
            {[["conviction","Conviction"],["quantScore","Quant"],["sentimentScore","Analystes"]].map(([k, l]) => (
              <button key={k} onClick={() => setSortBy(k as any)} className="tab"
                style={{ padding:"4px 10px", borderRadius:20, fontSize:11,
                  background:sortBy===k ? "#4A6741" : "transparent",
                  color:sortBy===k ? "#fff" : "var(--muted)",
                  border:`1px solid ${sortBy===k ? "#4A6741" : "var(--border)"}`,
                }}>{l}</button>
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
            <div style={{ display:"grid", gridTemplateColumns:"32px 100px 100px 1fr 1fr 1fr 190px", gap:14, padding:"10px 18px", borderBottom:"1px solid var(--border)", background:"var(--bg)" }}>
              {["#","Ticker","Catégorie","Quant","Analystes","Conviction","Répartition analystes"].map(h => (
                <span key={h} style={{ fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--muted)" }}>{h}</span>
              ))}
            </div>
            {filtered.map((s, i) => {
              const { label, color, bg, border } = convictionMeta(s.conviction);
              return (
                <div key={s.ticker} className="row" style={{ display:"grid", gridTemplateColumns:"32px 100px 100px 1fr 1fr 1fr 190px", gap:14, padding:"13px 18px", borderBottom:i<filtered.length-1?"1px solid var(--border)":"none", alignItems:"center" }}>
                  <span style={{ fontSize:11, color:"var(--muted)" }}>{i+1}</span>
                  <div>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>{s.ticker}</span>
                    {s.type==="etf" && <span style={{ display:"block", fontSize:9, fontWeight:600, color:"#7878c4", background:"#f0f0fb", border:"1px solid #d0d0ee", borderRadius:4, padding:"1px 4px", width:"fit-content", marginTop:2 }}>ETF</span>}
                  </div>
                  <span style={{ fontSize:11, color:"var(--muted)" }}>{s.category}</span>
                  <div>
                    {s.quantScore != null ? (<><span style={{ fontSize:13, fontWeight:600, display:"block", marginBottom:3 }}>{s.quantScore}<span style={{ fontSize:10, color:"var(--muted)" }}>/100</span></span><ScoreBar value={s.quantScore}/></>) : <span style={{ fontSize:11, color:"var(--muted)", fontStyle:"italic" }}>ETF</span>}
                  </div>
                  <div>
                    {s.totalAnalysts > 0 ? (<><span style={{ fontSize:13, fontWeight:600, display:"block", marginBottom:3 }}>{s.sentimentScore}<span style={{ fontSize:10, color:"var(--muted)" }}>/100</span></span><ScoreBar value={s.sentimentScore}/></>) : <span style={{ fontSize:11, color:"var(--muted)", fontStyle:"italic" }}>N/A</span>}
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

        {/* Search */}
        <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", padding:24 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:17, fontWeight:700, letterSpacing:"-0.02em", marginBottom:3 }}>Analyser un ticker</h2>
          <p style={{ fontSize:12, color:"var(--muted)", marginBottom:18, fontWeight:300 }}>Scoring FMP + données fondamentales Alpha Vantage en temps réel.</p>
          <div style={{ display:"flex", gap:10, marginBottom:14 }}>
            <input type="text" placeholder="Ex: CRM, UBER, PLTR, BTC…"
              value={searchTicker}
              onChange={e => setSearchTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key==="Enter" && handleSearch()}
              style={{ flex:1, padding:"10px 14px", background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"var(--text)", outline:"none" }}
            />
            <button onClick={handleSearch} disabled={searchLoading||!searchTicker}
              style={{ display:"flex", alignItems:"center", gap:7, background:searchTicker&&!searchLoading?"var(--text)":"var(--border)", color:searchTicker&&!searchLoading?"#fff":"var(--muted)", padding:"10px 18px", borderRadius:10, border:"none", fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif", cursor:searchTicker&&!searchLoading?"pointer":"not-allowed" }}>
              {searchLoading ? <RefreshCw size={13} style={{ animation:"spin 1s linear infinite" }}/> : <Search size={13}/>}
              Analyser
            </button>
          </div>
          {searchError && <p style={{ fontSize:12, color:"#b84332", padding:"10px 14px", background:"#fdf0ee", borderRadius:10, marginBottom:14 }}>{searchError}</p>}
          {searchResult && (() => {
            const { label, color, bg, border } = convictionMeta(searchResult.conviction);
            return (
              <div style={{ background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:12, padding:18 }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))", gap:14, marginBottom:4 }}>
                  {[
                    { title:"Ticker",     value:searchResult.ticker, color:"var(--text)" },
                    { title:"Quant FMP",  value:searchResult.quantScore!=null?`${searchResult.quantScore}/100`:"N/A", color:"var(--text)" },
                    { title:"Analystes",  value:searchResult.sentimentScore!=null?`${searchResult.sentimentScore}/100`:"N/A", color:"var(--text)" },
                    { title:"Conviction", value:searchResult.conviction!=null?String(searchResult.conviction):"N/A", color },
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
                <div style={{ marginTop:10 }}>
                  <span style={{ fontSize:12, fontWeight:600, color, background:bg, border:`1px solid ${border}`, borderRadius:20, padding:"4px 12px" }}>{label}</span>
                </div>
                {searchResult.av && <AVBlock av={searchResult.av}/>}
              </div>
            );
          })()}
        </div>
      </main>
    </>
  );
}