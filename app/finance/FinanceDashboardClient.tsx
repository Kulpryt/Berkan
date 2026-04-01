"use client";

import { useState } from "react";
import { Search, RefreshCw, LogOut, TrendingUp, Users, BarChart2, AlertCircle } from "lucide-react";
import type { Score } from "./page";

/* ── Helpers ── */
function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }

function convictionMeta(score: number | null): { label: string; color: string; bg: string; border: string } {
  if (score == null) return { label: "N/A", color: "#888884", bg: "#F8F8F6", border: "#E8E8E4" };
  if (score >= 75)   return { label: "Forte Confluence", color: "#3d6b35", bg: "#EFF4EE", border: "#c4d9c1" };
  if (score >= 55)   return { label: "Signal Positif",   color: "#6a9b3e", bg: "#f3f8ee", border: "#cfe0bb" };
  if (score >= 40)   return { label: "Neutre",           color: "#888884", bg: "#F8F8F6", border: "#E8E8E4" };
  return                     { label: "À éviter",        color: "#b84332", bg: "#fdf0ee", border: "#f0c4bc" };
}

function ScoreBar({ value, max = 100 }: { value: number | null; max?: number }) {
  if (value == null) return (
    <div style={{ background:"#E8E8E4", borderRadius:99, height:4, width:"100%" }}>
      <div style={{ width:"50%", height:"100%", background:"#D0D0CC", borderRadius:99 }} />
    </div>
  );
  const { color } = convictionMeta(value);
  return (
    <div style={{ background:"#E8E8E4", borderRadius:99, height:4, width:"100%", overflow:"hidden" }}>
      <div style={{ width:`${clamp(value, 0, 100)}%`, height:"100%", background:color, borderRadius:99, transition:"width 0.6s cubic-bezier(.22,1,.36,1)" }} />
    </div>
  );
}

