"use client";

import React, { useState, useEffect, useRef } from "react";
import { Download, ExternalLink, Mic, Github, Linkedin, Code2, Layers, Terminal, ChevronRight } from "lucide-react";

/* ── Hook fade-in ── */
function useFadeIn(threshold = 0.12): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);
  return [ref, visible] as [React.RefObject<HTMLDivElement>, boolean];
}

/* ── GLOBAL STYLES ── */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #F8F8F6;
      --surface:   #FFFFFF;
      --border:    #E8E8E4;
      --text:      #111110;
      --muted:     #888884;
      --accent:    #4A6741;
      --accent-bg: #EFF4EE;
      --radius:    14px;
    }

    html { scroll-behavior: smooth; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'DM Sans', sans-serif;
      -webkit-font-smoothing: antialiased;
      line-height: 1.6;
    }

    .fade-up {
      opacity: 0; transform: translateY(24px);
      transition: opacity 0.65s cubic-bezier(.22,1,.36,1),
                  transform 0.65s cubic-bezier(.22,1,.36,1);
    }
    .fade-up.visible { opacity: 1; transform: translateY(0); }
    .fade-up.d1 { transition-delay: 0.1s; }
    .fade-up.d2 { transition-delay: 0.2s; }
    .fade-up.d3 { transition-delay: 0.3s; }

    .section-label {
      font-size: 11px; font-weight: 500;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--accent); font-family: 'DM Sans', sans-serif;
    }

    .nav-berkan {
      position: fixed; top: 0; left: 0; right: 0; z-index: 100;
      background: rgba(248,248,246,0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
    }

    .skill-pill {
      display: inline-flex; align-items: center; gap: 6px;
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: 20px;
      padding: 5px 14px;
      font-size: 13px; font-weight: 500;
      color: var(--text);
      transition: border-color 0.2s, background 0.2s;
    }
    .skill-pill:hover { border-color: var(--accent); background: var(--accent-bg); }

    .project-card {
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      padding: 28px;
      transition: box-shadow 0.25s, transform 0.2s, border-color 0.2s;
      position: relative; overflow: hidden;
    }
    .project-card:hover {
      box-shadow: 0 8px 28px rgba(0,0,0,0.06);
      transform: translateY(-2px);
      border-color: #d0d0cc;
    }

    .exp-item {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 24px;
      padding: 28px 0;
      border-bottom: 1px solid var(--border);
    }

    /* Pong canvas */
    #pong-canvas {
      display: block;
      border-radius: 12px;
      cursor: default;
    }

    .pong-wrapper {
      position: relative;
      background: var(--surface);
      border: 1.5px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .pong-overlay {
      position: absolute;
      inset: 0;
      background: rgba(248,248,246,0.92);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      border-radius: var(--radius);
      backdrop-filter: blur(4px);
      transition: opacity 0.3s;
    }

    .btn-primary {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--text); color: #fff;
      padding: 12px 24px; border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px; font-weight: 500;
      border: none; cursor: pointer;
      transition: background 0.2s, transform 0.15s;
      text-decoration: none;
    }
    .btn-primary:hover { background: #2a2a28; transform: translateY(-1px); }

    .btn-ghost {
      display: inline-flex; align-items: center; gap: 6px;
      background: transparent; color: var(--text);
      padding: 10px 20px; border-radius: 10px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px; font-weight: 500;
      border: 1.5px solid var(--border);
      cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
      text-decoration: none;
    }
    .btn-ghost:hover { border-color: var(--text); background: #f0f0ee; }

    @media (max-width: 768px) {
      .exp-item { grid-template-columns: 1fr !important; gap: 8px !important; }
      .projects-grid { grid-template-columns: 1fr !important; }
      .hero-grid { grid-template-columns: 1fr !important; }
      .pong-hint { display: none; }
    }
  `}</style>
);

/* ── NAV ── */
function Nav() {
  return (
    <nav className="nav-berkan">
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>
            Berkan
          </span>
          <span style={{ fontSize: 11, color: "var(--muted)", background: "var(--border)", padding: "2px 8px", borderRadius: 20 }}>
            @ Kulpryt
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <a href="#formation" className="btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }}>Formation</a>
          <a href="#experiences" className="btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }}>Expériences</a>
          <a href="#projets" className="btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }}>Projets</a>
          <a href="#pong" className="btn-ghost" style={{ fontSize: 13, padding: "7px 14px" }}>🏓 Pong</a>
          <a href="https://kulpryt.com" className="btn-primary" style={{ fontSize: 13, padding: "7px 16px" }}>
            Kulpryt <ExternalLink size={12} />
          </a>
        </div>
      </div>
    </nav>
  );
}

/* ── HERO ── */
function Hero() {
  return (
    <section style={{ minHeight: "100vh", display: "flex", alignItems: "center", padding: "110px 24px 80px" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", width: "100%" }}>
        <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 80, alignItems: "center" }}>

          {/* Texte */}
          <div>
            <div className="fade-up visible" style={{ marginBottom: 20 }}>
              <span className="section-label">Développeur · Étudiant</span>
            </div>
            <h1 className="fade-up visible d1" style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "clamp(36px, 5vw, 62px)",
              fontWeight: 800, lineHeight: 1.06,
              letterSpacing: "-0.035em", marginBottom: 24,
            }}>
              Salut, moi c'est<br />
              <span style={{ color: "var(--accent)" }}>Berkan Akin.</span>
            </h1>
            <p className="fade-up visible d2" style={{
              fontSize: 17, color: "var(--muted)", lineHeight: 1.8,
              marginBottom: 36, maxWidth: 480, fontWeight: 300,
            }}>
              Étudiant en <strong style={{ color: "var(--text)", fontWeight: 500 }}>BUT Informatique à l'IUT Annecy</strong>, je combine Product Ownership, développement fullstack et création de SaaS. Fondateur de <a href="https://kulpryt.com" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 500 }}>Kulpryt</a> — un studio indépendant dédié à des outils concrets.
            </p>

            <div className="fade-up visible d3" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 40 }}>
              <a href="/cv-berkan-akin.pdf" download className="btn-primary">
                <Download size={14} /> Télécharger mon CV
              </a>
              <a href="https://www.linkedin.com/in/berkan-akin" target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <Linkedin size={14} /> LinkedIn
              </a>
              <a href="https://github.com/Urashy" target="_blank" rel="noopener noreferrer" className="btn-ghost">
                <Github size={14} /> GitHub
              </a>
            </div>

            {/* Stack pills */}
            <div className="fade-up visible d3" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[
                { label: "Next.js / React", icon: <Code2 size={12} /> },
                { label: "TypeScript", icon: <Terminal size={12} /> },
                { label: ".NET 8 / C#", icon: <Code2 size={12} /> },
                { label: "Laravel / PHP", icon: <Terminal size={12} /> },
                { label: "Python (IA)", icon: <Code2 size={12} /> },
                { label: "Docker / Azure", icon: <Layers size={12} /> },
              ].map(s => (
                <span key={s.label} className="skill-pill">
                  {s.icon} {s.label}
                </span>
              ))}
            </div>
          </div>

          {/* Card identité */}
          <div className="fade-up visible d2" style={{
            background: "var(--surface)",
            border: "1.5px solid var(--border)",
            borderRadius: 20, padding: "32px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: 3,
              background: "linear-gradient(90deg, var(--accent), transparent)",
            }} />
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              background: "var(--accent)", display: "flex",
              alignItems: "center", justifyContent: "center",
              marginBottom: 20, fontSize: 24,
            }}>
              🧑‍💻
            </div>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              En ce moment
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { emoji: "🎓", text: "BUT Informatique — IUT Annecy (USMB)" },
                { emoji: "💼", text: "Stage ERP en cours (Jan. 2026)" },
                { emoji: "🛠️", text: "Fondateur de Kulpryt" },
                { emoji: "🎙️", text: "Développe Vo1ce (SaaS CRM vocal)" },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 16 }}>{item.emoji}</span>
                  <span style={{ fontSize: 14, color: "var(--muted)" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ── EXPÉRIENCES ── */
function Experiences() {
  const [ref, visible] = useFadeIn();
  const items = [
    {
      period: "Jan. 2026 — actuel",
      type: "Stage",
      typeBg: "var(--accent-bg)", typeColor: "var(--accent)",
      title: "Stagiaire Développeur ERP",
      company: "Stage 12 semaines",
      desc: "Développement professionnel sur un projet ERP en environnement de production réel.",
      tags: ["Développement Pro", "ERP"],
    },
    {
      period: "Avr. — Juil. 2025",
      type: "Stage",
      typeBg: "var(--accent-bg)", typeColor: "var(--accent)",
      title: "Stagiaire DevOps / Cybersécurité",
      company: "SILSEF, Archamps",
      desc: "Administration système, maintenance réseau, migration NAS, sécurisation infrastructure et automatisation de tâches administratives.",
      tags: ["DevOps", "Cybersécurité", "Réseau", "Administration Sys."],
    },
    {
      period: "2026 — actuel",
      type: "Perso",
      typeBg: "#EEF2FF", typeColor: "#4338CA",
      title: "Fondateur",
      company: "Kulpryt",
      desc: "Création d'un studio logiciel indépendant en parallèle des études. Développement de Vo1ce (SaaS CRM vocal) et de la landing page Kulpryt — de la conception au déploiement sur Vercel.",
      tags: ["Next.js", "TypeScript", "Nodemailer", "Google Sheets API"],
    },
    {
      period: "Oct. 2025",
      type: "Projet",
      typeBg: "#EEF2FF", typeColor: "#4338CA",
      title: "Product Owner",
      company: "AutoPulse — IUT Annecy",
      desc: "Pilotage d'une plateforme de vente automobile avec estimation IA. Backlog, User Stories, MVP, déploiement Azure. Architecture microservices : API .NET 8 + API Python FastAPI.",
      tags: [".NET 8", "Python / FastAPI", "Azure", "Docker", "Scrum"],
    },
    {
      period: "Fin 2024",
      type: "Projet",
      typeBg: "#EEF2FF", typeColor: "#4338CA",
      title: "Développeur Fullstack",
      company: "Uber Clone — IUT Annecy",
      desc: "Clone des services Uber (VTC, livraison, vélos). Architecture MVC avec Laravel 10, interfaces Vue.js, gestion avancée des rôles et facturation PDF automatisée.",
      tags: ["Laravel 10", "Vue.js", "MySQL", "MVC", "PHP"],
    },
    {
      period: "Août 2024",
      type: "Job",
      typeBg: "#FEF3C7", typeColor: "#92400E",
      title: "Facteur (Intérim)",
      company: "La Poste, Annemasse",
      desc: "Gestion de la réception, du tri et de la distribution du courrier et des colis. Interactions directes avec les clients.",
      tags: ["Logistique", "Autonomie"],
    },
  ];

  return (
    <section id="experiences" style={{ padding: "80px 24px 100px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div ref={ref} className={`fade-up${visible ? " visible" : ""}`}>
          <span className="section-label" style={{ display: "block", marginBottom: 12 }}>Expériences</span>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 40 }}>
            Ce que j'ai fait
          </h2>
          <div>
            {items.map((item, i) => (
              <div key={i} className="exp-item">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>{item.period}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, width: "fit-content", background: item.typeBg, color: item.typeColor }}>{item.type}</span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700 }}>{item.title}</h3>
                    <span style={{ fontSize: 14, color: "var(--accent)", fontWeight: 500 }}>@ {item.company}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 12, fontWeight: 300 }}>{item.desc}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {item.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 12, color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 10px" }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FORMATION ── */
function Formation() {
  const [ref, visible] = useFadeIn();
  const items = [
    {
      period: "2023 — 2026",
      type: "Diplôme",
      typeBg: "var(--border)", typeColor: "var(--muted)",
      title: "BUT Informatique",
      company: "IUT Annecy — USMB",
      desc: "Formation en 3 ans couvrant développement logiciel, bases de données, réseaux, gestion de projet Agile et algorithmique. Parcours orienté développement fullstack et Product Ownership.",
      tags: ["Développement", "BDD", "Réseaux", "Gestion de projet", "Algo"],
    },
    {
      period: "2019 — 2023",
      type: "Diplôme",
      typeBg: "var(--border)", typeColor: "var(--muted)",
      title: "Baccalauréat STI2D — Mention AB",
      company: "Lycée Jean Monnet, Annemasse",
      desc: "Spécialité Sciences et Technologies de l'Industrie et du Développement Durable. Projet de fin d'année : distributeur de bonbons Bluetooth piloté par Arduino et site web de contrôle.",
      tags: ["C++", "Arduino", "Électronique", "STI2D"],
    },
  ];

  return (
    <section id="formation" style={{ padding: "80px 24px 100px", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div ref={ref} className={`fade-up${visible ? " visible" : ""}`}>
          <span className="section-label" style={{ display: "block", marginBottom: 12 }}>Formation</span>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 40 }}>
            Mon parcours académique
          </h2>
          <div>
            {items.map((item, i) => (
              <div key={i} className="exp-item">
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 400 }}>{item.period}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "2px 8px", borderRadius: 20, width: "fit-content", background: item.typeBg, color: item.typeColor }}>{item.type}</span>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                    <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700 }}>{item.title}</h3>
                    <span style={{ fontSize: 14, color: "var(--accent)", fontWeight: 500 }}>@ {item.company}</span>
                  </div>
                  <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 12, fontWeight: 300 }}>{item.desc}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {item.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 12, color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "2px 10px" }}>{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}


/* ── PROJETS ── */
function Projects() {
  const [ref, visible] = useFadeIn();
  const projects = [
    {
      name: "AutoPulse",
      emoji: "🚗",
      desc: "Plateforme de vente automobile avec estimation IA. Architecture microservices : API .NET 8 + API Python pour la cote intelligente. Déployé sur Azure.",
      tags: [".NET 8", "Python / IA", "Azure", "Docker"],
      github: "https://github.com/Urashy/autopulse",
      status: "En ligne",
      statusColor: "var(--accent-bg)",
      statusText: "var(--accent)",
    },
    {
      name: "Uber Clone",
      emoji: "🚕",
      desc: "Clone des services Uber (VTC, livraison, vélos). Gestion avancée des rôles, facturation PDF, tableaux de bord dynamiques. Architecture MVC Laravel 10.",
      tags: ["Laravel 10", "Vue.js", "MySQL", "MVC"],
      github: "https://github.com/sftss/Uber",
      status: "En ligne",
      statusColor: "var(--accent-bg)",
      statusText: "var(--accent)",
    },
    {
      name: "Vo1ce",
      emoji: "🎙️",
      desc: "SaaS qui remplit automatiquement ton CRM (HubSpot, Salesforce) à partir d'un mémo vocal. Inscriptions via liste d'attente Google Sheets.",
      tags: ["Next.js", "AI", "SaaS", "Google Sheets"],
      link: "https://vo1ce.kulpryt.com",
      github: "",
      status: "En développement",
      statusColor: "#FEF3C7",
      statusText: "#92400E",
    },
    {
      name: "Distributeur IoT",
      emoji: "⚙️",
      desc: "Distributeur de bonbons piloté par Bluetooth depuis un smartphone. Programmation Arduino C++, conception 3D et site web de contrôle.",
      tags: ["C++", "Arduino", "Bluetooth", "IoT"],
      link: "",
      github: "",
      status: "Projet BAC",
      statusColor: "var(--border)",
      statusText: "var(--muted)",
    },
    {
      name: "Kulpryt",
      emoji: "🏗️",
      desc: "Landing page de mon studio logiciel. Design minimaliste, formulaire de contact Infomaniak SMTP, liste d'attente Vo1ce via Google Sheets.",
      tags: ["Next.js", "TypeScript", "Nodemailer"],
      link: "https://kulpryt.com",
      github: "",
      status: "En ligne",
      statusColor: "var(--accent-bg)",
      statusText: "var(--accent)",
    },
    {
      name: "Pong",
      emoji: "🏓",
      desc: "Pong multijoueur local développé en Processing (Java) pour explorer la POO. Converti en p5.js pour tourner dans le navigateur.",
      tags: ["Processing", "Java", "OOP", "p5.js"],
      link: "#pong",
      github: "",
      status: "Jouable ici",
      statusColor: "var(--border)",
      statusText: "var(--muted)",
    },
  ];

  return (
    <section id="projets" style={{ padding: "80px 24px 100px", background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div ref={ref} className={`fade-up${visible ? " visible" : ""}`}>
          <span className="section-label" style={{ display: "block", marginBottom: 12 }}>Projets</span>
          <h2 style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "clamp(22px, 3vw, 34px)",
            fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 40,
          }}>
            Ce que j'ai construit
          </h2>

          <div className="projects-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 18 }}>
            {projects.map((p, i) => (
              <div key={i} className="project-card">
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 3,
                  background: "linear-gradient(90deg, var(--accent), transparent)",
                }} />
                <div style={{ fontSize: 28, marginBottom: 16 }}>{p.emoji}</div>
                <div style={{ marginBottom: 12 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 500, letterSpacing: "0.04em",
                    textTransform: "uppercase", padding: "3px 10px",
                    borderRadius: 20, background: p.statusColor, color: p.statusText,
                  }}>{p.status}</span>
                </div>
                <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 8 }}>
                  {p.name}
                </h3>
                <p style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.7, marginBottom: 20, fontWeight: 300 }}>
                  {p.desc}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                  {p.tags.map(tag => (
                    <span key={tag} style={{
                      fontSize: 12, color: "var(--muted)",
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6, padding: "2px 10px",
                    }}>{tag}</span>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {p.link && p.link !== "" && (
                    <a href={p.link} target={p.link.startsWith("http") ? "_blank" : "_self"} rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 12, padding: "7px 14px" }}>
                      Voir <ChevronRight size={12} />
                    </a>
                  )}
                  {p.github && p.github !== "" && (
                    <a href={p.github} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ fontSize: 12, padding: "7px 14px" }}>
                      GitHub <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── PONG (p5.js) ── */
function PongGame() {
  const [ref, visible] = useFadeIn();
  const containerRef = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);
  const p5InstanceRef = useRef<unknown>(null);

  const startGame = () => {
    setStarted(true);
    setTimeout(() => initP5(), 50);
  };

  const initP5 = () => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.9.0/p5.min.js";
    script.onload = () => {

      // @ts-expect-error p5 loaded globally
      p5InstanceRef.current = new window.p5((p: any) => {

        // --- Ball class (traduction exacte Processing -> p5.js) ---
        class Ball {
          pos: any; vel: any; r: number;
          constructor(x: number, y: number) {
            this.pos = p.createVector(x, y);
            const vx = p.random(1) < 0.5 ? -3 : 3;
            const vy = p.random(-2, 2);
            this.vel = p.createVector(vx, vy);
            this.r = 10;
          }
          display() {
            p.circle(this.pos.x, this.pos.y, this.r);
          }
          update() {
            this.pos.add(this.vel);
            if (this.pos.y >= p.height - (this.r / 2) || this.pos.y <= 0 + (this.r / 2)) {
              this.vel.y = -1 * this.vel.y;
            }
          }
          checkCollisions(t: any) {
            const topTab    = t.pos.y - t.h / 2;
            const bottomTab = t.pos.y + t.h / 2;
            const leftTab   = t.pos.x - t.w / 2;
            const rightTab  = t.pos.x + t.w / 2;

            if (
              this.pos.x + this.r / 2 > leftTab &&
              this.pos.x - this.r / 2 < rightTab &&
              this.pos.y + this.r / 2 > topTab &&
              this.pos.y - this.r / 2 < bottomTab
            ) {
              if (t.pos.x < p.width / 2) {
                this.pos.x = t.pos.x + t.w / 2 + this.r / 2;
                this.vel.x *= -1;
                this.vel.y += t.vel.y * 0.4;
              } else {
                this.pos.x = t.pos.x - t.w / 2 - this.r / 2;
                this.vel.x *= -1;
                this.vel.y += t.vel.y * 0.4;
              }
              let maxSpeedY = 8; 
              this.vel.y = p.constrain(this.vel.y, -maxSpeedY, maxSpeedY);
            }
          }
        }

        // --- Tab class (traduction exacte Processing -> p5.js) ---
        class Tab {
          pos: any; vel: any; w: number; h: number;
          upKey: string; downKey: string;
          speed: number; brakeLoss: number;
          upPressed: boolean; downPressed: boolean;

          constructor(x: number, y: number, upKey: string, downKey: string) {
            this.pos = p.createVector(x, y);
            this.vel = p.createVector(0, 0);
            this.speed = 4;
            this.brakeLoss = 0.1;
            this.upKey = upKey;
            this.downKey = downKey;
            this.w = 18;
            this.h = 70;
            this.upPressed = false;
            this.downPressed = false;
          }

          update() {
            if (this.pos.y + this.h / 2 > p.height) {
              this.pos.y = p.height - this.h / 2;
              if (!this.downPressed) this.vel.mult(-1);
            }
            if (this.pos.y - this.h / 2 < 0) {
              this.pos.y = this.h / 2;
              if (!this.upPressed) this.vel.mult(-1);
            }
            this.pos.add(this.vel);
            if (this.upPressed === false && this.downPressed === false) {
              this.vel.mult(1 - this.brakeLoss);
            }
          }

          display() {
            p.line(this.pos.x - this.w/2, this.pos.y - this.h/2, this.pos.x + this.w/2, this.pos.y - this.h/2);
            p.line(this.pos.x + this.w/2, this.pos.y - this.h/2, this.pos.x + this.w/2, this.pos.y + this.h/2);
            p.line(this.pos.x + this.w/2, this.pos.y + this.h/2, this.pos.x - this.w/2, this.pos.y + this.h/2);
            p.line(this.pos.x - this.w/2, this.pos.y + this.h/2, this.pos.x - this.w/2, this.pos.y - this.h/2);
          }

          mooveUp() {
            this.upPressed = true;
            this.vel.y = -this.speed;
          }

          mooveDown() {
            this.downPressed = true;
            this.vel.y = this.speed;
          }
        }

        // --- Variables globales exactes ---
        const mesTabs: any[] = [];
        let ball: Ball;
        let j1pt = 0, j2pt = 0;
        let isPaused = false;
        let lastWinner = 0;

        function createBall() {
          ball = new Ball(200, 200);
        }

        // --- setup() exact ---
        p.setup = () => {
          p.createCanvas(400, 400).parent(containerRef.current!);
          mesTabs.push(new Tab(50,  200, "z", "s"));
          mesTabs.push(new Tab(350, 200, "p", "m"));
          ball = new Ball(200, 200);
        };

        // --- draw() exact ---
        p.draw = () => {
          p.background(200);

          for (const t of mesTabs) {
            t.display();
          }
          ball.display();

          if (isPaused) {
            p.textSize(20);
            p.fill(10, 10, 255);
            p.text("Joueur 1 :", 10, 20);
            p.text(j1pt, 100, 20);
            p.text("Joueur 2 :", 280, 20);
            p.text(j2pt, 370, 20);
            p.text("Balle sortie, point accordé au joueur " + lastWinner, 60, 300);
          } else {
            if (!isPaused) {
              ball.update();
              for (const t of mesTabs) {
                ball.checkCollisions(t);
                t.update();
              }
              if (ball.pos.x > 400) {
                j1pt++;
                lastWinner = 1;
                isPaused = true;
              }
              if (ball.pos.x < 0) {
                j2pt++;
                lastWinner = 2;
                isPaused = true;
              }
            }
          }
        };

        // --- keyPressed() exact ---
        p.keyPressed = () => {
          for (const t of mesTabs) {
            if (p.key === t.downKey) {
              t.mooveDown();
            } else if (p.key === t.upKey) {
              t.mooveUp();
            }
          }
          if (p.key === " " && isPaused) {
            createBall();
            isPaused = false;
          }
          return false;
        };

        // --- keyReleased() exact ---
        p.keyReleased = () => {
          for (const t of mesTabs) {
            if (p.key === t.downKey) t.downPressed = false;
            if (p.key === t.upKey)   t.upPressed   = false;
          }
          return false;
        };

      }, containerRef.current!);
    };
    document.head.appendChild(script);
  };

  useEffect(() => {
    return () => {
      if (p5InstanceRef.current) {
        (p5InstanceRef.current as any).remove();
      }
    };
  }, []);

  return (
    <section id="pong" style={{ padding: "80px 24px 100px", borderTop: "1px solid var(--border)" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div ref={ref} className={`fade-up${visible ? " visible" : ""}`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "center" }}>

            {/* Texte */}
            <div>
              <span className="section-label" style={{ display: "block", marginBottom: 12 }}>Mini-projet</span>
              <h2 style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: "clamp(22px, 3vw, 36px)",
                fontWeight: 700, letterSpacing: "-0.025em", marginBottom: 16,
              }}>
                Pong — Processing → p5.js
              </h2>
              <p style={{ fontSize: 15, color: "var(--muted)", lineHeight: 1.8, marginBottom: 24, fontWeight: 300 }}>
                Un Pong multijoueur local développé en <strong style={{ color: "var(--text)", fontWeight: 500 }}>Processing (Java)</strong> pour explorer la programmation orientée objet. Converti en <strong style={{ color: "var(--text)", fontWeight: 500 }}>p5.js</strong> pour tourner directement dans le navigateur.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                {[
                  { label: "Joueur 1", keys: "Z / S" },
                  { label: "Joueur 2", keys: "P / M" },
                  { label: "Lancer / Reprendre", keys: "ESPACE" },
                ].map(k => (
                  <div key={k.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 13, color: "var(--muted)", minWidth: 140 }}>{k.label}</span>
                    <code style={{
                      fontSize: 12, background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6, padding: "3px 10px",
                      fontFamily: "monospace", color: "var(--text)",
                    }}>{k.keys}</code>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["Processing", "Java", "OOP", "p5.js", "Canvas"].map(t => (
                  <span key={t} style={{
                    fontSize: 12, color: "var(--muted)",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 6, padding: "2px 10px",
                  }}>{t}</span>
                ))}
              </div>
            </div>

            {/* Canvas */}
            <div className="pong-wrapper" style={{ 
              minHeight: 400, 
              background: "rgb(200, 200, 200)", 
              border: "none" 
            }}>
              <div ref={containerRef} style={{ 
                width: "100%", 
                height: "100%",
                display: "flex", 
                justifyContent: "center",
                alignItems: "center"
              }} />
              
              {!started && (
                <div className="pong-overlay">
                  <span style={{ fontSize: 32 }}>🏓</span>
                  <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700 }}>
                    Pong — 2 joueurs
                  </h3>
                  <p style={{ fontSize: 13, color: "var(--muted)", textAlign: "center", maxWidth: 200 }}>
                    Clique pour charger le jeu
                  </p>
                  <button className="btn-primary" onClick={startGame}>
                    Jouer
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}

/* ── FOOTER ── */
function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--border)", padding: "28px 24px" }}>
      <div style={{
        maxWidth: 1080, margin: "0 auto",
        display: "flex", justifyContent: "space-between",
        alignItems: "center", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="https://kulpryt.com" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>Kulpryt</a>
          <a href="https://vo1ce.kulpryt.com" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>Vo1ce</a>
          <a href="https://github.com/Urashy" style={{ fontSize: 13, color: "var(--muted)", textDecoration: "none" }}>GitHub</a>
        </div>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>
          © {new Date().getFullYear()} Berkan Akin
        </span>
      </div>
    </footer>
  );
}

/* ── ROOT ── */
export default function BerkanPortfolio() {
  return (
    <>
      <GlobalStyles />
      <Nav />
      <main>
        <Hero />
        <Formation />
        <Experiences />
        <Projects />
        <PongGame />
      </main>
      <Footer />
    </>
  );
}