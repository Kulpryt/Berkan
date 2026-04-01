"use client";

import { useState } from "react";
import { Search, RefreshCw, LogOut } from "lucide-react";

type Score = {
  ticker: string;
  quantScore: number;
  sentimentScore: number;
  conviction: number;
};

function convictionMeta(score: number): { label: string; color: string; bg: string } {
  if (score >= 75) return { label: "Forte Confluence", color: "#4A6741", bg: "#EFF4EE" };
  if (score >= 55) return { label: "Signal Positif",   color: "#7a9e4e", bg: "#f2f7ee" };
  if (score >= 40) return { label: "Neutre",            color: "#888884", bg: "var(--bg)" };
  return               { label: "À éviter",            color: "#c0503a", bg: "#fdf0ee" };
}

function Bar({ value }: { value: number }) {
  const { color } = convictionMeta(value);
  return (
    <div style={{ background: "#E8E8E4", borderRadius: 99, height: 5, width: "100%", overflow: "hidden" }}>
      <div style={{ width: `${value}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.5s cubic-bezier(.22,1,.36,1)" }} />
    </div>
  );
}

export default function FinanceDashboardClient({
  watchlist,
  updatedAt,
}: {
  watchlist: Score[];
  updatedAt: string;
}) {
  const [searchTicker, setSearchTicker] = useState("");
  const [searchResult, setSearchResult] = useState<Score | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  async function handleSearch() {
    if (!searchTicker.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const res = await fetch(`/api/finance/score/${searchTicker.trim().toUpperCase()}`);
      if (!res.ok) throw new Error();
      setSearchResult(await res.json());
    } catch {
      setSearchError("Ticker introuvable ou erreur API. Vérifie le symbole.");
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
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --bg:#F8F8F6; --surface:#FFFFFF; --border:#E8E8E4; --text:#111110; --muted:#888884; --accent:#4A6741; --accent-bg:#EFF4EE; --radius:14px; }
        body { background:var(--bg); font-family:'DM Sans',sans-serif; -webkit-font-smoothing:antialiased; }
        .row { transition: background 0.15s; }
        .row:hover { background: var(--bg); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* NAV */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, background:"rgba(248,248,246,0.9)", backdropFilter:"blur(12px)", borderBottom:"1px solid var(--border)" }}>
        <div style={{ maxWidth:1080, margin:"0 auto", padding:"0 24px", height:58, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <a href="/" style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:17, letterSpacing:"-0.02em", color:"var(--text)", textDecoration:"none" }}>Berkan</a>
            <span style={{ fontSize:11, color:"var(--muted)", background:"var(--border)", padding:"2px 8px", borderRadius:20 }}>@ Kulpryt</span>
            <span style={{ fontSize:11, color:"var(--accent)", background:"var(--accent-bg)", border:"1px solid #c8d9c5", padding:"2px 8px", borderRadius:20 }}>Finance · Privé</span>
          </div>
          <button onClick={handleLogout} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"1.5px solid var(--border)", borderRadius:10, padding:"7px 14px", fontSize:13, fontWeight:500, color:"var(--muted)", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>
            <LogOut size={13} /> Déconnexion
          </button>
        </div>
      </nav>

      <main style={{ maxWidth:1080, margin:"0 auto", padding:"88px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom:32 }}>
          <span style={{ fontSize:11, fontWeight:500, letterSpacing:"0.12em", textTransform:"uppercase", color:"var(--accent)", display:"block", marginBottom:10 }}>Dashboard · IA Finance</span>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(28px,4vw,44px)", fontWeight:800, letterSpacing:"-0.03em", marginBottom:8 }}>Indice de Conviction</h1>
          <p style={{ fontSize:13, color:"var(--muted)", fontWeight:300 }}>
            Mis à jour le {updatedAt} · Pondération : Quantitatif 60% · Sentiment 40%
          </p>
        </div>

        {/* Légende */}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:28 }}>
          {[
            { label:"Forte Confluence", color:"#4A6741", bg:"#EFF4EE", range:"≥ 75" },
            { label:"Signal Positif",   color:"#7a9e4e", bg:"#f2f7ee", range:"55–74" },
            { label:"Neutre",           color:"#888884", bg:"#F8F8F6", range:"40–54" },
            { label:"À éviter",         color:"#c0503a", bg:"#fdf0ee", range:"< 40" },
          ].map(l => (
            <div key={l.label} style={{ display:"flex", alignItems:"center", gap:7, background:l.bg, border:`1px solid ${l.color}40`, borderRadius:20, padding:"4px 12px" }}>
              <div style={{ width:7, height:7, borderRadius:"50%", background:l.color }} />
              <span style={{ fontSize:12, color:l.color, fontWeight:500 }}>{l.label}</span>
              <span style={{ fontSize:11, color:"#888884" }}>{l.range}</span>
            </div>
          ))}
        </div>

        {/* Table ou état vide */}
        {watchlist.length === 0 ? (
          <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", padding:40, textAlign:"center", marginBottom:40 }}>
            <p style={{ fontSize:15, color:"var(--muted)", marginBottom:10 }}>Aucune donnée en base.</p>
            <p style={{ fontSize:13, color:"var(--muted)", fontWeight:300 }}>
              Lance le cron manuellement une première fois via Vercel Dashboard → Cron Jobs → Run.
            </p>
          </div>
        ) : (
          <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", overflow:"hidden", marginBottom:40 }}>
            <div style={{ display:"grid", gridTemplateColumns:"36px 90px 1fr 1fr 1fr 150px", gap:16, padding:"12px 24px", borderBottom:"1px solid var(--border)", background:"var(--bg)" }}>
              {["#","Ticker","Quantitatif","Sentiment","Conviction","Interprétation"].map(h => (
                <span key={h} style={{ fontSize:11, fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase", color:"var(--muted)" }}>{h}</span>
              ))}
            </div>
            {watchlist.map((s, i) => {
              const { label, color, bg } = convictionMeta(s.conviction);
              return (
                <div key={s.ticker} className="row" style={{ display:"grid", gridTemplateColumns:"36px 90px 1fr 1fr 1fr 150px", gap:16, padding:"16px 24px", borderBottom: i < watchlist.length - 1 ? "1px solid var(--border)" : "none", alignItems:"center" }}>
                  <span style={{ fontSize:12, color:"var(--muted)", fontWeight:500 }}>{i + 1}</span>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:700, fontSize:14 }}>{s.ticker}</span>
                  <div>
                    <span style={{ fontSize:13, fontWeight:500, display:"block", marginBottom:4 }}>{s.quantScore}<span style={{ fontSize:11, color:"var(--muted)" }}>/100</span></span>
                    <Bar value={s.quantScore} />
                  </div>
                  <div>
                    <span style={{ fontSize:13, fontWeight:500, display:"block", marginBottom:4 }}>{s.sentimentScore}<span style={{ fontSize:11, color:"var(--muted)" }}>/100</span></span>
                    <Bar value={s.sentimentScore} />
                  </div>
                  <div>
                    <span style={{ fontSize:16, fontWeight:700, fontFamily:"'Syne',sans-serif", color, display:"block", marginBottom:4 }}>{s.conviction}</span>
                    <Bar value={s.conviction} />
                  </div>
                  <span style={{ fontSize:12, fontWeight:500, color, background:bg, border:`1px solid ${color}30`, borderRadius:20, padding:"4px 12px", display:"inline-block" }}>{label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* One-shot search */}
        <div style={{ background:"var(--surface)", border:"1.5px solid var(--border)", borderRadius:"var(--radius)", padding:28 }}>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:700, letterSpacing:"-0.02em", marginBottom:6 }}>Analyser un ticker</h2>
          <p style={{ fontSize:13, color:"var(--muted)", marginBottom:20, fontWeight:300 }}>Résultat en temps réel — hors watchlist quotidienne.</p>

          <div style={{ display:"flex", gap:10, marginBottom:16 }}>
            <input
              type="text" placeholder="Ex: TSLA, VOO, ASML…"
              value={searchTicker}
              onChange={e => setSearchTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === "Enter" && handleSearch()}
              style={{ flex:1, padding:"12px 16px", background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:10, fontSize:14, fontFamily:"'DM Sans',sans-serif", color:"var(--text)", outline:"none" }}
            />
            <button
              onClick={handleSearch}
              disabled={searchLoading || !searchTicker}
              style={{ display:"flex", alignItems:"center", gap:8, background: searchTicker && !searchLoading ? "var(--text)" : "var(--border)", color: searchTicker && !searchLoading ? "#fff" : "var(--muted)", padding:"12px 20px", borderRadius:10, border:"none", fontSize:14, fontWeight:500, fontFamily:"'DM Sans',sans-serif", cursor: searchTicker && !searchLoading ? "pointer" : "not-allowed" }}
            >
              {searchLoading ? <RefreshCw size={14} style={{ animation:"spin 1s linear infinite" }} /> : <Search size={14} />}
              Analyser
            </button>
          </div>

          {searchError && (
            <p style={{ fontSize:13, color:"#c0503a", padding:"12px 16px", background:"#fdf0ee", borderRadius:10, marginBottom:16 }}>{searchError}</p>
          )}

          {searchResult && (() => {
            const { label, color } = convictionMeta(searchResult.conviction);
            return (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, padding:20, background:"var(--bg)", border:"1.5px solid var(--border)", borderRadius:12 }}>
                {[
                  { title:"Ticker",      value: searchResult.ticker,                    c: "var(--text)", sub: undefined },
                  { title:"Quantitatif", value: `${searchResult.quantScore}/100`,        c: "var(--text)", sub: undefined },
                  { title:"Sentiment",   value: `${searchResult.sentimentScore}/100`,    c: "var(--text)", sub: undefined },
                  { title:"Conviction",  value: String(searchResult.conviction),         c: color,         sub: label },
                ].map(col => (
                  <div key={col.title}>
                    <span style={{ fontSize:11, color:"var(--muted)", fontWeight:500, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:6 }}>{col.title}</span>
                    <span style={{ fontSize:22, fontWeight:700, fontFamily:"'Syne',sans-serif", color: col.c }}>{col.value}</span>
                    {col.sub && <span style={{ display:"block", fontSize:12, color, marginTop:4 }}>{col.sub}</span>}
                  </div>
                ))}
              </div>
            );
          })()}
        </div>

      </main>
    </>
  );
}