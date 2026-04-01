"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/finance";

  async function handleSubmit() {
    setLoading(true);
    setError(false);
    const res = await fetch("/api/finance/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push(from);
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div style={{
      background: "var(--surface)", border: "1.5px solid var(--border)",
      borderRadius: "var(--radius)", padding: "48px 40px",
      width: "100%", maxWidth: 400,
      boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
    }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "var(--accent-bg)", border: "1px solid #c8d9c5",
          borderRadius: 20, padding: "4px 14px", marginBottom: 20,
        }}>
          <span style={{ fontSize: 14 }}>📊</span>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)" }}>
            Finance · Accès privé
          </span>
        </div>
        <h1 style={{
          fontFamily: "'Syne', sans-serif", fontSize: 26,
          fontWeight: 700, letterSpacing: "-0.025em", color: "var(--text)", marginBottom: 8,
        }}>
          Berkan Finance
        </h1>
        <p style={{ fontSize: 14, color: "var(--muted)", fontWeight: 300, lineHeight: 1.6 }}>
          Dashboard privé — Indice de Conviction
        </p>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          style={{
            width: "100%", padding: "12px 16px",
            background: "var(--bg)", border: `1.5px solid ${error ? "#e05555" : "var(--border)"}`,
            borderRadius: 10, fontSize: 14,
            fontFamily: "'DM Sans', sans-serif", color: "var(--text)", outline: "none",
          }}
          autoFocus
        />
        {error && <p style={{ fontSize: 13, color: "#e05555", marginTop: 8 }}>Mot de passe incorrect.</p>}
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || !password}
        style={{
          width: "100%", padding: "12px 24px",
          background: password && !loading ? "var(--text)" : "var(--border)",
          color: password && !loading ? "#fff" : "var(--muted)",
          border: "none", borderRadius: 10, fontSize: 14, fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif",
          cursor: password && !loading ? "pointer" : "not-allowed",
        }}
      >
        {loading ? "Vérification..." : "Accéder →"}
      </button>

      <div style={{ marginTop: 24, textAlign: "center" }}>
        <a href="/" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>
          ← Retour au portfolio
        </a>
      </div>
    </div>
  );
}

export default function LoginFinance() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root { --bg:#F8F8F6; --surface:#FFFFFF; --border:#E8E8E4; --text:#111110; --muted:#888884; --accent:#4A6741; --accent-bg:#EFF4EE; --radius:14px; }
        body { background:var(--bg); font-family:'DM Sans',sans-serif; -webkit-font-smoothing:antialiased; }
      `}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg)" }}>
        <Suspense fallback={<div style={{ color: "#888884", fontSize: 14 }}>Chargement...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </>
  );
}