function AnalystBar({ strongBuy, buy, hold, sell, strongSell, total }: {
  strongBuy: number; buy: number; hold: number; sell: number; strongSell: number; total: number;
}) {
  if (total === 0) return <span style={{ fontSize:11, color:"#888884" }}>Pas d'analystes</span>;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  const segments = [
    { n: strongBuy,  color: "#3d6b35", label: "Strong Buy" },
    { n: buy,        color: "#6a9b3e", label: "Buy"        },
    { n: hold,       color: "#c8aa56", label: "Hold"       },
    { n: sell,       color: "#c0603a", label: "Sell"       },
    { n: strongSell, color: "#8b2315", label: "Strong Sell"},
  ].filter(s => s.n > 0);

  return (
    <div>
      <div style={{ display:"flex", borderRadius:99, overflow:"hidden", height:6, gap:1 }}>
        {segments.map(s => (
          <div key={s.label} title={`${s.label}: ${s.n}`}
            style={{ width:pct(s.n), background:s.color, minWidth: s.n > 0 ? 3 : 0 }} />
        ))}
      </div>
      <div style={{ display:"flex", gap:8, marginTop:5, flexWrap:"wrap" }}>
        {strongBuy  > 0 && <span style={{ fontSize:10, color:"#3d6b35" }}>▲▲ {strongBuy}</span>}
        {buy        > 0 && <span style={{ fontSize:10, color:"#6a9b3e" }}>▲ {buy}</span>}
        {hold       > 0 && <span style={{ fontSize:10, color:"#b09040" }}>— {hold}</span>}
        {sell       > 0 && <span style={{ fontSize:10, color:"#c0603a" }}>▼ {sell}</span>}
        {strongSell > 0 && <span style={{ fontSize:10, color:"#8b2315" }}>▼▼ {strongSell}</span>}
        <span style={{ fontSize:10, color:"#888884" }}>{total} analystes</span>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ background:"#FFFFFF", border:"1.5px solid #E8E8E4", borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:14, flex:1, minWidth:160 }}>
      <div style={{ color:"#4A6741", opacity:0.7 }}>{icon}</div>
      <div>
        <div style={{ fontSize:22, fontWeight:700, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.02em" }}>{value}</div>
        <div style={{ fontSize:11, color:"#888884", fontWeight:500, marginTop:1 }}>{label}</div>
        {sub && <div style={{ fontSize:10, color:"#4A6741", marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

const CATEGORIES = ["Tous", "Big Tech", "Finance", "ETF Large", "ETF Sectoriel", "Crypto ETF", "Europe", "Dividendes"];

export default function FinanceDashboardClient({ watchlist, updatedAt }: { watchlist: Score[]; updatedAt: string }) {
  const [activeCategory, setActiveCategory] = useState("Tous");
  const [searchTicker, setSearchTicker] = useState("");
  const [searchResult, setSearchResult] = useState<Score | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [sortBy, setSortBy] = useState<"conviction" | "quant" | "sentiment">("conviction");

  const filtered = watchlist
    .filter(s => activeCategory === "Tous" || s.category === activeCategory)
    .sort((a, b) => {
      const key = sortBy === "conviction" ? "conviction" : sortBy === "quant" ? "quantScore" : "sentimentScore";
      return (b[key] ?? -1) - (a[key] ?? -1);
    });

  const stocks = watchlist.filter(s => s.type === "stock" && s.conviction != null);
  const avgConviction = stocks.length > 0
    ? Math.round(stocks.reduce((sum, s) => sum + (s.conviction ?? 0), 0) / stocks.length)
    : 0;
  const forteCount = stocks.filter(s => (s.conviction ?? 0) >= 75).length;
  const eviterCount = stocks.filter(s => (s.conviction ?? 0) < 40).length;
  const totalAnalysts = watchlist.reduce((sum, s) => sum + s.totalAnalysts, 0);

  async function handleSearch() {
    if (!searchTicker.trim()) return;
    setSearchLoading(true); setSearchError(""); setSearchResult(null);
    try {
      const res = await fetch(`/api/finance/score/${searchTicker.trim().toUpperCase()}`);
      if (!res.ok) throw new Error();
      setSearchResult(await res.json());
    } catch {
      setSearchError("Ticker introuvable ou erreur API.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/finance/logout", { method: "POST" });
    window.location.href = "/";
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,400&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        :root { --bg:#F5F5F2; --surface:#FFFFFF; --border:#E8E8E4; --text:#111110; --muted:#888884; --accent:#4A6741; --accent-bg:#EFF4EE; --radius:14px; }
        body { background:var(--bg); font-family:'DM Sans',sans-serif; -webkit-font-smoothing:antialiased; }
        .row { transition:background 0.12s; cursor:default; }
        .row:hover { background:#FAFAF8; }
        .cat-tab { border:none; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        .sort-btn { border:none; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.15s; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @media (max-width:900px) { .main-grid { grid-template-columns: 36px 80px 1fr 1fr 140px 180px !important; } }
        @media (max-width:700px) { .main-grid { grid-template-columns: 30px 70px 1fr 130px !important; } .hide-mobile { display:none !important; } }
      `}</style>

      {/* NAV */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(245,245,242,0.92)", backdropFilter:"blur(14px)", borderBottom:"1px solid var(--border)" }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"0 24px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <a href="/" style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:16, letterSpacing:"-0.02em", color:"var(--text)", textDecoration:"none" }}>berkan</a>
            <span style={{ fontSize:11, color:"var(--muted)", background:"var(--border)", padding:"2px 8px", borderRadius:20 }}>finance</span>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#5a9e4a", display:"inline-block", boxShadow:"0 0 0 2px #d0eacc" }} title="Live" />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:12, color:"var(--muted)" }}>Mis à jour {updatedAt}</span>
            <button onClick={handleLogout} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"1.5px solid var(--border)", borderRadius:10, padding:"6px 12px", fontSize:12, fontWeight:500, color:"var(--muted)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
              <LogOut size={12} /> Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <main style={{ maxWidth:1200, margin:"0 auto", padding:"74px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom:28 }}>
          <span style={{ fontSize:10, fontWeight:600, letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--accent)", display:"block", marginBottom:8 }}>Dashboard · Finance IA</span>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(26px,4vw,42px)", fontWeight:800, letterSpacing:"-0.03em", marginBottom:6 }}>Indice de Conviction</h1>
          <p style={{ fontSize:13, color:"var(--muted)", fontWeight:300 }}>
            Scoring quotidien via FMP — Quant 60% · Analystes 40%
          </p>
        </div>

        {/* Stats */}
        {watchlist.length > 0 && (
          <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:28 }}>
            <StatCard icon={<BarChart2 size={18}/>} label="Conviction moy. (actions)" value={avgConviction} sub={convictionMeta(avgConviction).label} />
            <StatCard icon={<TrendingUp size={18}/>} label="Forte Confluence" value={forteCount} sub={`sur ${stocks.length} actions`} />
            <StatCard icon={<AlertCircle size={18}/>} label="À éviter" value={eviterCount} sub="score < 40" />
            <StatCard icon={<Users size={18}/>} label="Analystes couverts" value={totalAnalysts.toLocaleString("fr-FR")} sub="total watchlist" />
          </div>
        )}

        {/* Légende */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:20 }}>
          {[
            { label:"Forte Confluence", color:"#3d6b35", bg:"#EFF4EE", range:"≥ 75" },
            { label:"Signal Positif",   color:"#6a9b3e", bg:"#f3f8ee", range:"55–74" },
            { label:"Neutre",           color:"#888884", bg:"#F8F8F6", range:"40–54" },
            { label:"À éviter",         color:"#b84332", bg:"#fdf0ee", range:"< 40"  },
          ].map(l => (
            <div key={l.label} style={{ display:"flex", alignItems:"center", gap:7, background:l.bg, border:`1px solid ${l.color}40`, borderRadius:20, padding:"4px 12px" }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:l.color }} />
              <span style={{ fontSize:11, color:l.color, fontWeight:500 }}>{l.label}</span>
              <span style={{ fontSize:11, color:"#999" }}>{l.range}</span>
            </div>
          ))}
        </div>

        {/* Category tabs */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:16 }}>
          {CATEGORIES.map(cat => {
            const count = cat === "Tous" ? watchlist.length : watchlist.filter(s => s.category === cat).length;
            const active = activeCategory === cat;
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} className="cat-tab"
                style={{ padding:"6px 14px", borderRadius:20, fontSize:12, fontWeight:500,
                  background: active ? "var(--text)" : "var(--surface)",
                  color: active ? "#fff" : "var(--muted)",
                  border:`1.5px solid ${active ? "var(--text)" : "var(--border)"}`,
                }}>
                {cat} <span style={{ opacity:0.6, fontSize:11 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Sort controls */}
        <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:12 }}>
          <span style={{ fontSize:11, color:"var(--muted)", fontWeight:500 }}>Trier par :</span>
          {[["conviction","Conviction"], ["quant","Quantitatif"], ["sentiment","Analystes"]].map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key as any)} className="sort-btn"
              style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:500,
                background: sortBy === key ? "#4A6741" : "transparent",
                color: sortBy === key ? "#fff" : "var(--muted)",
                border:`1px solid ${sortBy === key ? "#4A6741" : "var(--border)"}`,
              }}>
              {label}
            </button>
          ))}
        </div>

        {/* Table */}
        {watchlist.length === 0 ? (
          <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", padding:48, textAlign:"center", marginBottom:40 }}>
            <p style={{ fontSize:15, color:"var(--muted)", marginBottom:8 }}>Aucune donnée en base.</p>
            <p style={{ fontSize:13, color:"var(--muted)", fontWeight:300 }}>Lance le cron depuis Vercel Dashboard → Cron Jobs → Run</p>
          </div>
        ) : (
          <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", overflow:"hidden", marginBottom:40 }}>
            {/* Header row */}
            <div className="main-grid" style={{ display:"grid", gridTemplateColumns:"36px 100px 100px 1fr 1fr 1fr 180px", gap:16, padding:"11px 20px", borderBottom:"1px solid var(--border)", background:"var(--bg)" }}>
              {["#","Ticker","Catégorie","Quant","Analystes","Conviction","Répartition analystes"].map(h => (
                <span key={h} style={{ fontSize:10, fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--muted)" }}>{h}</span>
              ))}
            </div>

            {filtered.map((s, i) => {
              const { label, color, bg, border } = convictionMeta(s.conviction);
              const isETF = s.type === "etf";
              return (
                <div key={s.ticker} className="row main-grid"
                  style={{ display:"grid", gridTemplateColumns:"36px 100px 100px 1fr 1fr 1fr 180px", gap:16, padding:"14px 20px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", alignItems:"center" }}>
                  
                  {/* Rank */}
                  <span style={{ fontSize:11, color:"var(--muted)", fontWeight:500 }}>{i + 1}</span>
                  
                  {/* Ticker + badge ETF */}
                  <div>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14, display:"block" }}>{s.ticker}</span>
                    {isETF && <span style={{ fontSize:9, fontWeight:600, letterSpacing:"0.1em", color:"#7878c4", background:"#f0f0fb", border:"1px solid #d0d0ee", borderRadius:4, padding:"1px 5px" }}>ETF</span>}
                  </div>

                  {/* Catégorie */}
                  <span style={{ fontSize:11, color:"var(--muted)", fontWeight:400 }}>{s.category}</span>

                  {/* Quant */}
                  <div>
                    {s.quantScore != null ? (
                      <>
                        <span style={{ fontSize:13, fontWeight:600, display:"block", marginBottom:4 }}>
                          {s.quantScore}<span style={{ fontSize:11, color:"var(--muted)", fontWeight:400 }}>/100</span>
                        </span>
                        <ScoreBar value={s.quantScore} />
                      </>
                    ) : (
                      <span style={{ fontSize:11, color:"var(--muted)", fontStyle:"italic" }}>ETF</span>
                    )}
                  </div>

                  {/* Sentiment / analystes */}
                  <div>
                    {s.totalAnalysts > 0 ? (
                      <>
                        <span style={{ fontSize:13, fontWeight:600, display:"block", marginBottom:4 }}>
                          {s.sentimentScore}<span style={{ fontSize:11, color:"var(--muted)", fontWeight:400 }}>/100</span>
                        </span>
                        <ScoreBar value={s.sentimentScore} />
                      </>
                    ) : (
                      <span style={{ fontSize:11, color:"var(--muted)", fontStyle:"italic" }}>Pas de données</span>
                    )}
                  </div>

                  {/* Conviction */}
                  <div>
                    {s.conviction != null ? (
                      <>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                          <span style={{ fontSize:18, fontWeight:800, fontFamily:"'Syne',sans-serif", color }}>{s.conviction}</span>
                          <span style={{ fontSize:10, fontWeight:600, color, background:bg, border:`1px solid ${border}`, borderRadius:20, padding:"2px 8px" }}>{label}</span>
                        </div>
                        <ScoreBar value={s.conviction} />
                      </>
                    ) : (
                      <span style={{ fontSize:11, color:"var(--muted)", fontStyle:"italic" }}>N/A</span>
                    )}
                  </div>

                  {/* Analyst breakdown bar */}
                  <div className="hide-mobile">
                    <AnalystBar
                      strongBuy={s.strongBuy} buy={s.buy} hold={s.hold}
                      sell={s.sell} strongSell={s.strongSell} total={s.totalAnalysts}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* One-shot search */}
        <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", padding:28 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, letterSpacing:"-0.02em", marginBottom:4 }}>Analyser un ticker</h2>
          <p style={{ fontSize:13, color:"var(--muted)", marginBottom:20, fontWeight:300 }}>Score en temps réel — hors watchlist quotidienne.</p>
          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <input type="text" placeholder="Ex: CRM, UBER, PLTR…"
              value={searchTicker}
              onChange={e => setSearchTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              style={{ flex:1, padding:"11px 16px", background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"var(--text)", outline:"none" }}
            />
            <button onClick={handleSearch} disabled={searchLoading || !searchTicker}
              style={{ display:"flex", alignItems:"center", gap:8, background: searchTicker && !searchLoading ? "var(--text)" : "var(--border)", color: searchTicker && !searchLoading ? "#fff" : "var(--muted)", padding:"11px 20px", borderRadius:10, border:"none", fontSize:13, fontWeight:500, fontFamily:"'DM Sans',sans-serif", cursor: searchTicker && !searchLoading ? "pointer" : "not-allowed" }}>
              {searchLoading ? <RefreshCw size={14} style={{ animation:"spin 1s linear infinite" }} /> : <Search size={14} />}
              Analyser
            </button>
          </div>
          {searchError && <p style={{ fontSize:13, color:"#b84332", padding:"12px 16px", background:"#fdf0ee", borderRadius:10, marginBottom:16 }}>{searchError}</p>}
          {searchResult && (() => {
            const { label, color, bg, border } = convictionMeta(searchResult.conviction);
            return (
              <div style={{ background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:12, padding:20 }}>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:16, marginBottom:16 }}>
                  {[
                    { title:"Ticker",      value: searchResult.ticker,                                       color:"var(--text)" },
                    { title:"Quantitatif", value: searchResult.quantScore != null ? `${searchResult.quantScore}/100` : "N/A", color:"var(--text)" },
                    { title:"Analystes",   value: searchResult.sentimentScore != null ? `${searchResult.sentimentScore}/100` : "N/A", color:"var(--text)" },
                    { title:"Conviction",  value: searchResult.conviction != null ? String(searchResult.conviction) : "N/A", color },
                  ].map(col => (
                    <div key={col.title}>
                      <span style={{ fontSize:10, color:"var(--muted)", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:5 }}>{col.title}</span>
                      <span style={{ fontSize:22, fontWeight:800, fontFamily:"'Syne',sans-serif", color:col.color }}>{col.value}</span>
                    </div>
                  ))}
                </div>
                {searchResult.totalAnalysts > 0 && (
                  <div>
                    <span style={{ fontSize:10, color:"var(--muted)", fontWeight:600, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:8 }}>Répartition analystes</span>
                    <AnalystBar strongBuy={searchResult.strongBuy} buy={searchResult.buy} hold={searchResult.hold} sell={searchResult.sell} strongSell={searchResult.strongSell} total={searchResult.totalAnalysts} />
                  </div>
                )}
                <div style={{ marginTop:12 }}>
                  <span style={{ fontSize:12, fontWeight:600, color, background:bg, border:`1px solid ${border}`, borderRadius:20, padding:"4px 14px" }}>{label}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </main>
    </>
  );
}